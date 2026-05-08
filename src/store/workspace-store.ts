import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type { ResponseSchema } from "@/lib/documents/response-schema";

/**
 * Workspace store — governs the 3-column chat workspace:
 *   • which file is showing in the right-side canvas
 *   • whether the canvas is visible or collapsed to 0
 *   • whether the far-right files sidebar is expanded (320px) or
 *     collapsed to a 64px icon strip
 *   • client-side cache of signed URLs for previews
 *
 * Phase 2: files are fetched from Supabase via `/api/files/list`. The
 * previous hardcoded mock array is gone — if the API returns 503
 * because the migration hasn't run yet, `fetchError` is populated and
 * components can render an appropriate prompt.
 */

export type WorkspaceFileFormat = "docx" | "pdf" | "xlsx" | "pptx" | "png" | "jpg" | "txt";
export type WorkspaceFileKind = "generated" | "uploaded";

export interface WorkspaceFile {
  id: string;
  fileName: string;
  format: WorkspaceFileFormat;
  kind: WorkspaceFileKind;
  /** ISO-8601 timestamp */
  createdAt: string;
  /** Size in bytes for display */
  sizeBytes: number;
  /** Optional doc-type tag for generated files (termination-notice, etc.) */
  docType?: string;
  /** Supabase Storage path — `<user_id>/<file_uuid>.<ext>` */
  storagePath?: string;
  /** FK to conversations row when applicable */
  conversationId?: string | null;
  /** FK to the AI message that triggered generation */
  sourceMessageId?: string | null;
  /** llp-response-schema draft that produced this file. Present for
   *  Phase-2 emitter outputs; enables canvas re-edit from the sidebar
   *  kebab "Edit" action. Absent for legacy / uploaded files. */
  draftJson?: ResponseSchema;
}

// ---------------------------------------------------------------------
//  Background filegen jobs — doc-generation can run for 60-210s; users
//  may minimize the builder modal and see pulse badges in FilesSidebar.
// ---------------------------------------------------------------------

/** Payload we POST to /api/chat/filegen. Shape matches the endpoint
 *  contract. Kept here so the store owns the fetch lifecycle. */
export interface FilegenPayload {
  docType: string;
  outputFormat: "docx" | "pdf" | "pptx" | "xlsx";
  citedSections: Array<{
    section: string;
    document: string;
    verbatim: string;
  }>;
  userInputs: Record<string, string>;
  perspective: string;
  language: "en" | "bn";
  chatContext: string;
  /** Freeform skill-routing hint. Populated only when docType === "custom". */
  userInstruction?: string;
}

export interface GeneratingJob {
  id: string;
  docType: string;
  docTypeLabel: string;
  /** Kind of background job. Filegen produces a downloadable file;
   *  verify runs citation verification and just reports a verdict.
   *  Undefined is treated as "filegen" for backwards compatibility. */
  kind?: "filegen" | "verify";
  /** Filegen output format. Absent for verify jobs. */
  format?: "docx" | "pdf" | "pptx" | "xlsx";
  /**
   * State machine (extended in DB-07c):
   *   queued → running → (filegen classic) → done | error
   *   queued → running → (filegen custom)  → draft_ready
   *                                         → editing
   *                                         → emitting → editing | error
   * `editing` is the canvas surface (DB-07b/c). `emitting` is the
   * Phase-2 emit round-trip; on success the job stays in `editing`
   * so the user can fire additional formats from the same draft
   * (SPEC-01 §10 multi-format from one draft). `done` is reserved
   * for the legacy filegen-classic pipeline that produces a single
   * Supabase-uploaded file.
   */
  state:
    | "queued"
    | "running"
    | "draft_ready"
    | "editing"
    | "emitting"
    | "done"
    | "error";
  startedAt: number;
  completedAt?: number;
  /** Matches workspace-store.files[i].id once the job succeeds. */
  fileId?: string;
  /** Verify-only — overall verdict string written on completion. */
  verdict?: string;
  /** Verify-only — assistant message the report is attached to. Lets
   *  the badge click jump focus back to the right bubble. */
  messageId?: string;
  error?: string;
  /** The exact payload we sent — kept so the badge can re-open the
   *  builder modal on click without losing context. Absent for verify. */
  payload?: FilegenPayload;
  /** Custom-path draft JSON returned by llp-chat-filegen-draft agent.
   *  Populated alongside state === "draft_ready". DB-07 canvas will
   *  edit this in-place and send it to the Phase-2 emit endpoint. */
  draft?: ResponseSchema;
  /** DB-07c — last canvas-edited version of `draft`. Auto-saved to
   *  localStorage on a debounced timer so a refresh during editing
   *  does not destroy the user's work. Cleared on Regenerate. */
  editedJson?: ResponseSchema;
  /** DB-07c — epoch ms of last `saveEditedJson` write. Powers the
   *  "Saved 2s ago" indicator in the canvas footer. */
  lastAutoSaveAt?: number;
  /** DB-07c — record of every Phase-2 emit fired from this draft.
   *  Multi-format emit appends one entry per click; the canvas
   *  surfaces them as a download list. Blob URLs are session-scoped
   *  (revokeObjectURL on canvas unmount). */
  emittedFiles?: Array<{
    format: "docx" | "pdf" | "pptx" | "xlsx";
    fileName: string;
    blobUrl?: string;
    sizeBytes: number;
    durationMs: number;
    warnings: string[];
    emittedAt: number;
  }>;
}

