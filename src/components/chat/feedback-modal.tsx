"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

interface FeedbackModalProps {
  open: boolean;
  voteType: "up" | "down" | null;
  onClose: () => void;
  onSubmit: (comment?: string) => void;
}

const CONTENT = {
  up: {
    title: "Thanks for your feedback!",
    description: "What was helpful about this response?",
    placeholder: "e.g., Accurate sections cited, clear explanation...",
  },
  down: {
    title: "Help us improve",
    description: "What could we do better?",
    placeholder: "e.g., Section number was wrong, answer was incomplete...",
  },
};

export function FeedbackModal({ open, voteType, onClose, onSubmit }: FeedbackModalProps) {
  const [comment, setComment] = useState("");

  const content = voteType ? CONTENT[voteType] : CONTENT.down;

  const handleSubmitFeedback = () => {
    onSubmit(comment.trim() || undefined);
    setComment("");
  };

  const handleSkip = () => {
    onSubmit(undefined);
    setComment("");
  };

  const handleOpenChange = (isOpen: boolean) => {
    if (!isOpen) {
      setComment("");
      onClose();
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{content.title}</DialogTitle>
          <DialogDescription>
            {content.description}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2">
          <Textarea
            value={comment}
            onChange={(e) => {
              if (e.target.value.length <= 500) {
                setComment(e.target.value);
              }
            }}
            placeholder={content.placeholder}
            className="min-h-[100px]"
            maxLength={500}
          />
          <p className="text-xs text-muted-foreground text-right">
            {comment.length}/500
          </p>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="ghost" onClick={handleSkip}>
            Skip
          </Button>
          <Button onClick={handleSubmitFeedback}>Submit feedback</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
