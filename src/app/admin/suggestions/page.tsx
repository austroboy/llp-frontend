"use client";

import { useQuery, useMutation } from "convex/react";
import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Check, X, Edit3, Clock, User, Calendar } from "lucide-react";
import { useUser } from "@clerk/nextjs";
import { api } from "@convex/_generated/api";
import { toast } from "sonner";
import { motion, MotionConfig, type Variants } from "framer-motion";

const EASE_OUT = [0.16, 1, 0.3, 1] as const;
const fadeUp: Variants = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { duration: 0.55, ease: EASE_OUT } },
};
const stagger: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.06, delayChildren: 0.04 } },
};
const heroStagger: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.08, delayChildren: 0.08 } },
};
const inViewOnce = { once: true, margin: "-72px 0px" } as const;

const statusColors: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-800",
  approved: "bg-green-100 text-green-800",
  rejected: "bg-red-100 text-red-800",
  edited: "bg-blue-100 text-blue-800",
};

const fieldLabels: Record<string, string> = {
  professionalBase: "Professional Base",
  countries: "Countries",
  hiringCorridors: "Hiring Corridors",
  industries: "Industries",
  functions: "Functions",
};

interface ReviewModalProps {
  suggestion: any;
  onClose: () => void;
  onSubmit: (action: string, decision?: string, notes?: string) => void;
}

function ReviewModal({ suggestion, onClose, onSubmit }: ReviewModalProps) {
  const [action, setAction] = useState<"approve" | "edit" | "reject">("approve");
  const [decision, setDecision] = useState(suggestion.suggestedValue);
  const [notes, setNotes] = useState("");

  const handleSubmit = () => {
    if (action === "edit" && !decision.trim()) {
      toast.error("Please provide the edited value");
      return;
    }
    onSubmit(action, action === "edit" ? decision : undefined, notes || undefined);
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.5)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 50,
      }}
    >
      <motion.div
        initial={{ opacity: 0, y: 8, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.25, ease: EASE_OUT }}
        className="lf-card"
        style={{
          width: "100%",
          maxWidth: 480,
          maxHeight: "90vh",
          overflowY: "auto",
          padding: "var(--s-5)",
        }}
      >
        <h3
          style={{
            fontFamily: "var(--lf-display)",
            fontSize: 22,
            fontWeight: 400,
            color: "var(--ink)",
            margin: "0 0 var(--s-4)",
          }}
        >
          Review <em style={{ fontStyle: "italic", color: "var(--accent-blue)" }}>suggestion.</em>
        </h3>

        <div style={{ display: "flex", flexDirection: "column", gap: "var(--s-4)" }}>
          <div>
            <Label className="lf-meta" style={{ textTransform: "uppercase", color: "var(--ink-4)" }}>
              Field
            </Label>
            <p className="lf-body" style={{ marginTop: 4 }}>
              {fieldLabels[suggestion.fieldName] || suggestion.fieldName}
            </p>
          </div>

          <div>
            <Label className="lf-meta" style={{ textTransform: "uppercase", color: "var(--ink-4)" }}>
              Scout&apos;s suggestion
            </Label>
            <p
              className="lf-body"
              style={{
                marginTop: 4,
                background: "var(--paper-inner)",
                padding: "var(--s-2) var(--s-3)",
                border: "1px solid var(--line-1)",
                borderRadius: "var(--r-sm)",
              }}
            >
              {suggestion.suggestedValue}
            </p>
          </div>

          <div>
            <Label className="lf-meta" style={{ textTransform: "uppercase", color: "var(--ink-4)" }}>
              Action
            </Label>
            <div style={{ display: "flex", gap: "var(--s-2)", marginTop: 6 }}>
              <Button
                size="sm"
                variant={action === "approve" ? "default" : "outline"}
                onClick={() => setAction("approve")}
                style={{ flex: 1 }}
              >
                <Check className="w-3 h-3 mr-1" />
                Approve
              </Button>
              <Button
                size="sm"
                variant={action === "edit" ? "default" : "outline"}
                onClick={() => setAction("edit")}
                style={{ flex: 1 }}
              >
                <Edit3 className="w-3 h-3 mr-1" />
                Edit
              </Button>
              <Button
                size="sm"
                variant={action === "reject" ? "destructive" : "outline"}
                onClick={() => setAction("reject")}
                style={{ flex: 1 }}
              >
                <X className="w-3 h-3 mr-1" />
                Reject
              </Button>
            </div>
          </div>

          {action === "edit" && (
            <div>
              <Label className="lf-meta" style={{ textTransform: "uppercase", color: "var(--ink-4)" }}>
                Corrected value
              </Label>
              <Input
                value={decision}
                onChange={(e) => setDecision(e.target.value)}
                placeholder="Enter the standardized version"
                style={{ marginTop: 6 }}
              />
            </div>
          )}

          <div>
            <Label className="lf-meta" style={{ textTransform: "uppercase", color: "var(--ink-4)" }}>
              Notes (optional)
            </Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Explain your decision..."
              style={{ marginTop: 6, minHeight: 80 }}
            />
          </div>
        </div>

        <div style={{ display: "flex", gap: "var(--s-2)", marginTop: "var(--s-5)" }}>
          <Button onClick={onClose} variant="outline" style={{ flex: 1 }}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} style={{ flex: 1 }}>
            Submit Review
          </Button>
        </div>
      </motion.div>
    </div>
  );
}