/**
 * Internal cache entry for signed URLs. We re-issue once we're within
 * the safety window so the URL doesn't expire mid-render.
 */
interface SignedUrlCacheEntry {
  url: string;
  /** Epoch ms when we must re-sign (50 min from creation). */
  safeUntil: number;
}

export interface OriginRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface WorkspaceState {
  files: WorkspaceFile[];
  activeFileId: string | null;
  canvasCollapsed: boolean;
  /** Modal canvas maximized to full viewport (true) vs. default 96vw/92vh centered box (false). */
  canvasMaximized: boolean;
  /**
   * Viewport rect of the UI element that triggered the canvas open (file row,
   * job badge). Used by CanvasModal to anchor the open/close zoom animation
   * so the modal appears to fly out of that element and retract back into it.
   */
  activeFileOriginRect: OriginRect | null;
  filesSidebarExpanded: boolean;

  /** Mobile-only: whether the docs/files drawer is open. */
  mobileDocsOpen: boolean;

  /** Has the list been hydrated from the server at least once? */
  filesHydrated: boolean;
  /** True while the list fetch is in flight. */
  filesLoading: boolean;
  /** Last fetch error (null if OK). Expected values: "files_table_missing" etc. */
  fetchError: string | null;

  /** Cache of signed URLs keyed by file id. */
  signedUrlCache: Record<string, SignedUrlCacheEntry>;

  /** Background filegen jobs — running / done / error, newest first. */
  generatingJobs: GeneratingJob[];
  /** When a user clicks a running-badge we flip this to the job id; the
   *  PremiumDocButton observes it and re-opens the builder modal. */
  reopenBuilderForJob: string | null;
  /** Active canvas dialog target. When non-null a modal canvas is mounted
   *  over /chat showing this job's draft. Null = canvas closed. */
  canvasJobId: string | null;

  /** File IDs the user has opened at least once. Persisted so the NEW
   *  badge survives a reload. A file is "new" iff it's generated *and*
   *  its id is not in this set. */
  seenFileIds: string[];
  /** Mark a file as seen — idempotent. */
  markFileSeen: (id: string) => void;

  setMobileDocsOpen: (open: boolean) => void;

  /**
   * Activate a file for preview. Optional `originRect` (viewport coords of
   * the clicked element) anchors the open/close animation so the modal
   * flies out of and retracts back into that spot. If omitted, the previous
   * origin is retained, so the exit animation still matches the entrance
   * for a file first opened from the sidebar.
   */
  setActiveFile: (id: string | null, originRect?: OriginRect | null) => void;
  clearActiveFile: () => void;
  toggleCanvas: () => void;
  setCanvasCollapsed: (collapsed: boolean) => void;
  toggleCanvasMaximized: () => void;
  setCanvasMaximized: (maximized: boolean) => void;
  toggleFilesSidebar: () => void;
  setFilesSidebarExpanded: (expanded: boolean) => void;
  setFiles: (files: WorkspaceFile[]) => void;
  /** Prepend a new file (use after filegen or upload completes). */
  addFile: (file: WorkspaceFile) => void;
  /** Optimistic removal — also calls DELETE API. */
  removeFile: (id: string) => Promise<void>;
  /** Fetch the user's files from /api/files/list (idempotent, safe to call on mount). */
  fetchFiles: (opts?: { force?: boolean }) => Promise<void>;
  /**
   * Resolve a signed URL for the given file, using the cache when
   * possible. Re-signs automatically when the cached URL is within 10
   * minutes of expiry.
   */
  getSignedUrl: (fileId: string) => Promise<string>;
  /** Drop a cached URL (e.g. after a 403 surfaces from Supabase). */
  invalidateSignedUrl: (fileId: string) => void;

