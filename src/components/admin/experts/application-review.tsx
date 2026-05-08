"use client";

import { useState, useMemo } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import { useUser } from "@clerk/nextjs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useLanguage } from "@/hooks/use-language";
import { cn } from "@/lib/utils";
import {
  CheckCircle,
  XCircle,
  ExternalLink,
  Briefcase,
  Award,
  Clock,
  User,
  MapPin,
  Building2,
  Mail,
  Linkedin,
  ShieldCheck,
  Loader2,
  GraduationCap,
  FolderOpen,
  Languages,
  FileText,
} from "lucide-react";

interface ApplicationReviewProps {
  applicationId: Id<"expertApplications">;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const statusColors: Record<string, string> = {
  submitted:
    "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  under_review:
    "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400",
  approved:
    "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  rejected: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  draft: "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400",
};

const skillLevelLabels: Record<number, string> = {
  1: "Basic",
  2: "Intermediate",
  3: "Advanced",
  4: "Expert",
};

export function ApplicationReview({
  applicationId,
  open,
  onOpenChange,
}: ApplicationReviewProps) {
  const { t } = useLanguage();
  const { user } = useUser();
  const application = useQuery(api.expertApplications.getById, {
    id: applicationId,
  });
  const headhuntingCvUrl = useQuery(
    api.files.getUrl,
    application?.headhunting?.cvId
      ? { storageId: application.headhunting.cvId }
      : "skip"
  );

  const approveMutation = useMutation(api.expertApplications.approve);
  const rejectMutation = useMutation(api.expertApplications.reject);

  const [reviewNotes, setReviewNotes] = useState("");
  const [skillOverrides, setSkillOverrides] = useState<
    Record<number, number>
  >({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isReviewed =
    application?.status === "approved" || application?.status === "rejected";

  const reviewerName = useMemo(() => {
    if (user?.fullName) return user.fullName;
    if (user?.firstName) return `${user.firstName} ${user.lastName || ""}`.trim();
    return "Admin";
  }, [user]);

  const handleApprove = async () => {
    if (!application) return;
    setIsSubmitting(true);
    setError(null);

    try {
      // Build skill overrides: merge original skills with any admin adjustments
      const finalSkills = application.skills.map((skill, idx) => ({
        name: skill.name,
        level: (skillOverrides[idx] ?? skill.level) as 1 | 2 | 3 | 4,
        evidence: skill.evidence,
        documentId: skill.documentId,
      }));

      const hasOverrides = Object.keys(skillOverrides).length > 0;

      await approveMutation({
        id: applicationId,
        reviewedBy: reviewerName,
        reviewNotes: reviewNotes || undefined,
        skillOverrides: hasOverrides ? finalSkills : undefined,
      });
      // Notify applicant of approval (non-blocking)
      if (application.email) {
        fetch("/api/notifications", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            type: "expert_status_updated",
            applicantName: application.name,
            applicantEmail: application.email,
            status: "approved",
          }),
        }).catch(() => {});
      }
      onOpenChange(false);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to approve application"
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReject = async () => {
    if (!application) return;
    if (!reviewNotes.trim()) {
      setError("Review notes are required when rejecting an application.");
      return;
    }
    setIsSubmitting(true);
    setError(null);

    try {
      await rejectMutation({
        id: applicationId,
        reviewedBy: reviewerName,
        reviewNotes: reviewNotes.trim(),
      });
      // Notify applicant of rejection (non-blocking)
      if (application.email) {
        fetch("/api/notifications", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            type: "expert_status_updated",
            applicantName: application.name,
            applicantEmail: application.email,
            status: "rejected",
            reason: reviewNotes.trim(),
          }),
        }).catch(() => {});
      }
      onOpenChange(false);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to reject application"
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  if (!application) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="sr-only">Application Review</DialogTitle>
          </DialogHeader>
          <div className="py-16 text-center text-sm text-muted-foreground">
            {t("admin.loading")}
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <DialogTitle className="text-xl">
              Application Review
            </DialogTitle>
            <Badge
              variant="secondary"
              className={cn("text-xs", statusColors[application.status])}
            >
              {t(`admin.applications.status.${application.status}`)}
            </Badge>
          </div>
          <DialogDescription className="text-sm">
            Submitted {formatDate(application._creationTime)}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 pt-2">
          {/* Applicant Info */}
          <Section title="Applicant Info">
            <div className="grid grid-cols-2 gap-4">
              <InfoRow icon={User} label="Name" value={application.name} />
              <InfoRow
                icon={Mail}
                label="Email"
                value={application.email || "-"}
              />
              <InfoRow
                icon={Briefcase}
                label="Designation"
                value={application.designation || "-"}
              />
              <InfoRow
                icon={Building2}
                label="Organization"
                value={application.organization || "-"}
              />
              <InfoRow
                icon={MapPin}
                label="City"
                value={application.city || "-"}
              />
              {application.linkedin && (
                <div className="flex items-start gap-2">
                  <Linkedin className="size-4 text-muted-foreground mt-0.5 shrink-0" />
                  <div>
                    <p className="text-xs text-muted-foreground">LinkedIn</p>
                    <a
                      href={application.linkedin}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-primary hover:underline inline-flex items-center gap-1"
                    >
                      Profile
                      <ExternalLink className="size-3" />
                    </a>
                  </div>
                </div>
              )}
            </div>
          </Section>

          {/* Bio */}
          {application.bio && (
            <Section title="Bio">
              <p className="text-sm text-foreground/80 whitespace-pre-wrap leading-relaxed">
                {application.bio}
              </p>
            </Section>
          )}

          {/* Sectors */}
          {application.sectors.length > 0 && (
            <Section title="Sectors">
              <div className="flex flex-wrap gap-2">
                {application.sectors.map((sector) => (
                  <Badge key={sector} variant="outline" className="text-xs">
                    {sector}
                  </Badge>
                ))}
              </div>
            </Section>
          )}

          {/* Skills */}
          {application.skills.length > 0 && (
            <Section
              title={t("admin.experts.editor.section.skills")}
              subtitle={
                !isReviewed
                  ? t("admin.applications.skillOverride")
                  : undefined
              }
            >
              <div className="space-y-3">
                {application.skills.map((skill, idx) => (
                  <div
                    key={idx}
                    className="rounded-lg border border-border p-3 space-y-2"
                  >
                    <div className="flex items-center justify-between gap-4">
                      <div className="font-medium text-sm">{skill.name}</div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="text-xs text-muted-foreground">
                          Self-assessed:
                        </span>
                        <Badge variant="outline" className="text-[11px]">
                          {skillLevelLabels[skill.level]}
                        </Badge>
                        {!isReviewed && (
                          <>
                            <span className="text-xs text-muted-foreground">
                              Override:
                            </span>
                            <Select
                              value={String(
                                skillOverrides[idx] ?? skill.level
                              )}
                              onValueChange={(v) =>
                                setSkillOverrides((prev) => ({
                                  ...prev,
                                  [idx]: parseInt(v),
                                }))
                              }
                            >
                              <SelectTrigger className="h-7 w-[130px] text-xs">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="1">
                                  1 - Basic
                                </SelectItem>
                                <SelectItem value="2">
                                  2 - Intermediate
                                </SelectItem>
                                <SelectItem value="3">
                                  3 - Advanced
                                </SelectItem>
                                <SelectItem value="4">
                                  4 - Expert
                                </SelectItem>
                              </SelectContent>
                            </Select>
                          </>
                        )}
                      </div>
                    </div>
                    {skill.evidence && (
                      <p className="text-xs text-muted-foreground leading-relaxed">
                        {skill.evidence}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </Section>
          )}

          {/* Certifications */}
          {application.certifications.length > 0 && (
            <Section title="Certifications">
              <div className="space-y-2">
                {application.certifications.map((cert, idx) => (
                  <div
                    key={idx}
                    className="flex items-center gap-3 rounded-lg border border-border p-3"
                  >
                    <Award className="size-4 text-muted-foreground shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium">{cert.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {[cert.org, cert.year].filter(Boolean).join(" - ") ||
                          "-"}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </Section>
          )}

          {/* Experiences */}
          {application.experiences.length > 0 && (
            <Section title="Experiences">
              <div className="space-y-2">
                {application.experiences.map((exp, idx) => (
                  <div
                    key={idx}
                    className="rounded-lg border border-border p-3 space-y-1"
                  >
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium">
                        {exp.title || "Untitled"}
                      </p>
                      {exp.duration && (
                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                          <Clock className="size-3" />
                          {exp.duration}
                        </span>
                      )}
                    </div>
                    {(exp.company || exp.location) && (
                      <p className="text-xs text-muted-foreground">
                        {[exp.company, exp.location].filter(Boolean).join(" · ")}
                      </p>
                    )}
                    {exp.role && (
                      <p className="text-xs text-muted-foreground">
                        Role: {exp.role}
                      </p>
                    )}
                    {exp.scope && (
                      <p className="text-xs text-muted-foreground">
                        Scope: {exp.scope}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </Section>
          )}

          {/* Education */}
          {application.education && application.education.length > 0 && (
            <Section title="Education">
              <div className="space-y-2">
                {application.education.map((edu: { degree: string; institution: string; fieldOfStudy?: string; year?: string }, idx: number) => (
                  <div
                    key={idx}
                    className="flex items-center gap-3 rounded-lg border border-border p-3"
                  >
                    <GraduationCap className="size-4 text-muted-foreground shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium">{edu.degree}</p>
                      <p className="text-xs text-muted-foreground">
                        {[edu.institution, edu.fieldOfStudy, edu.year].filter(Boolean).join(" · ")}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </Section>
          )}

          {/* Projects */}
          {application.projects && application.projects.length > 0 && (
            <Section title="Projects">
              <div className="space-y-2">
                {application.projects.map((proj: { name: string; client?: string; description?: string; duration?: string; outcome?: string }, idx: number) => (
                  <div
                    key={idx}
                    className="rounded-lg border border-border p-3 space-y-1"
                  >
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium">{proj.name}</p>
                      {proj.duration && (
                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                          <Clock className="size-3" />
                          {proj.duration}
                        </span>
                      )}
                    </div>
                    {proj.client && (
                      <p className="text-xs text-muted-foreground">Client: {proj.client}</p>
                    )}
                    {proj.description && (
                      <p className="text-xs text-muted-foreground">{proj.description}</p>
                    )}
                    {proj.outcome && (
                      <p className="text-xs text-muted-foreground">Outcome: {proj.outcome}</p>
                    )}
                  </div>
                ))}
              </div>
            </Section>
          )}

          {/* Languages */}
          {application.languages && application.languages.length > 0 && (
            <Section title="Languages">
              <div className="flex flex-wrap gap-2">
                {application.languages.map((lang: { name: string; proficiency?: string }, idx: number) => (
                  <Badge key={idx} variant="outline" className="text-xs">
                    {lang.name}{lang.proficiency ? ` (${lang.proficiency})` : ""}
                  </Badge>
                ))}
              </div>
            </Section>
          )}

          {/* Affiliations */}
          {application.affiliations && application.affiliations.length > 0 && (
            <Section title="Professional Affiliations">
              <div className="space-y-2">
                {application.affiliations.map((aff: { name: string; role?: string; since?: string }, idx: number) => (
                  <div
                    key={idx}
                    className="flex items-center gap-3 rounded-lg border border-border p-3"
                  >
                    <Building2 className="size-4 text-muted-foreground shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium">{aff.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {[aff.role, aff.since ? `Since ${aff.since}` : null].filter(Boolean).join(" · ") || "-"}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </Section>
          )}

          {/* Session Preferences */}
          {application.sessionPreferences && (
            <Section title="Session Preferences">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">
                    Session lengths:
                  </span>
                  <div className="flex gap-1.5">
                    {application.sessionPreferences.lengths.map((len) => (
                      <Badge key={len} variant="outline" className="text-xs">
                        {len} min
                      </Badge>
                    ))}
                  </div>
                </div>
                {application.sessionPreferences.availabilityNotes && (
                  <p className="text-sm text-muted-foreground">
                    {application.sessionPreferences.availabilityNotes}
                  </p>
                )}
              </div>
            </Section>
          )}

          {/* Headhunting */}
          {application.headhunting && (
            <Section title="Headhunting">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Badge
                    variant={
                      application.headhunting.optedIn ? "default" : "outline"
                    }
                    className="text-xs"
                  >
                    {application.headhunting.optedIn
                      ? "Opted In"
                      : "Not Opted In"}
                  </Badge>
                </div>
                {application.headhunting.optedIn && (
                  <div className="grid grid-cols-2 gap-3 pt-1">
                    {application.headhunting.ctcRange && (
                      <div>
                        <p className="text-xs text-muted-foreground">
                          CTC Range
                        </p>
                        <p className="text-sm">
                          {application.headhunting.ctcRange}
                        </p>
                      </div>
                    )}
                    {application.headhunting.noticePeriod && (
                      <div>
                        <p className="text-xs text-muted-foreground">
                          Notice Period
                        </p>
                        <p className="text-sm">
                          {application.headhunting.noticePeriod}
                        </p>
                      </div>
                    )}
                    {application.headhunting.preferredLocations &&
                      application.headhunting.preferredLocations.length >
                        0 && (
                        <div className="col-span-2">
                          <p className="text-xs text-muted-foreground mb-1">
                            Preferred Locations
                          </p>
                          <div className="flex flex-wrap gap-1.5">
                            {application.headhunting.preferredLocations.map(
                              (loc) => (
                                <Badge
                                  key={loc}
                                  variant="outline"
                                  className="text-xs"
                                >
                                  {loc}
                                </Badge>
                              )
                            )}
                          </div>
                        </div>
                      )}
                    <div className="col-span-2">
                      <p className="text-xs text-muted-foreground mb-1">CV</p>
                      {application.headhunting.cvId ? (
                        headhuntingCvUrl ? (
                          <Button
                            asChild
                            variant="outline"
                            size="sm"
                            className="h-7 gap-1 text-xs"
                          >
                            <a
                              href={headhuntingCvUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                            >
                              <FileText className="size-3" />
                              View CV
                            </a>
                          </Button>
                        ) : (
                          <span className="text-xs text-muted-foreground inline-flex items-center gap-1">
                            <Loader2 className="size-3 animate-spin" />
                            Loading CV link…
                          </span>
                        )
                      ) : (
                        <span className="text-xs text-muted-foreground">
                          No CV uploaded
                        </span>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </Section>
          )}

          {/* Consent */}
          <Section title="Consent">
            <div className="space-y-1.5">
              <ConsentRow
                label="Accuracy of information"
                checked={application.consent.accuracy}
              />
              <ConsentRow
                label="Profile creation consent"
                checked={application.consent.profileCreation}
              />
              <ConsentRow
                label="Marketing consent"
                checked={application.consent.marketing}
              />
            </div>
          </Section>

          {/* Previous Review Info (if already reviewed) */}
          {isReviewed && application.reviewedBy && (
            <Section title="Review Decision">
              <div className="rounded-lg border border-border p-4 space-y-2 bg-muted/30">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">
                    Reviewed by {application.reviewedBy}
                  </span>
                  {application.reviewedAt && (
                    <span className="text-xs text-muted-foreground">
                      {formatDate(application.reviewedAt)}
                    </span>
                  )}
                </div>
                {application.reviewNotes && (
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                    {application.reviewNotes}
                  </p>
                )}
              </div>
            </Section>
          )}

          {/* Review Actions (only for pending applications) */}
          {!isReviewed && (
            <Section title="Review Actions">
              <div className="space-y-4">
                <div>
                  <Label htmlFor="review-notes" className="text-sm mb-1.5 block">
                    {t("admin.applications.reviewNotes")}
                  </Label>
                  <Textarea
                    id="review-notes"
                    placeholder="Enter your review notes here... (required for rejection)"
                    value={reviewNotes}
                    onChange={(e) => {
                      setReviewNotes(e.target.value);
                      setError(null);
                    }}
                    rows={3}
                    className="resize-none"
                  />
                </div>

                {error && (
                  <p className="text-sm text-destructive">{error}</p>
                )}

                <div className="flex items-center gap-3 justify-end">
                  <Button
                    variant="outline"
                    onClick={handleReject}
                    disabled={isSubmitting}
                    className="text-red-600 border-red-200 hover:bg-red-50 hover:text-red-700 dark:text-red-400 dark:border-red-800 dark:hover:bg-red-950"
                  >
                    {isSubmitting ? (
                      <Loader2 className="size-4 mr-1.5 animate-spin" />
                    ) : (
                      <XCircle className="size-4 mr-1.5" />
                    )}
                    {t("admin.applications.reject")}
                  </Button>
                  <Button
                    onClick={handleApprove}
                    disabled={isSubmitting}
                    className="bg-green-600 hover:bg-green-700 text-white"
                  >
                    {isSubmitting ? (
                      <Loader2 className="size-4 mr-1.5 animate-spin" />
                    ) : (
                      <CheckCircle className="size-4 mr-1.5" />
                    )}
                    {t("admin.applications.approve")}
                  </Button>
                </div>
              </div>
            </Section>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

// --- Helper components ---

function Section({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-2">
      <div>
        <h3 className="text-sm font-semibold text-foreground">{title}</h3>
        {subtitle && (
          <p className="text-xs text-muted-foreground">{subtitle}</p>
        )}
      </div>
      {children}
    </div>
  );
}

function InfoRow({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-start gap-2">
      <Icon className="size-4 text-muted-foreground mt-0.5 shrink-0" />
      <div>
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-sm">{value}</p>
      </div>
    </div>
  );
}

function ConsentRow({
  label,
  checked,
}: {
  label: string;
  checked: boolean;
}) {
  return (
    <div className="flex items-center gap-2">
      <ShieldCheck
        className={cn(
          "size-4 shrink-0",
          checked
            ? "text-green-600 dark:text-green-400"
            : "text-muted-foreground/30"
        )}
      />
      <span
        className={cn(
          "text-sm",
          checked ? "text-foreground" : "text-muted-foreground line-through"
        )}
      >
        {label}
      </span>
    </div>
  );
}