function SuggestionCard({
  suggestion,
  onReview,
}: {
  suggestion: any;
  onReview: (suggestion: any) => void;
}) {
  return (
    <Card
      className="lf-card"
      style={{ marginBottom: "var(--s-3)", padding: "var(--s-4)" }}
    >
      <CardContent style={{ padding: 0 }}>
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "var(--s-3)" }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8, flexWrap: "wrap" }}>
              <Badge className={statusColors[suggestion.status]}>
                {suggestion.status === "pending" && <Clock className="w-3 h-3 mr-1" />}
                {suggestion.status}
              </Badge>
              <span className="lf-meta" style={{ textTransform: "uppercase" }}>
                {fieldLabels[suggestion.fieldName] || suggestion.fieldName}
              </span>
            </div>

            <div style={{ marginBottom: 8 }}>
              <p
                style={{
                  fontFamily: "var(--lf-display)",
                  fontSize: 15,
                  color: "var(--ink)",
                  margin: 0,
                }}
              >
                Suggested: <em style={{ fontStyle: "italic" }}>&quot;{suggestion.suggestedValue}&quot;</em>
              </p>
              {suggestion.adminDecision && (
                <p
                  className="lf-body"
                  style={{ fontSize: 13, color: "var(--emerald)", margin: "4px 0 0" }}
                >
                  Final: &quot;{suggestion.adminDecision}&quot;
                </p>
              )}
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: "var(--s-3)", flexWrap: "wrap" }}>
              <span className="lf-meta" style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                <User className="w-3 h-3" />
                {suggestion.scoutProfileId || "Unknown Scout"}
              </span>
              <span className="lf-meta" style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                <Calendar className="w-3 h-3" />
                {new Date(suggestion.createdAt).toLocaleDateString()}
              </span>
            </div>

            {suggestion.adminNotes && (
              <p
                className="lf-body"
                style={{
                  fontSize: 13,
                  color: "var(--ink-3)",
                  marginTop: "var(--s-2)",
                  background: "var(--paper-inner)",
                  padding: "var(--s-2) var(--s-3)",
                  border: "1px solid var(--line-1)",
                  borderRadius: "var(--r-sm)",
                }}
              >
                <strong style={{ color: "var(--ink)" }}>Notes:</strong> {suggestion.adminNotes}
              </p>
            )}
          </div>

          {suggestion.status === "pending" && (
            <Button size="sm" onClick={() => onReview(suggestion)}>
              Review
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export default function SuggestionsPage() {
  const { user } = useUser();
  const [selectedSuggestion, setSelectedSuggestion] = useState<any>(null);
  const [activeTab, setActiveTab] = useState("pending");

  const pendingSuggestions = useQuery(api.headhunting.suggestions.getPendingSuggestions);
  const allSuggestions = useQuery(api.headhunting.suggestions.getAllSuggestions, {
    status: activeTab === "all" ? undefined : (activeTab as "pending" | "approved" | "rejected" | "edited"),
    limit: 50,
  });

  const reviewSuggestion = useMutation(api.headhunting.suggestions.reviewSuggestion);

  const handleReview = async (action: string, decision?: string, notes?: string) => {
    if (!selectedSuggestion) return;

    try {
      await reviewSuggestion({
        suggestionId: selectedSuggestion._id,
        action: action as any,
        adminDecision: decision,
        adminNotes: notes,
        reviewedBy: user?.id || "unknown",
      });

      toast.success(`Suggestion ${action}${action === "edit" ? "ed" : action === "reject" ? "ed" : "d"}`);
      setSelectedSuggestion(null);
    } catch (error) {
      toast.error("Failed to review suggestion");
      console.error(error);
    }
  };

  const suggestions = activeTab === "pending" ? pendingSuggestions : allSuggestions;

  return (
    <MotionConfig reducedMotion="user">
      {/* Hero */}
      <motion.section
        variants={heroStagger}
        initial="hidden"
        animate="show"
        style={{ paddingBottom: "var(--s-6)" }}
      >
        <motion.div variants={fadeUp} className="lf-kicker">
          <span className="lf-kicker-mark">§ V</span>
          Admin · Communications · Suggestions
        </motion.div>
        <motion.h1
          variants={fadeUp}
          style={{
            fontFamily: "var(--lf-display)",
            fontSize: "clamp(36px, 5vw, 56px)",
            fontWeight: 400,
            lineHeight: 1.05,
            letterSpacing: "-0.02em",
            color: "var(--ink)",
            margin: "var(--s-3) 0 var(--s-3)",
          }}
        >
          Scout form <em style={{ fontStyle: "italic", color: "var(--accent-blue)" }}>suggestions.</em>
        </motion.h1>
        <motion.p
          variants={fadeUp}
          className="lf-section-deck"
          style={{ maxWidth: "60ch" }}
        >
          Review and approve new field values suggested by scouts in &quot;Other&quot; fields.
        </motion.p>
      </motion.section>

      {/* Tabs + content */}
      <motion.section
        variants={stagger}
        initial="hidden"
        whileInView="show"
        viewport={inViewOnce}
        style={{ marginBottom: "var(--s-7)" }}
      >
        <motion.div variants={fadeUp}>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-5">
              <TabsTrigger value="pending">
                Pending ({pendingSuggestions?.length || 0})
              </TabsTrigger>
              <TabsTrigger value="approved">Approved</TabsTrigger>
              <TabsTrigger value="edited">Edited</TabsTrigger>
              <TabsTrigger value="rejected">Rejected</TabsTrigger>
              <TabsTrigger value="all">All</TabsTrigger>
            </TabsList>

            {["pending", "approved", "edited", "rejected", "all"].map((tab) => (
              <TabsContent key={tab} value={tab}>
                <div style={{ marginTop: "var(--s-4)" }}>
                  {suggestions?.length ? (
                    suggestions.map((suggestion) => (
                      <SuggestionCard
                        key={suggestion._id}
                        suggestion={suggestion}
                        onReview={setSelectedSuggestion}
                      />
                    ))
                  ) : (
                    <div
                      className="lf-card"
                      style={{
                        padding: "var(--s-6)",
                        textAlign: "center",
                        borderStyle: "dashed",
                      }}
                    >
                      <p
                        style={{
                          fontFamily: "var(--lf-display)",
                          fontStyle: "italic",
                          color: "var(--ink-3)",
                          margin: 0,
                        }}
                      >
                        No {tab === "all" ? "" : tab} suggestions found.
                      </p>
                    </div>
                  )}
                </div>
              </TabsContent>
            ))}
          </Tabs>
        </motion.div>
      </motion.section>

      {selectedSuggestion && (
        <ReviewModal
          suggestion={selectedSuggestion}
          onClose={() => setSelectedSuggestion(null)}
          onSubmit={handleReview}
        />
      )}
    </MotionConfig>
  );
}