  /**
   * Fire the filegen fetch in the background — returns the job id
   * synchronously. Caller subscribes to generatingJobs to follow state.
   * Closing the builder modal does NOT cancel the fetch.
   */
  launchFilegen: (
    payload: FilegenPayload,
    docTypeLabel: string,
  ) => string;
  /** Register a verify-citations job. Returns the job id so the caller
   *  can later flip it to done/error. The job appears in the sidebar
   *  alongside filegen jobs so users see it running even after they
   *  scroll away from the assistant message. Callers may pre-allocate
   *  the id (UUID) so it shares identity with the server-side
   *  chat_jobs row and survives a page reload. */
  registerVerifyJob: (args: {
    messageId: string;
    docTypeLabel: string;
    id?: string;
  }) => string;
  /** Flip a verify job to done + attach the overall verdict. */
  markVerifyDone: (id: string, verdict: string | undefined) => void;
  /** Flip a verify job to error + attach the message. */
  markVerifyError: (id: string, errorMsg: string) => void;
  /** Replace the generatingJobs list with server-hydrated state on
   *  mount, de-duplicating against any in-memory entries (server wins
   *  on id collision — running rows may have advanced since the
   *  browser last saw them). */
  hydrateJobs: (rows: GeneratingJob[]) => void;
  /** Merge a single server row into the in-memory list (upsert by id). */
  reconcileJob: (row: GeneratingJob) => void;
  /** Manually remove a job badge from the strip. File itself stays. */
  dismissJob: (id: string) => void;
  /** Signal the PremiumDocButton to re-open the builder for this job. */
  requestReopenBuilder: (jobId: string | null) => void;

  // ── DB-07c canvas + Phase-2 emit transitions ──────────────────────
  /** draft_ready → editing. Idempotent — safe to call when canvas
   *  re-mounts on the same job. */
  startEditing: (jobId: string) => void;
  /** Persist the canvas-edited JSON. Updates `lastAutoSaveAt`. The
   *  caller (canvas) debounces, so this fires every ~800ms while
   *  the user is typing. */
  saveEditedJson: (jobId: string, edited: ResponseSchema) => void;
  /** editing → emitting. Used to gate the Approve & Generate button
   *  so concurrent clicks don't double-fire. */
  startEmit: (jobId: string) => void;
  /** Append a successful emit to `emittedFiles` and return state to
   *  `editing` so the canvas stays open for additional formats. */
  recordEmit: (
    jobId: string,
    file: {
      format: "docx" | "pdf" | "pptx" | "xlsx";
      fileName: string;
      blobUrl?: string;
      sizeBytes: number;
      durationMs: number;
      warnings: string[];
    },
  ) => void;
  /** emitting → editing + populate `error` so the canvas can surface
   *  a retry banner. */
  failEmit: (jobId: string, error: string) => void;
  /** Discard editedJson + emittedFiles, transition editing → running,
   *  re-POST to /api/chat/filegen with the original `payload`. The
   *  canvas observes state transitions and renders the skeleton. */
  regenerateJob: (jobId: string) => void;
  /** Open the canvas modal on a specific job. Sets canvasJobId and
   *  transitions draft_ready → editing. */
  openCanvas: (jobId: string) => void;
  /** Close the canvas modal. Preserves the job + editedJson so it can
   *  be reopened from the sidebar. */
  closeCanvas: () => void;
  /** Rehydrate a stored file into a synthetic editing job and open the
   *  canvas. Requires `file.draftJson` to be present — returns false
   *  otherwise. Used by the files-sidebar "Edit" kebab action. */
  openFileForEdit: (fileId: string) => boolean;
}

const SIGNED_URL_SAFE_MS = 50 * 60 * 1000; // 50 minutes

