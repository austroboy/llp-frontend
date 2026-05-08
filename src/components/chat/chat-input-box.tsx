import { useRef } from "react";
import { toast } from "sonner";
import {
  PaperclipIcon,
  SendIcon,
  XIcon,
  FileTextIcon,
  LoaderIcon,
  TelescopeIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/hooks/use-language";
import { AI_MODELS } from "@/lib/ai/models";

export interface AttachedDocument {
  fileName: string;
  text: string;
}

const ACCEPTED_FILE_TYPES =
  ".pdf,.png,.jpg,.jpeg,.docx,.txt,application/pdf,image/png,image/jpeg,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain";
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB

interface ChatInputBoxProps {
  message: string;
  onMessageChange: (value: string) => void;
  onSend: () => void;
  selectedModel: string;
  onModelChange: (modelId: string) => void;
  showTools?: boolean;
  placeholder?: string;
  models?: readonly { id: string; label: string; description: string; disabled?: boolean }[];
  attachedDoc: AttachedDocument | null;
  isUploading: boolean;
  onFileSelect: (file: File) => void;
  onRemoveAttachment: () => void;
  /** Deep Search toggle — turn-2+ only. When active, chat-proxy runs a
   *  retrieve → draft → verify-gate pipeline instead of the blind
   *  continuation. Hidden via showTools=false on the landing screen. */
  deepSearchEnabled?: boolean;
  onToggleDeepSearch?: () => void;
}

export function ChatInputBox({
  message,
  onMessageChange,
  onSend,
  showTools = true,
  placeholder,
  models,
  attachedDoc,
  isUploading,
  onFileSelect,
  onRemoveAttachment,
  deepSearchEnabled = false,
  onToggleDeepSearch,
}: ChatInputBoxProps) {
  const resolvedModels = models ?? AI_MODELS;
  const { t } = useLanguage();
  const resolvedPlaceholder = placeholder ?? t("input.placeholder");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const canSend = message.trim().length > 0;

  void resolvedModels;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";

    if (file.size > MAX_FILE_SIZE) {
      toast.error("File too large (max 10 MB)");
      return;
    }
    onFileSelect(file);
  };

  return (
    <div className="lf-chat-composer">
      {(attachedDoc || isUploading) && (
        <div className="lf-chat-composer-attachment">
          {isUploading ? (
            <span className="lf-meta lf-meta--accent inline-flex items-center gap-1.5">
              <LoaderIcon className="size-3 animate-spin motion-reduce:animate-none" />
              Reading document
            </span>
          ) : attachedDoc ? (
            <span className="lf-chat-attachment-pill">
              <FileTextIcon className="size-3.5" />
              <span className="max-w-[40ch] truncate">{attachedDoc.fileName}</span>
              <button
                type="button"
                onClick={onRemoveAttachment}
                className="lf-chat-attachment-remove"
                aria-label="Remove attachment"
              >
                <XIcon className="size-3" />
              </button>
            </span>
          ) : null}
        </div>
      )}

      <textarea
        placeholder={resolvedPlaceholder}
        value={message}
        onChange={(e) => onMessageChange(e.target.value)}
        rows={3}
        className="lf-chat-textarea lf-chat-textarea--inline"
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            if (canSend) onSend();
          }
        }}
      />

      <input
        ref={fileInputRef}
        type="file"
        accept={ACCEPTED_FILE_TYPES}
        onChange={handleFileChange}
        className="hidden"
      />

      <div className="lf-chat-composer-toolbar">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
            title="Attach a document (PDF, image, DOCX, TXT)"
            className="lf-cta lf-cta--ghost lf-chat-toolbar-btn"
          >
            <PaperclipIcon className="size-3.5" />
            <span className="hidden sm:inline">Attach</span>
          </button>

          {showTools && onToggleDeepSearch && (
            <button
              type="button"
              onClick={onToggleDeepSearch}
              aria-pressed={deepSearchEnabled}
              className={cn(
                "lf-cta lf-chat-toolbar-btn",
                deepSearchEnabled ? "lf-chat-deep--on" : "lf-cta--ghost",
              )}
              title={
                deepSearchEnabled
                  ? "Deep Search on — answer is verified against source before emit (slower, higher accuracy)"
                  : "Deep Search off — turn on for source-verified turn-2+ answers"
              }
            >
              <TelescopeIcon className="size-3.5" />
              <span className="hidden sm:inline">Deep Search</span>
            </button>
          )}
        </div>

        <button
          type="button"
          onClick={() => canSend && onSend()}
          disabled={!canSend}
          aria-label="Send"
          className={cn(
            "lf-cta lf-cta--primary lf-chat-send",
            !canSend && "lf-chat-send--idle",
          )}
        >
          <span className="hidden sm:inline">Send</span>
          <SendIcon className="size-3.5" />
        </button>
      </div>
    </div>
  );
}