/** Narrow + coerce an arbitrary payload into a WorkspaceFile. */
function normalizeFile(raw: unknown): WorkspaceFile | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  const id = typeof o.id === "string" ? o.id : null;
  const fileName = typeof o.fileName === "string" ? o.fileName : null;
  const format =
    typeof o.format === "string" ? (o.format as WorkspaceFileFormat) : null;
  const kind = o.kind === "uploaded" ? "uploaded" : "generated";
  const createdAt =
    typeof o.createdAt === "string"
      ? o.createdAt
      : new Date().toISOString();
  const sizeBytes = typeof o.sizeBytes === "number" ? o.sizeBytes : 0;
  if (!id || !fileName || !format) return null;
  return {
    id,
    fileName,
    format,
    kind,
    createdAt,
    sizeBytes,
    docType: typeof o.docType === "string" ? o.docType : undefined,
    storagePath:
      typeof o.storagePath === "string" ? o.storagePath : undefined,
    conversationId:
      typeof o.conversationId === "string" ? o.conversationId : null,
    sourceMessageId:
      typeof o.sourceMessageId === "string" ? o.sourceMessageId : null,
    draftJson:
      o.draftJson && typeof o.draftJson === "object"
        ? (o.draftJson as ResponseSchema)
        : undefined,
  };
}

export const useWorkspaceStore = create<WorkspaceState>()(
  persist(
    (set, get) => ({
  files: [],
  activeFileId: null,
  // Canvas is hidden on page load and only reveals once a file is
  // activated via `setActiveFile(id)`. Clearing the active file
  // (X button on the canvas header) collapses it again. Users can
  // still manually toggle via `toggleCanvas()` in both directions.
  canvasCollapsed: true,
  canvasMaximized: false,
  activeFileOriginRect: null,
  filesSidebarExpanded: false,
  mobileDocsOpen: false,
  filesHydrated: false,
  filesLoading: false,
  fetchError: null,
  signedUrlCache: {},
  generatingJobs: [],
  reopenBuilderForJob: null,
  canvasJobId: null,
  seenFileIds: [],

  markFileSeen: (id) =>
    set((s) =>
      s.seenFileIds.includes(id)
        ? s
        : { seenFileIds: [...s.seenFileIds, id] },
    ),

  setMobileDocsOpen: (open) => set({ mobileDocsOpen: open }),

  setActiveFile: (id, originRect) =>
    set((s) => ({
      activeFileId: id,
      // Auto-reveal canvas whenever a file is activated; clearing (null)
      // re-collapses it. Manual toggleCanvas() still works afterwards.
      canvasCollapsed: id === null,
      // Only overwrite the origin when the caller supplied one. Preserving
      // the previous rect on null lets the exit animation trail back to the
      // same spot the modal flew out of.
      activeFileOriginRect:
        originRect === undefined ? s.activeFileOriginRect : originRect,
    })),
  clearActiveFile: () => set({ activeFileId: null, canvasCollapsed: true, canvasMaximized: false }),
  toggleCanvas: () => set((s) => ({ canvasCollapsed: !s.canvasCollapsed })),
  setCanvasCollapsed: (collapsed) => set({ canvasCollapsed: collapsed }),
  toggleCanvasMaximized: () => set((s) => ({ canvasMaximized: !s.canvasMaximized })),
  setCanvasMaximized: (maximized) => set({ canvasMaximized: maximized }),
  toggleFilesSidebar: () =>
    set((s) => ({ filesSidebarExpanded: !s.filesSidebarExpanded })),
  setFilesSidebarExpanded: (expanded) =>
    set({ filesSidebarExpanded: expanded }),
  setFiles: (files) => set({ files }),

  addFile: (file) =>
    set((s) => {
      // Deduplicate in case the caller wires a double-add.
      const existing = s.files.findIndex((f) => f.id === file.id);
      if (existing !== -1) {
        const next = [...s.files];
        next[existing] = file;
        return { files: next };
      }
      return { files: [file, ...s.files] };
    }),

  removeFile: async (id) => {
    // Optimistic removal + signed-URL cache purge
    const prev = get().files;
    set((s) => {
      const { [id]: _discard, ...rest } = s.signedUrlCache;
      void _discard;
      const wasActive = s.activeFileId === id;
      return {
        files: s.files.filter((f) => f.id !== id),
        signedUrlCache: rest,
        activeFileId: wasActive ? null : s.activeFileId,
        // If we just removed the active file, collapse the canvas to
        // match the setActiveFile(null) semantics.
        canvasCollapsed: wasActive ? true : s.canvasCollapsed,
      };
    });
    try {
      const res = await fetch(`/api/files/${encodeURIComponent(id)}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        // Roll back on failure
        set({ files: prev });
        throw new Error(`DELETE /api/files/${id} failed: ${res.status}`);
      }
    } catch (e) {
      // Roll back on network error too
      set({ files: prev });
      throw e;
    }
  },

  fetchFiles: async (opts) => {
    const state = get();
    if (state.filesLoading) return;
    if (state.filesHydrated && !opts?.force) return;

    set({ filesLoading: true, fetchError: null });
    try {
      const res = await fetch("/api/files/list", { credentials: "include" });
      if (!res.ok) {
        if (res.status === 401) {
          // Not signed in — leave files empty, don't surface as an error.
          set({
            files: [],
            filesHydrated: true,
            filesLoading: false,
            fetchError: null,
          });
          return;
        }
        const body = await res
          .json()
          .catch(() => ({ error: `HTTP ${res.status}` }));
        set({
          filesLoading: false,
          filesHydrated: true,
          fetchError:
            typeof body?.error === "string" ? body.error : `HTTP ${res.status}`,
        });
        return;
      }
      const body = (await res.json()) as { files?: unknown };
      const rawList = Array.isArray(body.files) ? body.files : [];
      const files = rawList
        .map(normalizeFile)
        .filter((f): f is WorkspaceFile => f !== null);
      set({
        files,
        filesHydrated: true,
        filesLoading: false,
        fetchError: null,
      });
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      set({
        filesLoading: false,
        filesHydrated: true,
        fetchError: msg.slice(0, 200),
      });
    }
  },

  getSignedUrl: async (fileId) => {
    const cache = get().signedUrlCache;
    const now = Date.now();
    const hit = cache[fileId];
    if (hit && hit.safeUntil > now) {
      return hit.url;
    }

    const res = await fetch(
      `/api/files/signed-url/${encodeURIComponent(fileId)}`,
      { credentials: "include" }
    );
    if (!res.ok) {
      const body = await res
        .json()
        .catch(() => ({ error: `HTTP ${res.status}` }));
      throw new Error(
        typeof body?.message === "string"
          ? body.message
          : typeof body?.error === "string"
            ? body.error
            : `signed-url failed: ${res.status}`
      );
    }
    const body = (await res.json()) as { url?: string; expiresAt?: string };
    if (!body.url) throw new Error("signed-url: missing url in response");

    set((s) => ({
      signedUrlCache: {
        ...s.signedUrlCache,
        [fileId]: {
          url: body.url as string,
          safeUntil: now + SIGNED_URL_SAFE_MS,
        },
      },
    }));
    return body.url;
  },

  invalidateSignedUrl: (fileId) =>
    set((s) => {
      const { [fileId]: _discard, ...rest } = s.signedUrlCache;
      void _discard;
      return { signedUrlCache: rest };
    }),

  launchFilegen: (payload, docTypeLabel) => {
    const id =
      typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
        ? crypto.randomUUID()
        : `job_${Math.random().toString(36).slice(2)}_${Date.now()}`;

    const job: GeneratingJob = {
      id,
      docType: payload.docType,
      docTypeLabel,
      format: payload.outputFormat,
      state: "running",
      startedAt: Date.now(),
      payload,
    };

    set((s) => ({ generatingJobs: [job, ...s.generatingJobs] }));

    // Fire the fetch asynchronously. We don't await — caller gets the
    // job id synchronously and subscribes via generatingJobs.
    (async () => {
      try {
        const res = await fetch("/api/chat/filegen", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          // Passing the client-generated UUID as `job_id` ties the
          // chat_jobs row to this in-memory badge so a page reload
          // mid-run rehydrates the same entry rather than a fresh one.
          body: JSON.stringify({ ...payload, job_id: id }),
        });

        if (!res.ok) {
          let body: { error?: string; message?: string } | null = null;
          try {
            body = (await res.json()) as { error?: string; message?: string };
          } catch {
            /* ignore — fall back to status */
          }
          const message =
            res.status === 403
              ? payload.language === "bn"
                ? "ডকুমেন্ট তৈরির জন্য Mini বা উচ্চতর সাবস্ক্রিপশন প্রয়োজন।"
                : "Document generation requires a Mini or higher subscription."
              : res.status === 401
                ? payload.language === "bn"
                  ? "অনুগ্রহ করে প্রথমে সাইন ইন করুন।"
                  : "Please sign in first."
                : res.status === 503
                  ? body?.message
                    ? body.message
                    : payload.language === "bn"
                      ? "ফাইল জেনারেশন পরিষেবা সাময়িকভাবে বন্ধ।"
                      : "File generation is temporarily offline."
                  : body?.message || body?.error || `Generation failed (HTTP ${res.status}).`;
          set((s) => ({
            generatingJobs: s.generatingJobs.map((j) =>
              j.id === id
                ? {
                    ...j,
                    state: "error" as const,
                    error: message,
                    completedAt: Date.now(),
                  }
                : j,
            ),
          }));
          return;
        }

        const json = (await res.json()) as {
          file?: WorkspaceFile;
          signedUrl?: string | null;
          expiresAt?: string | null;
          draft?: ResponseSchema;
        };

        // DB-06: custom-path response carries a `draft` instead of a
        // `file`. Flip the job into the draft_ready interim — the
        // builder sheet surfaces a placeholder + raw-JSON download.
        // DB-07 canvas will take over from here.
        if (json.draft) {
          set((s) => ({
            generatingJobs: s.generatingJobs.map((j) =>
              j.id === id
                ? {
                    ...j,
                    state: "draft_ready" as const,
                    draft: json.draft,
                    completedAt: Date.now(),
                  }
                : j,
            ),
          }));
          return;
        }

        if (!json.file) {
          set((s) => ({
            generatingJobs: s.generatingJobs.map((j) =>
              j.id === id
                ? {
                    ...j,
                    state: "error" as const,
                    error:
                      payload.language === "bn"
                        ? "অপ্রত্যাশিত উত্তর — ফাইল তথ্য অনুপস্থিত।"
                        : "Unexpected response — file metadata missing.",
                    completedAt: Date.now(),
                  }
                : j,
            ),
          }));
          return;
        }

        // Happy path — register the file + mark job done.
        const fileId = json.file.id;
        set((s) => {
          const existingIdx = s.files.findIndex((f) => f.id === fileId);
          const nextFiles =
            existingIdx !== -1
              ? s.files.map((f, i) => (i === existingIdx ? (json.file as WorkspaceFile) : f))
              : [json.file as WorkspaceFile, ...s.files];
          return {
            files: nextFiles,
            activeFileId: fileId,
            canvasCollapsed: false,
            generatingJobs: s.generatingJobs.map((j) =>
              j.id === id
                ? {
                    ...j,
                    state: "done" as const,
                    fileId,
                    completedAt: Date.now(),
                  }
                : j,
            ),
          };
        });

        // Auto-dismiss the badge 5s after completion — file stays in list.
        setTimeout(() => {
          const current = get().generatingJobs.find((j) => j.id === id);
          if (current && current.state === "done") {
            set((s) => ({
              generatingJobs: s.generatingJobs.filter((j) => j.id !== id),
            }));
          }
        }, 5000);
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        set((s) => ({
          generatingJobs: s.generatingJobs.map((j) =>
            j.id === id
              ? {
                  ...j,
                  state: "error" as const,
                  error: msg,
                  completedAt: Date.now(),
                }
              : j,
          ),
        }));
      }
    })();

    return id;
  },

  registerVerifyJob: ({ messageId, docTypeLabel, id: overrideId }) => {
    const id =
      overrideId ||
      `verify_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const job: GeneratingJob = {
      id,
      kind: "verify",
      docType: "verify_citations",
      docTypeLabel,
      state: "running",
      startedAt: Date.now(),
      messageId,
    };
    set((s) => ({ generatingJobs: [job, ...s.generatingJobs] }));
    return id;
  },

  hydrateJobs: (rows) =>
    set((s) => {
      const byId = new Map<string, GeneratingJob>();
      // Seed with existing in-memory jobs so any badges not yet written
      // to the server (e.g. the row failed to insert) aren't lost.
      for (const j of s.generatingJobs) byId.set(j.id, j);
      // Server rows win on collision — they're authoritative for state.
      for (const r of rows) byId.set(r.id, r);
      const merged = Array.from(byId.values()).sort(
        (a, b) => b.startedAt - a.startedAt,
      );
      return { generatingJobs: merged };
    }),

  reconcileJob: (row) =>
    set((s) => {
      const existing = s.generatingJobs.findIndex((j) => j.id === row.id);
      if (existing === -1) {
        return { generatingJobs: [row, ...s.generatingJobs] };
      }
      const next = [...s.generatingJobs];
      next[existing] = { ...next[existing], ...row };
      return { generatingJobs: next };
    }),

  markVerifyDone: (id, verdict) =>
    set((s) => ({
      generatingJobs: s.generatingJobs.map((j) =>
        j.id === id
          ? { ...j, state: "done", completedAt: Date.now(), verdict }
          : j,
      ),
    })),

  markVerifyError: (id, errorMsg) =>
    set((s) => ({
      generatingJobs: s.generatingJobs.map((j) =>
        j.id === id
          ? { ...j, state: "error", completedAt: Date.now(), error: errorMsg }
          : j,
      ),
    })),

  dismissJob: (id) =>
    set((s) => ({
      generatingJobs: s.generatingJobs.filter((j) => j.id !== id),
    })),

  requestReopenBuilder: (jobId) => set({ reopenBuilderForJob: jobId }),

  // ── DB-07c canvas + Phase-2 emit transitions ──────────────────────

  startEditing: (jobId) =>
    set((s) => ({
      generatingJobs: s.generatingJobs.map((j) =>
        j.id === jobId &&
        (j.state === "draft_ready" || j.state === "editing")
          ? { ...j, state: "editing" as const }
          : j,
      ),
    })),

  saveEditedJson: (jobId, edited) =>
    set((s) => ({
      generatingJobs: s.generatingJobs.map((j) =>
        j.id === jobId
          ? { ...j, editedJson: edited, lastAutoSaveAt: Date.now() }
          : j,
      ),
    })),

  startEmit: (jobId) =>
    set((s) => ({
      generatingJobs: s.generatingJobs.map((j) =>
        j.id === jobId && j.state === "editing"
          ? { ...j, state: "emitting" as const, error: undefined }
          : j,
      ),
    })),

  recordEmit: (jobId, file) =>
    set((s) => ({
      generatingJobs: s.generatingJobs.map((j) =>
        j.id === jobId
          ? {
              ...j,
              state: "editing" as const,
              error: undefined,
              emittedFiles: [
                ...(j.emittedFiles ?? []),
                { ...file, emittedAt: Date.now() },
              ],
            }
          : j,
      ),
    })),

  failEmit: (jobId, error) =>
    set((s) => ({
      generatingJobs: s.generatingJobs.map((j) =>
        j.id === jobId
          ? { ...j, state: "editing" as const, error }
          : j,
      ),
    })),

  openCanvas: (jobId) =>
    set((s) => ({
      canvasJobId: jobId,
      generatingJobs: s.generatingJobs.map((j) =>
        j.id === jobId &&
        (j.state === "draft_ready" || j.state === "editing")
          ? { ...j, state: "editing" as const }
          : j,
      ),
    })),

  closeCanvas: () => set({ canvasJobId: null }),

  openFileForEdit: (fileId) => {
    const state = get();
    const file = state.files.find((f) => f.id === fileId);
    if (!file || !file.draftJson) return false;
    // Reuse an existing synthetic-edit job if we've opened this file
    // before in the current session — keeps editedJson intact.
    const existing = state.generatingJobs.find((j) => j.fileId === fileId);
    if (existing) {
      set({ canvasJobId: existing.id });
      // nudge state back to editing if it somehow drifted
      set((s) => ({
        generatingJobs: s.generatingJobs.map((j) =>
          j.id === existing.id
            ? { ...j, state: "editing" as const }
            : j,
        ),
      }));
      return true;
    }
    const id =
      typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
        ? crypto.randomUUID()
        : `edit_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const syntheticJob: GeneratingJob = {
      id,
      docType: file.docType || "custom",
      docTypeLabel: file.fileName,
      kind: "filegen",
      format: (file.format === "docx" ||
        file.format === "pdf" ||
        file.format === "pptx" ||
        file.format === "xlsx")
        ? file.format
        : "docx",
      state: "editing",
      startedAt: Date.now(),
      completedAt: Date.now(),
      draft: file.draftJson,
      editedJson: file.draftJson,
      fileId: file.id,
      lastAutoSaveAt: Date.now(),
      // payload intentionally omitted — Regenerate disables when
      // payload is undefined (file was opened, not agent-generated
      // fresh in this session).
    };
    set((s) => ({
      generatingJobs: [syntheticJob, ...s.generatingJobs],
      canvasJobId: id,
    }));
    return true;
  },

  regenerateJob: (jobId) => {
    const job = get().generatingJobs.find((j) => j.id === jobId);
    if (!job || !job.payload) return;
    const payload = job.payload;
    set((s) => ({
      generatingJobs: s.generatingJobs.map((j) =>
        j.id === jobId
          ? {
              ...j,
              state: "running" as const,
              draft: undefined,
              editedJson: undefined,
              emittedFiles: undefined,
              error: undefined,
              completedAt: undefined,
              startedAt: Date.now(),
            }
          : j,
      ),
    }));

    (async () => {
      try {
        const res = await fetch("/api/chat/filegen", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...payload, job_id: jobId }),
        });
        if (!res.ok) {
          let body: { error?: string; message?: string } | null = null;
          try {
            body = (await res.json()) as { error?: string; message?: string };
          } catch {
            /* ignore */
          }
          const message =
            body?.message ||
            body?.error ||
            `Regenerate failed (HTTP ${res.status}).`;
          set((s) => ({
            generatingJobs: s.generatingJobs.map((j) =>
              j.id === jobId
                ? {
                    ...j,
                    state: "error" as const,
                    error: message,
                    completedAt: Date.now(),
                  }
                : j,
            ),
          }));
          return;
        }
        const json = (await res.json()) as { draft?: ResponseSchema };
        if (!json.draft) {
          set((s) => ({
            generatingJobs: s.generatingJobs.map((j) =>
              j.id === jobId
                ? {
                    ...j,
                    state: "error" as const,
                    error:
                      payload.language === "bn"
                        ? "অপ্রত্যাশিত উত্তর — খসড়া অনুপস্থিত।"
                        : "Unexpected response — draft missing.",
                    completedAt: Date.now(),
                  }
                : j,
            ),
          }));
          return;
        }
        set((s) => ({
          generatingJobs: s.generatingJobs.map((j) =>
            j.id === jobId
              ? {
                  ...j,
                  state: "draft_ready" as const,
                  draft: json.draft,
                  completedAt: Date.now(),
                }
              : j,
          ),
        }));
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        set((s) => ({
          generatingJobs: s.generatingJobs.map((j) =>
            j.id === jobId
              ? {
                  ...j,
                  state: "error" as const,
                  error: msg,
                  completedAt: Date.now(),
                }
              : j,
          ),
        }));
      }
    })();
  },
    }),
    {
      name: "llp-workspace-store-v1",
      version: 1,
      storage: createJSONStorage(() =>
        typeof window === "undefined"
          ? (undefined as unknown as Storage)
          : window.localStorage,
      ),
      // Whitelist the canvas-relevant slice only. Files, signed-URL
      // cache, sidebar layout state stay ephemeral — they re-hydrate
      // from the API on mount. We persist enough of generatingJobs
      // that a refresh during canvas editing returns the user to
      // their work without losing the draft or local edits.
      partialize: (state) => ({
        generatingJobs: state.generatingJobs.map((j) => ({
          id: j.id,
          docType: j.docType,
          docTypeLabel: j.docTypeLabel,
          kind: j.kind,
          format: j.format,
          state: j.state,
          startedAt: j.startedAt,
          completedAt: j.completedAt,
          fileId: j.fileId,
          error: j.error,
          messageId: j.messageId,
          payload: j.payload,
          draft: j.draft,
          editedJson: j.editedJson,
          lastAutoSaveAt: j.lastAutoSaveAt,
          // emittedFiles intentionally omitted — blob URLs are
          // session-scoped and would be dead links after a reload.
        })) as GeneratingJob[],
        seenFileIds: state.seenFileIds,
      }),
    },
  ),
);

/** Helper — get the currently active file (null if none). */
export function selectActiveFile(state: WorkspaceState): WorkspaceFile | null {
  if (!state.activeFileId) return null;
  return state.files.find((f) => f.id === state.activeFileId) ?? null;
}
