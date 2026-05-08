/**
 * Admin API — Email Template Registry & Live HTML Preview
 *
 * GET ?action=list     — Return all template metadata grouped by category
 * GET ?action=preview&id=<templateId> — Render live HTML preview with sample data
 * GET ?action=sample&id=<templateId>  — Return editable sample data for a template
 *
 * Auth: Admin only (Clerk)
 */

import { NextRequest, NextResponse } from "next/server";
import { currentUser } from "@clerk/nextjs/server";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { sendEmail } from "@/lib/email";
import {
  getEmailOverride,
  renderOverride,
  sanitizeTemplateHtml,
  substituteTokens,
  extractTokens,
} from "@/lib/email-overrides";
import { ConvexHttpClient } from "convex/browser";
import { api } from "@convex/_generated/api";

// ─── Constants ────────────────────────────────────────────────────

const SITE_URL = process.env.NEXT_PUBLIC_APP_URL || "https://laborlawpartner.com";
const ADMIN_EMAIL = "support@laborlawpartner.com";

// ─── Shared HTML helpers (copied from email.ts / email-headhunting.ts) ───

function emailLayout(body: string, subtitle?: string): string {
  const sub = subtitle || "Bangladesh Labour Law Compliance Platform";
  return `<!DOCTYPE html>
<html><body style="margin:0;padding:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background:#f8fafc;">
<div style="max-width:580px;margin:0 auto;padding:24px;">
  <div style="padding-bottom:16px;border-bottom:2px solid #0f172a;margin-bottom:20px;">
    <div style="font-size:20px;font-weight:bold;color:#0f172a;">Labor Law Partner</div>
    <div style="font-size:12px;color:#64748b;">${sub}</div>
  </div>
  ${body}
  <div style="text-align:center;margin-top:32px;padding-top:16px;border-top:1px solid #e2e8f0;">
    <div style="font-size:11px;color:#94a3b8;">
      <a href="${SITE_URL}" style="color:#94a3b8;">laborlawpartner.com</a> ·
      <a href="mailto:${ADMIN_EMAIL}" style="color:#94a3b8;">${ADMIN_EMAIL}</a>
    </div>
  </div>
</div>
</body></html>`;
}

function infoBox(content: string): string {
  return `<div style="background:#f8f8f9;border:1px solid #e5e7eb;border-radius:8px;padding:16px;margin:16px 0;">${content}</div>`;
}

function ctaButton(text: string, href: string): string {
  return `<a href="${href}" style="display:inline-block;background:#0f172a;color:#fff;padding:12px 24px;border-radius:6px;text-decoration:none;font-size:14px;font-weight:500;margin-top:8px;">${text}</a>`;
}

function statusBadge(status: string): string {
  const colors: Record<string, string> = {
    received: "#f59e0b",
    clarification: "#ef4444",
    architecture: "#8b5cf6",
    internal_review: "#6366f1",
    client_review: "#3b82f6",
    approved: "#22c55e",
    released: "#06b6d4",
    paused: "#9ca3af",
    filled: "#10b981",
    closed: "#6b7280",
    reviewed: "#3b82f6",
    shortlisted: "#22c55e",
    interview: "#6366f1",
    selected: "#10b981",
    offer: "#16a34a",
    joined: "#059669",
    rejected: "#ef4444",
  };
  const color = colors[status] || "#6b7280";
  return `<span style="display:inline-block;background:${color}20;color:${color};padding:2px 10px;border-radius:12px;font-size:12px;font-weight:600;">${status.replace(/_/g, " ").toUpperCase()}</span>`;
}

// ─── Template Registry ────────────────────────────────────────────

interface TemplateEntry {
  id: string;
  name: string;
  category: string;
  description: string;
  subject: string;
  from: string;
  file: string;
  params: string[];
  recipient: "user" | "admin" | "scout" | "client";
}

const TEMPLATES: TemplateEntry[] = [
  // ══════════════════════════════════════════════════════
  // CONSULTATION (6)
  // ══════════════════════════════════════════════════════
  {
    id: "sendConsultationConfirmation",
    name: "Consultation Confirmation",
    category: "consultation",
    description: "Sent to user when they submit a consultation request",
    subject: "Your consultation request has been received",
    from: "noreply@laborlawpartner.com",
    file: "src/lib/email.ts",
    params: ["requesterName", "requesterEmail", "expertArea", "urgency", "description"],
    recipient: "user",
  },
  {
    id: "sendConsultationAdminNotify",
    name: "Consultation Admin Notification",
    category: "consultation",
    description: "Sent to admin when a new consultation request is submitted",
    subject: "[LLP] Consultation request from {requesterName}",
    from: "noreply@laborlawpartner.com",
    file: "src/lib/email.ts",
    params: ["requesterName", "requesterEmail", "expertArea", "urgency", "description"],
    recipient: "admin",
  },
  {
    id: "sendConsultationConnected",
    name: "Consultation Expert Assigned",
    category: "consultation",
    description: "Sent to requester when an expert is assigned to their consultation",
    subject: "Expert assigned to your consultation — {expertName}",
    from: "noreply@laborlawpartner.com",
    file: "src/lib/email-experts.ts",
    params: ["requesterName", "requesterEmail", "expertName", "expertArea"],
    recipient: "user",
  },
  {
    id: "sendConsultationCompleted",
    name: "Consultation Completed",
    category: "consultation",
    description: "Sent to requester when consultation is completed, asks for feedback",
    subject: "Consultation completed — how was your experience?",
    from: "noreply@laborlawpartner.com",
    file: "src/lib/email-experts.ts",
    params: ["requesterName", "requesterEmail", "expertArea"],
    recipient: "user",
  },
  {
    id: "sendConsultationStatusUpdate",
    name: "Consultation Status Update",
    category: "consultation",
    description: "Generic status change notification for consultations (reviewed, connected, completed, cancelled)",
    subject: "Consultation update: {newStatus}",
    from: "noreply@laborlawpartner.com",
    file: "src/lib/email-experts.ts",
    params: ["requesterName", "requesterEmail", "expertArea", "newStatus", "adminNotes"],
    recipient: "user",
  },

  // ══════════════════════════════════════════════════════
  // SERVICE (4)
  // ══════════════════════════════════════════════════════
  {
    id: "sendServiceRequestConfirmation",
    name: "Service Request Confirmation",
    category: "service",
    description: "Sent to user when they submit a service request",
    subject: "Service request received — {orderNumber}",
    from: "noreply@laborlawpartner.com",
    file: "src/lib/email.ts",
    params: ["requesterName", "requesterEmail", "serviceTitle", "serviceCategory", "orderNumber", "description"],
    recipient: "user",
  },
  {
    id: "sendServiceRequestAdminNotify",
    name: "Service Request Admin Notification",
    category: "service",
    description: "Sent to admin when a new service request is submitted",
    subject: "[LLP] New service request {orderNumber} — {serviceTitle}",
    from: "noreply@laborlawpartner.com",
    file: "src/lib/email.ts",
    params: ["requesterName", "requesterEmail", "serviceTitle", "serviceCategory", "orderNumber", "description"],
    recipient: "admin",
  },
  {
    id: "sendServiceStatusUpdate",
    name: "Service Status Update",
    category: "service",
    description: "Sent to user when their service request status changes (reviewed, in_progress, completed, cancelled)",
    subject: "[Service] {serviceTitle} — {newStatus}",
    from: "noreply@laborlawpartner.com",
    file: "src/lib/email-experts.ts",
    params: ["requesterName", "requesterEmail", "serviceTitle", "orderNumber", "newStatus", "adminNotes"],
    recipient: "user",
  },

  // ══════════════════════════════════════════════════════
  // ONBOARDING & PROFILE (5)
  // ══════════════════════════════════════════════════════
  {
    id: "sendWelcomeEmail",
    name: "Welcome Email",
    category: "onboarding",
    description: "Sent to user after they sign up via Clerk webhook",
    subject: "Welcome to Labor Law Partner!",
    from: "noreply@laborlawpartner.com",
    file: "src/lib/email-experts.ts",
    params: ["userName", "userEmail"],
    recipient: "user",
  },
  {
    id: "sendProfileMilestone",
    name: "Profile Milestone",
    category: "onboarding",
    description: "Sent when user reaches 50% or 75% profile completion",
    subject: "Your profile is {milestone}% complete",
    from: "noreply@laborlawpartner.com",
    file: "src/lib/email-experts.ts",
    params: ["userName", "userEmail", "milestone"],
    recipient: "user",
  },
  {
    id: "sendProfileCompleted",
    name: "Profile Completed",
    category: "onboarding",
    description: "Congratulates user when their professional profile is 100% complete",
    subject: "Your professional profile is complete!",
    from: "noreply@laborlawpartner.com",
    file: "src/lib/email-experts.ts",
    params: ["userName", "userEmail"],
    recipient: "user",
  },
  {
    id: "sendCvGenerated",
    name: "CV Generated",
    category: "onboarding",
    description: "Sent when user generates and saves a CV from the CV builder",
    subject: "Your CV has been generated!",
    from: "noreply@laborlawpartner.com",
    file: "src/lib/email-experts.ts",
    params: ["userName", "userEmail"],
    recipient: "user",
  },
  {
    id: "sendResourcePublished",
    name: "Resource Published",
    category: "onboarding",
    description: "Sent to admin when a new resource is published",
    subject: "[Resource] Published: {resourceTitle}",
    from: "noreply@laborlawpartner.com",
    file: "src/lib/email-experts.ts",
    params: ["resourceTitle", "fileName", "language"],
    recipient: "admin",
  },

  // ══════════════════════════════════════════════════════
  // EXPERT (5)
  // ══════════════════════════════════════════════════════
  {
    id: "sendExpertApplicationConfirmation",
    name: "Expert Application Confirmation",
    category: "expert",
    description: "Sent to applicant when they apply to join the expert network",
    subject: "Expert application received — under review",
    from: "noreply@laborlawpartner.com",
    file: "src/lib/email.ts",
    params: ["applicantName", "applicantEmail", "specialization"],
    recipient: "user",
  },
  {
    id: "sendExpertApplicationAdminNotify",
    name: "Expert Application Admin Notification",
    category: "expert",
    description: "Sent to admin when a new expert application is submitted",
    subject: "[LLP] New expert application from {applicantName}",
    from: "noreply@laborlawpartner.com",
    file: "src/lib/email.ts",
    params: ["applicantName", "applicantEmail", "specialization"],
    recipient: "admin",
  },
  {
    id: "sendExpertStatusUpdate",
    name: "Expert Application Status",
    category: "expert",
    description: "Sent to applicant when expert application is approved or rejected",
    subject: "Your expert application has been {status}",
    from: "noreply@laborlawpartner.com",
    file: "src/lib/email.ts",
    params: ["applicantName", "applicantEmail", "status", "reason"],
    recipient: "user",
  },
  {
    id: "sendExpertProfilePublished",
    name: "Expert Profile Published",
    category: "expert",
    description: "Sent when expert profile goes live on the platform",
    subject: "Your expert profile is now live!",
    from: "noreply@laborlawpartner.com",
    file: "src/lib/email-experts.ts",
    params: ["expertName", "expertEmail"],
    recipient: "user",
  },
  {
    id: "sendExpertBadgeAwarded",
    name: "Expert Badge Awarded",
    category: "expert",
    description: "Sent when an expert receives a new badge",
    subject: "New badge awarded: {badge}",
    from: "noreply@laborlawpartner.com",
    file: "src/lib/email-experts.ts",
    params: ["expertName", "expertEmail", "badge", "awardedBy"],
    recipient: "user",
  },

  // ══════════════════════════════════════════════════════
  // HEADHUNTING (14)
  // ══════════════════════════════════════════════════════
  {
    id: "sendHiringRequestAcknowledgment",
    name: "Hiring Request Acknowledgment",
    category: "headhunting",
    description: "Sent to client when they submit a hiring request, also notifies admin",
    subject: "Your hiring request has been received — {assignmentName}",
    from: "noreply@laborlawpartner.com",
    file: "src/lib/email-headhunting.ts",
    params: ["recipientEmail", "recipientName", "assignmentName", "department", "urgency", "description"],
    recipient: "client",
  },
  {
    id: "sendMandateCreatedNotify",
    name: "Mandate Created",
    category: "headhunting",
    description: "Sent to admin or team lead when a new mandate is created",
    subject: "[HT] New mandate: {mandateTitle} — {clientName}",
    from: "noreply@laborlawpartner.com",
    file: "src/lib/email-headhunting.ts",
    params: ["mandateTitle", "clientName", "source", "urgency", "mandateType", "assignedAgentEmail"],
    recipient: "admin",
  },
  {
    id: "sendMandateStatusChanged",
    name: "Mandate Status Changed",
    category: "headhunting",
    description: "Sent to client or internal team when a mandate status changes",
    subject: "[HT] Mandate updated: {mandateTitle} — now {newStatus}",
    from: "noreply@laborlawpartner.com",
    file: "src/lib/email-headhunting.ts",
    params: ["mandateTitle", "clientName", "oldStatus", "newStatus", "note", "recipientEmail", "recipientName", "mandateId"],
    recipient: "client",
  },
  {
    id: "sendMandateClarificationNeeded",
    name: "Mandate Clarification Needed",
    category: "headhunting",
    description: "Sent to client when more information is needed before proceeding",
    subject: "[HT] Clarification needed: {mandateTitle}",
    from: "noreply@laborlawpartner.com",
    file: "src/lib/email-headhunting.ts",
    params: ["mandateTitle", "clientName", "recipientEmail", "recipientName", "questions", "mandateId"],
    recipient: "client",
  },
  {
    id: "sendMandateReleasedToScout",
    name: "Mandate Released to Scout",
    category: "headhunting",
    description: "Sent to scouts when a new headhunting opportunity is released",
    subject: "[HT] New opportunity: {mandateTitle}",
    from: "noreply@laborlawpartner.com",
    file: "src/lib/email-headhunting.ts",
    params: ["scoutName", "scoutEmail", "mandateTitle", "roleTitle", "location", "seniority", "disclosureLevel"],
    recipient: "scout",
  },
  {
    id: "sendMandateClosedNotify",
    name: "Mandate Closed/Paused/Filled",
    category: "headhunting",
    description: "Sent to scouts when a mandate is filled, paused, or closed",
    subject: "[HT] Mandate {newStatus}: {mandateTitle}",
    from: "noreply@laborlawpartner.com",
    file: "src/lib/email-headhunting.ts",
    params: ["scoutName", "scoutEmail", "mandateTitle", "newStatus", "note"],
    recipient: "scout",
  },
  {
    id: "sendBriefReleasedNotify",
    name: "Brief Released",
    category: "headhunting",
    description: "Sent to a scout when a sourcing brief is released to them",
    subject: "[HT] Brief released: {mandateTitle}",
    from: "noreply@laborlawpartner.com",
    file: "src/lib/email-headhunting.ts",
    params: ["scoutName", "scoutEmail", "mandateTitle", "compensationMode", "roleTitle", "location"],
    recipient: "scout",
  },
  {
    id: "sendSubmissionReceivedScout",
    name: "Submission Received (Scout)",
    category: "headhunting",
    description: "Acknowledges scout when their candidate submission is received",
    subject: "[HT] Submission received: {candidateName} for {mandateTitle}",
    from: "noreply@laborlawpartner.com",
    file: "src/lib/email-headhunting.ts",
    params: ["scoutName", "scoutEmail", "candidateName", "mandateTitle"],
    recipient: "scout",
  },
  {
    id: "sendSubmissionReceivedAdmin",
    name: "Submission Received (Admin)",
    category: "headhunting",
    description: "Notifies admin when a new candidate submission arrives",
    subject: "[HT] New submission: {candidateName} — {mandateTitle}",
    from: "noreply@laborlawpartner.com",
    file: "src/lib/email-headhunting.ts",
    params: ["scoutName", "candidateName", "mandateTitle", "mandateId"],
    recipient: "admin",
  },
  {
    id: "sendSubmissionStatusChanged",
    name: "Submission Status Changed",
    category: "headhunting",
    description: "Notifies scout when their candidate progresses or is rejected",
    subject: "[HT] {candidateName} — {newStatus} ({mandateTitle})",
    from: "noreply@laborlawpartner.com",
    file: "src/lib/email-headhunting.ts",
    params: ["scoutName", "scoutEmail", "candidateName", "mandateTitle", "oldStatus", "newStatus", "rejectionReason"],
    recipient: "scout",
  },
  {
    id: "sendPlacementCreatedNotify",
    name: "Placement Confirmed",
    category: "headhunting",
    description: "Notifies scout when a placement is confirmed for their candidate",
    subject: "[HT] Placement confirmed: {candidateName} at {clientName}",
    from: "noreply@laborlawpartner.com",
    file: "src/lib/email-headhunting.ts",
    params: ["scoutName", "scoutEmail", "candidateName", "mandateTitle", "clientName", "salary", "feeAmount"],
    recipient: "scout",
  },
  {
    id: "sendPlacementJoinedNotify",
    name: "Candidate Joined",
    category: "headhunting",
    description: "Notifies scout when candidate officially joins, protection period active",
    subject: "[HT] {candidateName} joined {clientName} — protection active",
    from: "noreply@laborlawpartner.com",
    file: "src/lib/email-headhunting.ts",
    params: ["scoutName", "scoutEmail", "candidateName", "mandateTitle", "clientName", "feeAmount", "protectionMonths"],
    recipient: "scout",
  },
  {
    id: "sendPayoutReleasedNotify",
    name: "Payout Released",
    category: "headhunting",
    description: "Notifies scout when their placement payout is released",
    subject: "[HT] Payout released: {rewardAmount} for {candidateName}",
    from: "noreply@laborlawpartner.com",
    file: "src/lib/email-headhunting.ts",
    params: ["scoutName", "scoutEmail", "candidateName", "rewardAmount"],
    recipient: "scout",
  },
  {
    id: "sendReplacementTriggeredNotify",
    name: "Replacement Triggered",
    category: "headhunting",
    description: "Sent when a replacement is triggered during protection window",
    subject: "[HT] Replacement triggered: {candidateName} — {mandateTitle}",
    from: "noreply@laborlawpartner.com",
    file: "src/lib/email-headhunting.ts",
    params: ["recipientName", "recipientEmail", "candidateName", "mandateTitle", "clientName", "reason", "mandateId"],
    recipient: "scout",
  },

  // ══════════════════════════════════════════════════════
  // BLOG (2)
  // ══════════════════════════════════════════════════════
  {
    id: "sendBlogSubmittedForReview",
    name: "Blog Submitted for Review",
    category: "blog",
    description: "Sent to admin when a blog post is submitted for review",
    subject: "[Blog] Review requested: {postTitle} by {authorName}",
    from: "noreply@laborlawpartner.com",
    file: "src/lib/email-experts.ts",
    params: ["authorName", "postTitle"],
    recipient: "admin",
  },
  {
    id: "sendBlogPostPublished",
    name: "Blog Post Published",
    category: "blog",
    description: "Sent to author when their blog post is published",
    subject: "Your blog post is live: {postTitle}",
    from: "noreply@laborlawpartner.com",
    file: "src/lib/email-experts.ts",
    params: ["authorName", "authorEmail", "postTitle", "slug"],
    recipient: "user",
  },
];

// ─── Category definitions ─────────────────────────────────────────

function buildCategories() {
  const counts: Record<string, number> = {};
  for (const t of TEMPLATES) {
    counts[t.category] = (counts[t.category] || 0) + 1;
  }

  const labels: Record<string, string> = {
    consultation: "Consultation",
    service: "Service",
    onboarding: "Onboarding & Profile",
    expert: "Expert",
    headhunting: "Headhunting",
    blog: "Blog",
  };

  const order = ["consultation", "service", "onboarding", "expert", "headhunting", "blog"];
  return order
    .filter((id) => counts[id])
    .map((id) => ({ id, label: labels[id] || id, count: counts[id] }));
}

// ─── Sample Data ──────────────────────────────────────────────────

/* eslint-disable @typescript-eslint/no-explicit-any */
const SAMPLE_DATA: Record<string, Record<string, any>> = {
  // ── Consultation ──
  sendConsultationConfirmation: {
    requesterName: "Rahim Ahmed",
    requesterEmail: "rahim@example.com",
    expertArea: "Employment Contracts",
    urgency: "normal",
    description: "I need advice regarding the termination clause in my employment contract under Bangladesh Labour Act 2006, Section 26. My employer has given me 30 days notice but the contract states 60 days.",
  },
  sendConsultationAdminNotify: {
    requesterName: "Salma Begum",
    requesterEmail: "salma.begum@example.com",
    expertArea: "Workplace Safety & Compensation",
    urgency: "urgent",
    description: "A worker suffered a serious injury at our RMG factory in Gazipur. We need immediate guidance on the compensation requirements under Section 150 of the Labour Act 2006 and the 2013 Amendment provisions.",
  },
  sendConsultationConnected: {
    requesterName: "Kamal Hossain",
    requesterEmail: "kamal@example.com",
    expertName: "Adv. Nasreen Sultana",
    expertArea: "Trade Union & Collective Bargaining",
  },
  sendConsultationCompleted: {
    requesterName: "Mizanur Rahman",
    requesterEmail: "mizan@example.com",
    expertArea: "Wages & Benefits",
  },
  sendConsultationStatusUpdate: {
    requesterName: "Nusrat Jahan",
    requesterEmail: "nusrat@example.com",
    expertArea: "Maternity Benefits",
    newStatus: "reviewed",
    adminNotes: "Your request has been reviewed and we are assigning an expert who specializes in maternity benefit provisions under the 2013 Amendment.",
  },

  // ── Service ──
  sendServiceRequestConfirmation: {
    requesterName: "Tariq Islam",
    requesterEmail: "tariq.islam@example.com",
    serviceTitle: "Employment Contract Review",
    serviceCategory: "Legal Review",
    orderNumber: "SRV-2026-0142",
    description: "We need a comprehensive review of our standard employment contracts for compliance with the latest 2025 Ordinance provisions. We have 250+ employees across three factories in Dhaka and Chittagong.",
  },
  sendServiceRequestAdminNotify: {
    requesterName: "Farzana Akter",
    requesterEmail: "farzana@textilebd.com",
    serviceTitle: "Factory Compliance Audit",
    serviceCategory: "Compliance Audit",
    orderNumber: "SRV-2026-0143",
    description: "Full compliance audit needed for our new textile factory in Narayanganj. Opening in Q2 2026. Need to ensure all labour law provisions are met before starting operations.",
  },
  sendServiceStatusUpdate: {
    requesterName: "Abul Kalam",
    requesterEmail: "abul.kalam@example.com",
    serviceTitle: "HR Policy Document Preparation",
    orderNumber: "SRV-2026-0138",
    newStatus: "in_progress",
    adminNotes: "Our legal team has started drafting your HR policy document. Expected completion: 5 business days.",
  },

  // ── Onboarding & Profile ──
  sendWelcomeEmail: {
    userName: "Shabana Azmi",
    userEmail: "shabana@example.com",
  },
  sendProfileMilestone: {
    userName: "Imran Hossain",
    userEmail: "imran.hossain@example.com",
    milestone: 75,
  },
  sendProfileCompleted: {
    userName: "Ayesha Siddiqua",
    userEmail: "ayesha.siddiqua@example.com",
  },
  sendCvGenerated: {
    userName: "Rafiqul Islam",
    userEmail: "rafiqul@example.com",
  },
  sendResourcePublished: {
    resourceTitle: "Worker Safety Checklist for RMG Factories",
    fileName: "rmg-safety-checklist-2026.pdf",
    language: "en",
  },

  // ── Expert ──
  sendExpertApplicationConfirmation: {
    applicantName: "Adv. Tahmina Khatun",
    applicantEmail: "tahmina.khatun@example.com",
    specialization: "Labour Court Litigation & Dispute Resolution",
  },
  sendExpertApplicationAdminNotify: {
    applicantName: "Dr. Monir Uddin",
    applicantEmail: "monir.uddin@lawfirm.com",
    specialization: "Occupational Health & Safety Regulations",
  },
  sendExpertStatusUpdate: {
    applicantName: "Adv. Rashida Begum",
    applicantEmail: "rashida@lawchamber.com",
    status: "approved" as const,
    reason: "",
  },
  sendExpertProfilePublished: {
    expertName: "Adv. Shahidul Alam",
    expertEmail: "shahidul.alam@example.com",
  },
  sendExpertBadgeAwarded: {
    expertName: "Adv. Farida Yasmin",
    expertEmail: "farida.yasmin@example.com",
    badge: "Top Contributor 2026",
    awardedBy: "Platform Admin",
  },

  // ── Headhunting ──
  sendHiringRequestAcknowledgment: {
    recipientEmail: "hr@banglagarments.com",
    recipientName: "Fatima Hassan",
    assignmentName: "Senior Compliance Manager",
    department: "Compliance & Legal",
    urgency: "high",
    description: "Looking for a senior compliance manager with 8+ years experience in RMG sector compliance. Must have working knowledge of Bangladesh Labour Act 2006 and all amendments. BSCI/SEDEX audit experience preferred.",
  },
  sendMandateCreatedNotify: {
    mandateTitle: "Head of HR — Premium Textile Group",
    clientName: "Premium Textile Group Ltd.",
    source: "client_portal",
    urgency: "urgent",
    mandateType: "retained",
    assignedAgentEmail: "",
  },
  sendMandateStatusChanged: {
    mandateTitle: "Chief Financial Officer — Apex Holdings",
    clientName: "Apex Holdings Ltd.",
    oldStatus: "architecture",
    newStatus: "client_review",
    note: "Role brief has been drafted and sent for client approval. Key requirements include 15+ years experience in the manufacturing sector.",
    recipientEmail: "ceo@apexholdings.com",
    recipientName: "Zahir Uddin",
    mandateId: "mnd_abc123",
  },
  sendMandateClarificationNeeded: {
    mandateTitle: "Plant Manager — Delta Industries",
    clientName: "Delta Industries Ltd.",
    recipientEmail: "ops@deltaindustries.com",
    recipientName: "Anwar Hossain",
    questions: "1. What is the expected salary range for this position?\n2. Is relocation to Chittagong required or can it be hybrid?\n3. Do you require specific certifications (e.g., Six Sigma, Lean Manufacturing)?",
    mandateId: "mnd_def456",
  },
  sendMandateReleasedToScout: {
    scoutName: "Tanvir Alam",
    scoutEmail: "tanvir.scout@example.com",
    mandateTitle: "VP Engineering — Fintech Startup",
    roleTitle: "Vice President of Engineering",
    location: "Dhaka (Hybrid)",
    seniority: "VP / Director",
    disclosureLevel: "disclosed",
  },
  sendMandateClosedNotify: {
    scoutName: "Rezaul Karim",
    scoutEmail: "rezaul.scout@example.com",
    mandateTitle: "Senior Data Analyst — GrameenPhone",
    newStatus: "filled" as const,
    note: "The position has been filled with a candidate from your shortlist. Thank you for your excellent sourcing work!",
  },
  sendBriefReleasedNotify: {
    scoutName: "Sadia Rahman",
    scoutEmail: "sadia.scout@example.com",
    mandateTitle: "Country Manager — International NGO",
    compensationMode: "revenue_share",
    roleTitle: "Country Manager, Bangladesh",
    location: "Dhaka",
  },
  sendSubmissionReceivedScout: {
    scoutName: "Masud Rana",
    scoutEmail: "masud.scout@example.com",
    candidateName: "Zubair Ahmed Khan",
    mandateTitle: "Head of Digital Marketing — TechVentures",
  },
  sendSubmissionReceivedAdmin: {
    scoutName: "Masud Rana",
    candidateName: "Zubair Ahmed Khan",
    mandateTitle: "Head of Digital Marketing — TechVentures",
    mandateId: "mnd_ghi789",
  },
  sendSubmissionStatusChanged: {
    scoutName: "Nahid Hassan",
    scoutEmail: "nahid.scout@example.com",
    candidateName: "Rubina Akter",
    mandateTitle: "Finance Director — Shanta Holdings",
    oldStatus: "screened",
    newStatus: "shortlisted",
    rejectionReason: "",
  },
  sendPlacementCreatedNotify: {
    scoutName: "Shafiqul Islam",
    scoutEmail: "shafiq.scout@example.com",
    candidateName: "Ariful Haque",
    mandateTitle: "CTO — Digital Bangladesh Ltd.",
    clientName: "Digital Bangladesh Ltd.",
    salary: 350000,
    feeAmount: 840000,
  },
  sendPlacementJoinedNotify: {
    scoutName: "Shafiqul Islam",
    scoutEmail: "shafiq.scout@example.com",
    candidateName: "Ariful Haque",
    mandateTitle: "CTO — Digital Bangladesh Ltd.",
    clientName: "Digital Bangladesh Ltd.",
    feeAmount: 840000,
    protectionMonths: 3,
  },
  sendPayoutReleasedNotify: {
    scoutName: "Shafiqul Islam",
    scoutEmail: "shafiq.scout@example.com",
    candidateName: "Ariful Haque",
    rewardAmount: 252000,
  },
  sendReplacementTriggeredNotify: {
    recipientName: "Shafiqul Islam",
    recipientEmail: "shafiq.scout@example.com",
    candidateName: "Mahmud Ali",
    mandateTitle: "Supply Chain Director — Beximco Group",
    clientName: "Beximco Group",
    reason: "Candidate resigned within 45 days of joining. Protection clause applies per placement agreement.",
    mandateId: "mnd_jkl012",
  },

  // ── Blog ──
  sendBlogSubmittedForReview: {
    authorName: "Adv. Khaled Mahmud",
    postTitle: "Understanding the 2025 Labour Ordinance: Key Changes for Employers",
  },
  sendBlogPostPublished: {
    authorName: "Adv. Khaled Mahmud",
    authorEmail: "khaled.mahmud@lawfirm.com",
    postTitle: "Understanding the 2025 Labour Ordinance: Key Changes for Employers",
    slug: "understanding-2025-labour-ordinance-key-changes",
  },
};
/* eslint-enable @typescript-eslint/no-explicit-any */

// ─── HTML Renderer ────────────────────────────────────────────────
//
// Each case replicates the HTML generation logic of the corresponding
// template function but returns the HTML string instead of calling sendEmail.

/* eslint-disable @typescript-eslint/no-explicit-any */
function renderTemplate(id: string, data: Record<string, any>): string | null {
  switch (id) {
    // ── Consultation ────────────────────────────────────

    case "sendConsultationConfirmation":
      return emailLayout(`
        <p style="margin:0 0 16px;font-size:15px;">Hi ${data.requesterName},</p>
        <p style="margin:0 0 16px;color:#555;">Thank you for submitting a consultation request. Our team will review it and connect you with a qualified expert shortly.</p>
        ${infoBox(`
          <p style="margin:0 0 8px;"><strong>Area:</strong> ${data.expertArea}</p>
          <p style="margin:0 0 8px;"><strong>Urgency:</strong> ${data.urgency === "urgent" ? "\ud83d\udd34 Urgent" : "\ud83d\udfe2 Normal"}</p>
          <p style="margin:0;color:#555;font-size:13px;">${(data.description || "").slice(0, 300)}</p>
        `)}
        <p style="margin:16px 0 8px;color:#555;font-size:14px;">We typically respond within 24 hours for normal requests and 4 hours for urgent ones.</p>
        ${ctaButton("View Your Dashboard \u2192", `${SITE_URL}/dashboard`)}
      `);

    case "sendConsultationAdminNotify":
      return emailLayout(`
        <h2 style="margin:0 0 16px;font-size:18px;">\ud83d\udccb New Consultation Request</h2>
        ${infoBox(`
          <p style="margin:0 0 8px;"><strong>From:</strong> ${data.requesterName} (${data.requesterEmail})</p>
          <p style="margin:0 0 8px;"><strong>Area:</strong> ${data.expertArea}</p>
          <p style="margin:0 0 8px;"><strong>Urgency:</strong> ${data.urgency === "urgent" ? "\ud83d\udd34 URGENT" : "Normal"}</p>
          <p style="margin:0;color:#555;font-size:13px;">${(data.description || "").slice(0, 500)}</p>
        `)}
        ${ctaButton("Review in Admin \u2192", `${SITE_URL}/admin/consultations`)}
      `);

    case "sendConsultationConnected":
      return emailLayout(`
        <p style="margin:0 0 16px;font-size:15px;">Hi ${data.requesterName},</p>
        <p style="margin:0 0 16px;color:#555;">Your consultation request has been reviewed and an expert has been assigned to assist you.</p>
        ${infoBox(`
          <p style="margin:0 0 8px;"><strong>Expert:</strong> ${data.expertName}</p>
          <p style="margin:0;"><strong>Area:</strong> ${data.expertArea}</p>
        `)}
        <p style="margin:16px 0 8px;color:#555;font-size:14px;">The expert will reach out to you shortly. You can also view details in your dashboard.</p>
        ${ctaButton("View Dashboard \u2192", `${SITE_URL}/dashboard`)}
      `);

    case "sendConsultationCompleted":
      return emailLayout(`
        <p style="margin:0 0 16px;font-size:15px;">Hi ${data.requesterName},</p>
        <p style="margin:0 0 16px;color:#555;">Your consultation for <strong>${data.expertArea}</strong> has been marked as completed. We hope it was helpful!</p>
        <p style="margin:0 0 16px;color:#555;">Your feedback helps us improve and helps other users find the best experts.</p>
        ${ctaButton("Share Your Feedback \u2192", `${SITE_URL}/dashboard`)}
      `);

    case "sendConsultationStatusUpdate": {
      const statusMessages: Record<string, string> = {
        reviewed: "Your consultation request has been reviewed by our team.",
        connected: "An expert has been assigned to your consultation.",
        completed: "Your consultation has been completed.",
        cancelled: "Your consultation request has been cancelled.",
      };
      return emailLayout(`
        <p style="margin:0 0 16px;font-size:15px;">Hi ${data.requesterName},</p>
        <p style="margin:0 0 16px;color:#555;">${statusMessages[data.newStatus] || `Your consultation status is now: ${data.newStatus}.`}</p>
        ${infoBox(`
          <p style="margin:0 0 8px;"><strong>Area:</strong> ${data.expertArea}</p>
          <p style="margin:0;"><strong>Status:</strong> <span style="text-transform:capitalize;font-weight:600;">${data.newStatus}</span></p>
          ${data.adminNotes ? `<p style="margin:8px 0 0;color:#555;font-size:13px;"><strong>Note:</strong> ${data.adminNotes}</p>` : ""}
        `)}
        ${ctaButton("View Dashboard \u2192", `${SITE_URL}/dashboard`)}
      `);
    }

    // ── Service ─────────────────────────────────────────

    case "sendServiceRequestConfirmation":
      return emailLayout(`
        <p style="margin:0 0 16px;font-size:15px;">Hi ${data.requesterName},</p>
        <p style="margin:0 0 16px;color:#555;">Your service request has been received. We'll review it and get back to you shortly.</p>
        ${infoBox(`
          <p style="margin:0 0 8px;font-size:16px;font-weight:600;">${data.serviceTitle}</p>
          <p style="margin:0 0 8px;"><strong>Order #:</strong> ${data.orderNumber}</p>
          <p style="margin:0 0 8px;"><strong>Category:</strong> ${data.serviceCategory}</p>
          <p style="margin:0;color:#555;font-size:13px;">${(data.description || "").slice(0, 300)}</p>
        `)}
        ${ctaButton("View Your Dashboard \u2192", `${SITE_URL}/dashboard`)}
      `);

    case "sendServiceRequestAdminNotify":
      return emailLayout(`
        <h2 style="margin:0 0 16px;font-size:18px;">\ud83d\udece\ufe0f New Service Request</h2>
        ${infoBox(`
          <p style="margin:0 0 8px;"><strong>From:</strong> ${data.requesterName} (${data.requesterEmail})</p>
          <p style="margin:0 0 8px;font-size:16px;font-weight:600;">${data.serviceTitle}</p>
          <p style="margin:0 0 8px;"><strong>Order #:</strong> ${data.orderNumber}</p>
          <p style="margin:0 0 8px;"><strong>Category:</strong> ${data.serviceCategory}</p>
          <p style="margin:0;color:#555;font-size:13px;">${(data.description || "").slice(0, 500)}</p>
        `)}
        ${ctaButton("Review in Admin \u2192", `${SITE_URL}/admin/services`)}
      `);

    case "sendServiceStatusUpdate": {
      const svcMessages: Record<string, string> = {
        reviewed: "Your service request has been reviewed.",
        in_progress: "Your service request is now being worked on.",
        completed: "Your service request has been completed!",
        cancelled: "Your service request has been cancelled.",
      };
      return emailLayout(`
        <p style="margin:0 0 16px;font-size:15px;">Hi ${data.requesterName},</p>
        <p style="margin:0 0 16px;color:#555;">${svcMessages[data.newStatus] || `Service status updated to: ${data.newStatus}.`}</p>
        ${infoBox(`
          <p style="margin:0 0 8px;font-size:16px;font-weight:600;">${data.serviceTitle}</p>
          ${data.orderNumber ? `<p style="margin:0 0 8px;"><strong>Order #:</strong> ${data.orderNumber}</p>` : ""}
          <p style="margin:0;"><strong>Status:</strong> <span style="text-transform:capitalize;font-weight:600;">${(data.newStatus || "").replace(/_/g, " ")}</span></p>
          ${data.adminNotes ? `<p style="margin:8px 0 0;color:#555;font-size:13px;"><strong>Note:</strong> ${data.adminNotes}</p>` : ""}
        `)}
        ${data.newStatus === "completed"
          ? `<p style="margin:16px 0 8px;color:#555;font-size:14px;">We'd love to hear your feedback!</p>`
          : ""
        }
        ${ctaButton("View Dashboard \u2192", `${SITE_URL}/dashboard`)}
      `);
    }

    // ── Onboarding & Profile ────────────────────────────

    case "sendWelcomeEmail":
      return emailLayout(`
        <p style="margin:0 0 16px;font-size:15px;">Hi ${data.userName},</p>
        <p style="margin:0 0 16px;color:#555;">Welcome to <strong>Labor Law Partner</strong> \u2014 Bangladesh's AI-powered labour law compliance platform.</p>
        <p style="margin:0 0 16px;color:#555;">Here's what you can do:</p>
        <ul style="color:#555;font-size:14px;padding-left:20px;margin:0 0 16px;">
          <li style="margin-bottom:8px;"><strong>Ask questions</strong> about Bangladesh labour law using our AI chatbot</li>
          <li style="margin-bottom:8px;"><strong>Search jobs</strong> from LinkedIn, BdJobs, and more</li>
          <li style="margin-bottom:8px;"><strong>Build your profile</strong> and get AI-powered job recommendations</li>
          <li style="margin-bottom:8px;"><strong>Connect with experts</strong> for consultations</li>
        </ul>
        ${ctaButton("Get Started \u2192", `${SITE_URL}`)}
      `);

    case "sendProfileMilestone": {
      const tips: Record<number, string> = {
        50: "Add your work experience and education to get better job recommendations.",
        75: "Almost there! Add a profile photo and LinkedIn link to complete your profile.",
      };
      return emailLayout(`
        <p style="margin:0 0 16px;font-size:15px;">Hi ${data.userName},</p>
        <p style="margin:0 0 16px;color:#555;">Your professional profile is <strong>${data.milestone}% complete</strong>!</p>
        <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;padding:16px;margin:16px 0;text-align:center;">
          <div style="font-size:32px;font-weight:800;color:#16a34a;">${data.milestone}%</div>
          <div style="font-size:12px;color:#64748b;margin-top:4px;">Profile Completion</div>
        </div>
        <p style="margin:16px 0 8px;color:#555;font-size:14px;">${tips[data.milestone as number] || "Keep going!"}</p>
        ${ctaButton("Complete Your Profile \u2192", `${SITE_URL}/dashboard/profile`)}
      `);
    }

    case "sendProfileCompleted":
      return emailLayout(`
        <p style="margin:0 0 16px;font-size:15px;">Hi ${data.userName},</p>
        <p style="margin:0 0 16px;color:#555;">Congratulations! Your professional profile is now <strong style="color:#16a34a;">complete</strong>.</p>
        <p style="margin:0 0 16px;color:#555;">You'll now receive personalized job recommendations and can be discovered by recruiters on the platform.</p>
        ${ctaButton("View Your Profile \u2192", `${SITE_URL}/dashboard/profile`)}
      `);

    case "sendCvGenerated":
      return emailLayout(`
        <p style="margin:0 0 16px;font-size:15px;">Hi ${data.userName},</p>
        <p style="margin:0 0 16px;color:#555;">Your CV has been generated and saved to your profile. You can download it anytime from your dashboard.</p>
        ${ctaButton("View Your CV \u2192", `${SITE_URL}/dashboard/profile`)}
      `);

    case "sendResourcePublished":
      return emailLayout(`
        <h2 style="margin:0 0 16px;font-size:18px;">\ud83d\udcda New Resource Published</h2>
        <div style="background:#f8f8f9;border:1px solid #e5e7eb;border-radius:8px;padding:16px;margin:16px 0;">
          <p style="margin:0 0 8px;font-size:16px;font-weight:600;">${data.resourceTitle}</p>
          <p style="margin:0 0 4px;font-size:13px;color:#555;">File: ${data.fileName}</p>
          <p style="margin:0;font-size:13px;color:#555;">Language: ${(data.language || "en").toUpperCase()}</p>
        </div>
        ${ctaButton("View Resources \u2192", `${SITE_URL}/resources`)}
      `);

    // ── Expert ──────────────────────────────────────────

    case "sendExpertApplicationConfirmation":
      return emailLayout(`
        <p style="margin:0 0 16px;font-size:15px;">Hi ${data.applicantName},</p>
        <p style="margin:0 0 16px;color:#555;">Thank you for applying to join the Labor Law Partner Expert Network. Your application has been submitted for review.</p>
        ${infoBox(`
          <p style="margin:0 0 8px;"><strong>Specialization:</strong> ${data.specialization}</p>
          <p style="margin:0;color:#555;font-size:13px;">Our team reviews applications within 3\u20135 business days. You'll receive an email when a decision is made.</p>
        `)}
        ${ctaButton("View Your Profile \u2192", `${SITE_URL}/dashboard/profile`)}
      `);

    case "sendExpertApplicationAdminNotify":
      return emailLayout(`
        <h2 style="margin:0 0 16px;font-size:18px;">\ud83d\udc64 New Expert Application</h2>
        ${infoBox(`
          <p style="margin:0 0 8px;"><strong>Applicant:</strong> ${data.applicantName} (${data.applicantEmail})</p>
          <p style="margin:0;"><strong>Specialization:</strong> ${data.specialization}</p>
        `)}
        ${ctaButton("Review in Admin \u2192", `${SITE_URL}/admin/experts`)}
      `);

    case "sendExpertStatusUpdate": {
      const approved = data.status === "approved";
      return emailLayout(`
        <p style="margin:0 0 16px;font-size:15px;">Hi ${data.applicantName},</p>
        ${approved
          ? `<p style="margin:0 0 16px;color:#555;">Congratulations! Your application to the Labor Law Partner Expert Network has been <strong style="color:#16a34a;">approved</strong>.</p>
             <p style="margin:0 0 16px;color:#555;">Your profile is now live on our platform. You may receive consultation requests from users seeking your expertise.</p>
             ${ctaButton("View Your Expert Profile \u2192", `${SITE_URL}/experts`)}`
          : `<p style="margin:0 0 16px;color:#555;">After careful review, we're unable to approve your expert application at this time.</p>
             ${data.reason ? `<p style="margin:0 0 16px;color:#555;"><strong>Reason:</strong> ${data.reason}</p>` : ""}
             <p style="margin:0 0 16px;color:#555;">You're welcome to reapply with updated credentials. If you have questions, please reply to this email.</p>`
        }
      `);
    }

    case "sendExpertProfilePublished":
      return emailLayout(`
        <p style="margin:0 0 16px;font-size:15px;">Hi ${data.expertName},</p>
        <p style="margin:0 0 16px;color:#555;">Your expert profile is now <strong style="color:#16a34a;">live</strong> on the Labor Law Partner platform. Users can now find and connect with you.</p>
        ${ctaButton("View Your Profile \u2192", `${SITE_URL}/experts`)}
      `);

    case "sendExpertBadgeAwarded":
      return emailLayout(`
        <p style="margin:0 0 16px;font-size:15px;">Hi ${data.expertName},</p>
        <p style="margin:0 0 16px;color:#555;">You've been awarded a new badge on the Labor Law Partner platform!</p>
        <div style="background:#fefce8;border:2px solid #fde047;border-radius:10px;padding:20px;margin:16px 0;text-align:center;">
          <div style="font-size:32px;margin-bottom:8px;">\ud83c\udfc5</div>
          <div style="font-size:18px;font-weight:700;color:#0f172a;">${data.badge}</div>
          <div style="font-size:12px;color:#64748b;margin-top:4px;">Awarded by ${data.awardedBy}</div>
        </div>
        <p style="margin:16px 0 8px;color:#555;font-size:14px;">This badge is visible on your expert profile.</p>
        ${ctaButton("View Your Profile \u2192", `${SITE_URL}/experts`)}
      `);

    // ── Headhunting ─────────────────────────────────────

    case "sendHiringRequestAcknowledgment": {
      const urgencyLabel = data.urgency === "critical" ? "Critical" : data.urgency === "urgent" || data.urgency === "high" ? "Urgent" : "Standard";
      const urgencyIcon = data.urgency === "critical" ? "\ud83d\udd34" : data.urgency === "urgent" || data.urgency === "high" ? "\ud83d\udfe0" : "\ud83d\udfe2";
      return emailLayout(`
        <p style="margin:0 0 16px;font-size:15px;">Dear ${data.recipientName},</p>
        <p style="margin:0 0 16px;color:#333;font-size:14px;line-height:1.6;">
          Thank you for submitting your hiring request. We have received your requirement and our team will begin reviewing it shortly.
        </p>
        ${infoBox(`
          <p style="margin:0 0 12px;font-size:15px;font-weight:700;color:#0f172a;">Request Summary</p>
          <table style="width:100%;border-collapse:collapse;">
            <tr>
              <td style="padding:6px 0;font-size:13px;color:#64748b;width:120px;vertical-align:top;">Role Title</td>
              <td style="padding:6px 0;font-size:13px;font-weight:600;color:#0f172a;">${data.assignmentName}</td>
            </tr>
            ${data.department ? `<tr>
              <td style="padding:6px 0;font-size:13px;color:#64748b;vertical-align:top;">Department</td>
              <td style="padding:6px 0;font-size:13px;color:#0f172a;">${data.department}</td>
            </tr>` : ""}
            <tr>
              <td style="padding:6px 0;font-size:13px;color:#64748b;vertical-align:top;">Urgency</td>
              <td style="padding:6px 0;font-size:13px;color:#0f172a;">${urgencyIcon} ${urgencyLabel}</td>
            </tr>
            <tr>
              <td style="padding:6px 0;font-size:13px;color:#64748b;vertical-align:top;">Status</td>
              <td style="padding:6px 0;font-size:13px;">${statusBadge("received")}</td>
            </tr>
            ${data.description ? `<tr>
              <td style="padding:6px 0;font-size:13px;color:#64748b;vertical-align:top;">Description</td>
              <td style="padding:6px 0;font-size:13px;color:#334155;line-height:1.5;">${data.description}</td>
            </tr>` : ""}
          </table>
        `)}
        <p style="margin:0 0 8px;color:#333;font-size:14px;font-weight:600;">What happens next?</p>
        <table style="width:100%;border-collapse:collapse;margin-bottom:16px;">
          <tr>
            <td style="padding:8px 12px;font-size:13px;color:#0f172a;vertical-align:top;width:24px;">1.</td>
            <td style="padding:8px 0;font-size:13px;color:#334155;line-height:1.5;">Our headhunting team reviews your requirement and may reach out for clarification.</td>
          </tr>
          <tr>
            <td style="padding:8px 12px;font-size:13px;color:#0f172a;vertical-align:top;">2.</td>
            <td style="padding:8px 0;font-size:13px;color:#334155;line-height:1.5;">A detailed role brief is created and matched to our scout network.</td>
          </tr>
          <tr>
            <td style="padding:8px 12px;font-size:13px;color:#0f172a;vertical-align:top;">3.</td>
            <td style="padding:8px 0;font-size:13px;color:#334155;line-height:1.5;">You receive a curated shortlist of screened candidates.</td>
          </tr>
        </table>
        <p style="margin:0 0 20px;color:#555;font-size:13px;line-height:1.5;">
          You can track the status of your request at any time from your organization dashboard.
        </p>
        ${ctaButton("View Your Requests \u2192", `${SITE_URL}/org/hiring`)}
        <p style="margin:24px 0 0;color:#94a3b8;font-size:12px;line-height:1.5;">
          If you have any questions, reply to this email or contact us at <a href="mailto:${ADMIN_EMAIL}" style="color:#64748b;">${ADMIN_EMAIL}</a>.
        </p>
      `, "Headhunting & Talent Acquisition");
    }

    case "sendMandateCreatedNotify": {
      const urgencyIcon = data.urgency === "critical" ? "\ud83d\udd34" : data.urgency === "urgent" ? "\ud83d\udfe0" : "\ud83d\udfe2";
      return emailLayout(`
        <h2 style="margin:0 0 16px;font-size:18px;">\ud83d\udccb New Mandate Received</h2>
        ${infoBox(`
          <p style="margin:0 0 8px;font-size:16px;font-weight:600;">${data.mandateTitle}</p>
          <p style="margin:0 0 8px;"><strong>Client:</strong> ${data.clientName}</p>
          <p style="margin:0 0 8px;"><strong>Source:</strong> ${(data.source || "").replace(/_/g, " ")}</p>
          <p style="margin:0 0 8px;"><strong>Urgency:</strong> ${urgencyIcon} ${(data.urgency || "normal").toUpperCase()}</p>
          <p style="margin:0;"><strong>Type:</strong> ${(data.mandateType || "").replace(/_/g, " ")}</p>
        `)}
        <p style="margin:16px 0 8px;color:#555;font-size:14px;">This mandate requires initial review and role architecture.</p>
        ${ctaButton("Review Mandate \u2192", `${SITE_URL}/admin/headhunting`)}
      `, "Headhunting & Talent Acquisition");
    }

    case "sendMandateStatusChanged":
      return emailLayout(`
        <p style="margin:0 0 16px;font-size:15px;">Hi ${data.recipientName},</p>
        <p style="margin:0 0 16px;color:#555;">The mandate <strong>${data.mandateTitle}</strong> for ${data.clientName} has been updated.</p>
        ${infoBox(`
          <p style="margin:0 0 8px;"><strong>Status:</strong> ${statusBadge(data.oldStatus)} \u2192 ${statusBadge(data.newStatus)}</p>
          ${data.note ? `<p style="margin:8px 0 0;color:#555;font-size:13px;"><strong>Note:</strong> ${data.note}</p>` : ""}
        `)}
        ${ctaButton("View Mandate \u2192", `${SITE_URL}/admin/headhunting/${data.mandateId}`)}
      `, "Headhunting & Talent Acquisition");

    case "sendMandateClarificationNeeded":
      return emailLayout(`
        <p style="margin:0 0 16px;font-size:15px;">Hi ${data.recipientName},</p>
        <p style="margin:0 0 16px;color:#555;">We need additional information for the mandate <strong>${data.mandateTitle}</strong> (${data.clientName}) before we can proceed.</p>
        ${data.questions ? infoBox(`
          <p style="margin:0 0 8px;font-weight:600;">Clarification Needed:</p>
          <p style="margin:0;color:#555;font-size:13px;">${data.questions}</p>
        `) : ""}
        <p style="margin:16px 0 8px;color:#555;font-size:14px;">Please respond at your earliest convenience so we can move forward.</p>
        ${ctaButton("Respond to Clarification \u2192", `${SITE_URL}/headhunting/client`)}
      `, "Headhunting & Talent Acquisition");

    case "sendMandateReleasedToScout": {
      const disclosed = data.disclosureLevel === "disclosed";
      return emailLayout(`
        <p style="margin:0 0 16px;font-size:15px;">Hi ${data.scoutName},</p>
        <p style="margin:0 0 16px;color:#555;">A new headhunting opportunity has been released to you.</p>
        ${infoBox(`
          <p style="margin:0 0 8px;font-size:16px;font-weight:600;">${disclosed ? data.mandateTitle : "Confidential Role"}</p>
          ${data.roleTitle ? `<p style="margin:0 0 8px;"><strong>Role:</strong> ${data.roleTitle}</p>` : ""}
          ${data.location ? `<p style="margin:0 0 8px;"><strong>Location:</strong> ${data.location}</p>` : ""}
          ${data.seniority ? `<p style="margin:0;"><strong>Level:</strong> ${data.seniority}</p>` : ""}
        `)}
        <p style="margin:16px 0 8px;color:#555;font-size:14px;">Log in to view the full brief and start sourcing candidates.</p>
        ${ctaButton("View Brief \u2192", `${SITE_URL}/headhunting/scout`)}
      `, "Headhunting & Talent Acquisition");
    }

    case "sendMandateClosedNotify": {
      const statusMsgs: Record<string, string> = {
        filled: "has been successfully filled. Thank you for your contributions!",
        paused: "has been temporarily paused. We'll notify you when it resumes.",
        closed: "has been closed. No further submissions are needed.",
      };
      return emailLayout(`
        <p style="margin:0 0 16px;font-size:15px;">Hi ${data.scoutName},</p>
        <p style="margin:0 0 16px;color:#555;">The mandate <strong>${data.mandateTitle}</strong> ${statusMsgs[data.newStatus] || `status: ${data.newStatus}.`}</p>
        ${data.note ? infoBox(`<p style="margin:0;color:#555;font-size:13px;">${data.note}</p>`) : ""}
        ${ctaButton("View Your Dashboard \u2192", `${SITE_URL}/headhunting/scout`)}
      `, "Headhunting & Talent Acquisition");
    }

    case "sendBriefReleasedNotify": {
      const compLabel = data.compensationMode === "revenue_share" ? "Revenue Share" : "Fixed Bounty";
      return emailLayout(`
        <p style="margin:0 0 16px;font-size:15px;">Hi ${data.scoutName},</p>
        <p style="margin:0 0 16px;color:#555;">A new brief has been released to you for sourcing.</p>
        ${infoBox(`
          <p style="margin:0 0 8px;font-size:16px;font-weight:600;">${data.mandateTitle}</p>
          ${data.roleTitle ? `<p style="margin:0 0 8px;"><strong>Role:</strong> ${data.roleTitle}</p>` : ""}
          ${data.location ? `<p style="margin:0 0 8px;"><strong>Location:</strong> ${data.location}</p>` : ""}
          <p style="margin:0;"><strong>Compensation:</strong> ${compLabel}</p>
        `)}
        <p style="margin:16px 0 8px;color:#555;font-size:14px;">Review the brief details and start sourcing candidates.</p>
        ${ctaButton("View Brief Details \u2192", `${SITE_URL}/headhunting/scout`)}
      `, "Headhunting & Talent Acquisition");
    }

    case "sendSubmissionReceivedScout":
      return emailLayout(`
        <p style="margin:0 0 16px;font-size:15px;">Hi ${data.scoutName},</p>
        <p style="margin:0 0 16px;color:#555;">Your candidate submission has been received and is being reviewed.</p>
        ${infoBox(`
          <p style="margin:0 0 8px;"><strong>Candidate:</strong> ${data.candidateName}</p>
          <p style="margin:0;"><strong>Mandate:</strong> ${data.mandateTitle}</p>
        `)}
        <p style="margin:16px 0 8px;color:#555;font-size:14px;">You'll receive an update once the screening is complete.</p>
        ${ctaButton("View Submissions \u2192", `${SITE_URL}/headhunting/scout`)}
      `, "Headhunting & Talent Acquisition");

    case "sendSubmissionReceivedAdmin":
      return emailLayout(`
        <h2 style="margin:0 0 16px;font-size:18px;">\ud83d\udcc4 New Candidate Submission</h2>
        ${infoBox(`
          <p style="margin:0 0 8px;"><strong>Candidate:</strong> ${data.candidateName}</p>
          <p style="margin:0 0 8px;"><strong>Mandate:</strong> ${data.mandateTitle}</p>
          <p style="margin:0;"><strong>Submitted by:</strong> ${data.scoutName}</p>
        `)}
        ${ctaButton("Review Submission \u2192", `${SITE_URL}/admin/headhunting/${data.mandateId}`)}
      `, "Headhunting & Talent Acquisition");

    case "sendSubmissionStatusChanged": {
      const isPositive = ["shortlisted", "interview", "selected", "offer", "joined"].includes(data.newStatus);
      const isRejected = data.newStatus === "rejected";
      return emailLayout(`
        <p style="margin:0 0 16px;font-size:15px;">Hi ${data.scoutName},</p>
        <p style="margin:0 0 16px;color:#555;">
          ${isPositive
            ? `Great news! Your candidate <strong>${data.candidateName}</strong> has progressed to the next stage.`
            : isRejected
              ? `We have an update on your candidate <strong>${data.candidateName}</strong>.`
              : `Your candidate <strong>${data.candidateName}</strong> status has been updated.`
          }
        </p>
        ${infoBox(`
          <p style="margin:0 0 8px;"><strong>Mandate:</strong> ${data.mandateTitle}</p>
          <p style="margin:0 0 8px;"><strong>Status:</strong> ${statusBadge(data.oldStatus)} \u2192 ${statusBadge(data.newStatus)}</p>
          ${isRejected && data.rejectionReason ? `<p style="margin:8px 0 0;color:#555;font-size:13px;"><strong>Reason:</strong> ${data.rejectionReason}</p>` : ""}
        `)}
        ${ctaButton("View Details \u2192", `${SITE_URL}/headhunting/scout`)}
      `, "Headhunting & Talent Acquisition");
    }

    case "sendPlacementCreatedNotify":
      return emailLayout(`
        <p style="margin:0 0 16px;font-size:15px;">Hi ${data.scoutName},</p>
        <p style="margin:0 0 16px;color:#555;">\ud83c\udf89 Congratulations! A placement has been confirmed for your candidate.</p>
        ${infoBox(`
          <p style="margin:0 0 8px;font-size:16px;font-weight:600;">Placement Confirmed</p>
          <p style="margin:0 0 8px;"><strong>Candidate:</strong> ${data.candidateName}</p>
          <p style="margin:0 0 8px;"><strong>Mandate:</strong> ${data.mandateTitle}</p>
          <p style="margin:0 0 8px;"><strong>Client:</strong> ${data.clientName}</p>
          ${data.salary ? `<p style="margin:0 0 8px;"><strong>Salary:</strong> \u09F3${Number(data.salary).toLocaleString()}/month</p>` : ""}
          ${data.feeAmount ? `<p style="margin:0;"><strong>Fee:</strong> \u09F3${Number(data.feeAmount).toLocaleString()}</p>` : ""}
        `)}
        <p style="margin:16px 0 8px;color:#555;font-size:14px;">The protection window has started. You'll receive payout details shortly.</p>
        ${ctaButton("View Placement \u2192", `${SITE_URL}/headhunting/scout`)}
      `, "Headhunting & Talent Acquisition");

    case "sendPlacementJoinedNotify":
      return emailLayout(`
        <p style="margin:0 0 16px;font-size:15px;">Hi ${data.scoutName},</p>
        <p style="margin:0 0 16px;color:#555;">\u2705 <strong>${data.candidateName}</strong> has officially joined ${data.clientName}. The protection period is now active.</p>
        ${infoBox(`
          <p style="margin:0 0 8px;"><strong>Mandate:</strong> ${data.mandateTitle}</p>
          ${data.feeAmount ? `<p style="margin:0 0 8px;"><strong>Placement Fee:</strong> \u09F3${Number(data.feeAmount).toLocaleString()}</p>` : ""}
          ${data.protectionMonths ? `<p style="margin:0;"><strong>Protection Window:</strong> ${data.protectionMonths} months</p>` : ""}
        `)}
        <p style="margin:16px 0 8px;color:#555;font-size:14px;">Your payout will be processed once the protection window clears.</p>
        ${ctaButton("View Details \u2192", `${SITE_URL}/headhunting/scout`)}
      `, "Headhunting & Talent Acquisition");

    case "sendPayoutReleasedNotify":
      return emailLayout(`
        <p style="margin:0 0 16px;font-size:15px;">Hi ${data.scoutName},</p>
        <p style="margin:0 0 16px;color:#555;">\ud83d\udcb0 Your payout has been released!</p>
        ${infoBox(`
          <p style="margin:0 0 8px;"><strong>Candidate:</strong> ${data.candidateName}</p>
          <p style="margin:0;font-size:20px;font-weight:bold;color:#16a34a;">\u09F3${Number(data.rewardAmount).toLocaleString()}</p>
        `)}
        <p style="margin:16px 0 8px;color:#555;font-size:14px;">The payment will be processed according to your payment terms.</p>
        ${ctaButton("View Earnings \u2192", `${SITE_URL}/headhunting/scout`)}
      `, "Headhunting & Talent Acquisition");

    case "sendReplacementTriggeredNotify":
      return emailLayout(`
        <p style="margin:0 0 16px;font-size:15px;">Hi ${data.recipientName},</p>
        <p style="margin:0 0 16px;color:#555;">\u26a0\ufe0f A replacement has been triggered for <strong>${data.candidateName}</strong>.</p>
        ${infoBox(`
          <p style="margin:0 0 8px;"><strong>Mandate:</strong> ${data.mandateTitle}</p>
          <p style="margin:0 0 8px;"><strong>Client:</strong> ${data.clientName}</p>
          ${data.reason ? `<p style="margin:0;color:#555;font-size:13px;"><strong>Reason:</strong> ${data.reason}</p>` : ""}
        `)}
        <p style="margin:16px 0 8px;color:#555;font-size:14px;">The mandate has been re-opened for sourcing. All pending payouts are frozen pending resolution.</p>
        ${ctaButton("View Mandate \u2192", `${SITE_URL}/admin/headhunting/${data.mandateId}`)}
      `, "Headhunting & Talent Acquisition");

    // ── Blog ────────────────────────────────────────────

    case "sendBlogSubmittedForReview":
      return emailLayout(`
        <h2 style="margin:0 0 16px;font-size:18px;">\ud83d\udcdd Blog Post Submitted for Review</h2>
        ${infoBox(`
          <p style="margin:0 0 8px;font-size:16px;font-weight:600;">${data.postTitle}</p>
          <p style="margin:0;"><strong>Author:</strong> ${data.authorName}</p>
        `)}
        ${ctaButton("Review in Admin \u2192", `${SITE_URL}/admin/blog`)}
      `);

    case "sendBlogPostPublished":
      return emailLayout(`
        <p style="margin:0 0 16px;font-size:15px;">Hi ${data.authorName},</p>
        <p style="margin:0 0 16px;color:#555;">Your blog post has been <strong style="color:#16a34a;">published</strong>!</p>
        ${infoBox(`
          <p style="margin:0;font-size:16px;font-weight:600;">${data.postTitle}</p>
        `)}
        <p style="margin:16px 0 8px;color:#555;font-size:14px;">It's now live and visible to all users on the platform.</p>
        ${ctaButton("View Your Post \u2192", `${SITE_URL}/blog/${data.slug}`)}
      `);

    default:
      return null;
  }
}
/* eslint-enable @typescript-eslint/no-explicit-any */

// ─── Route Handler ────────────────────────────────────────────────

interface PublicMetadata {
  role?: string;
  [key: string]: unknown;
}

export async function GET(request: NextRequest) {
  // Auth: admin only
  const user = await currentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const role = (user.publicMetadata as PublicMetadata)?.role;
  if (role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const searchParams = request.nextUrl.searchParams;
  const action = searchParams.get("action") || "list";
  const id = searchParams.get("id");

  try {
    switch (action) {
      // ── List all templates ──
      case "list": {
        return NextResponse.json({
          templates: TEMPLATES,
          categories: buildCategories(),
          totalCount: TEMPLATES.length,
        });
      }

      // ── Render HTML preview ──
      case "preview": {
        if (!id) {
          return NextResponse.json({ error: "Missing 'id' parameter" }, { status: 400 });
        }

        const template = TEMPLATES.find((t) => t.id === id);
        if (!template) {
          return NextResponse.json({ error: `Unknown template: ${id}` }, { status: 404 });
        }

        // Use custom data from query string if provided, otherwise sample data
        const customDataParam = searchParams.get("data");
        let data = SAMPLE_DATA[id];
        if (customDataParam) {
          try {
            const customData = JSON.parse(customDataParam);
            data = { ...data, ...customData };
          } catch {
            // Ignore invalid JSON, use sample data
          }
        }

        if (!data) {
          return NextResponse.json(
            { error: `No sample data configured for template: ${id}` },
            { status: 404 }
          );
        }

        // If an admin override is saved for this template, preview it instead
        // so admins see exactly what recipients will get.
        const override = await getEmailOverride(id);
        if (override) {
          const rendered = renderOverride(override, data);
          return NextResponse.json({
            html: rendered.html,
            overridden: true,
            overrideSubject: rendered.subject,
          });
        }

        const html = renderTemplate(id, data);
        if (!html) {
          return NextResponse.json(
            { error: `Failed to render template: ${id}` },
            { status: 500 }
          );
        }

        // The frontend renders this in an <iframe srcDoc={previewHtml}> and
        // calls res.json() — return JSON with the html as a string field.
        // The legacy text/html response broke the client with "Unexpected
        // token '<'" because JSON.parse blew up on the DOCTYPE.
        return NextResponse.json({ html, overridden: false });
      }

      // ── Return sample data for editing ──
      case "sample": {
        if (!id) {
          return NextResponse.json({ error: "Missing 'id' parameter" }, { status: 400 });
        }

        const template = TEMPLATES.find((t) => t.id === id);
        if (!template) {
          return NextResponse.json({ error: `Unknown template: ${id}` }, { status: 404 });
        }

        const sampleData = SAMPLE_DATA[id];
        if (!sampleData) {
          return NextResponse.json(
            { error: `No sample data configured for template: ${id}` },
            { status: 404 }
          );
        }

        // Frontend reads `data.sample` (not `data.sampleData`) — keep both
        // keys for backwards-compatibility but `sample` is the canonical one.
        return NextResponse.json({
          template: {
            id: template.id,
            name: template.name,
            subject: template.subject,
            params: template.params,
          },
          sample: sampleData,
          sampleData,
        });
      }

      // ── Get current override (if any) + editor seed data ──
      case "override": {
        if (!id) {
          return NextResponse.json({ error: "Missing 'id' parameter" }, { status: 400 });
        }
        const template = TEMPLATES.find((t) => t.id === id);
        if (!template) {
          return NextResponse.json({ error: `Unknown template: ${id}` }, { status: 404 });
        }
        const override = await getEmailOverride(id);
        const sample = SAMPLE_DATA[id];
        const defaultHtml = sample ? renderTemplate(id, sample) : null;
        return NextResponse.json({
          templateId: id,
          name: template.name,
          defaultSubject: template.subject,
          defaultHtml,
          params: template.params,
          sample,
          override: override
            ? {
                html: override.html,
                subject: override.subject,
                updatedAt: override.updatedAt,
                updatedByClerkId: override.updatedByClerkId,
                updatedByEmail: override.updatedByEmail,
              }
            : null,
        });
      }

      // ── Return raw HTML + TS case-block source for a template ──
      case "source": {
        if (!id) {
          return NextResponse.json({ error: "Missing 'id' parameter" }, { status: 400 });
        }
        const template = TEMPLATES.find((t) => t.id === id);
        if (!template) {
          return NextResponse.json({ error: `Unknown template: ${id}` }, { status: 404 });
        }

        const data = SAMPLE_DATA[id];
        const html = data ? renderTemplate(id, data) : null;

        let tsSource: string | null = null;
        try {
          const routePath = path.join(
            process.cwd(),
            "src/app/api/admin/email-templates/route.ts"
          );
          const fileContent = await readFile(routePath, "utf8");
          // Match the case block for this template id inside renderTemplate().
          // Captures from `case "<id>":` up to the next `case "..."` or `default:`.
          const escaped = id.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
          const pattern = new RegExp(
            `(\\s*case\\s+"${escaped}":[\\s\\S]*?)(?=\\n\\s*case\\s+"|\\n\\s*default:)`,
            "m"
          );
          const match = fileContent.match(pattern);
          tsSource = match ? match[1].trimEnd() : null;
        } catch (e) {
          console.error("[email-templates source]", e);
        }

        return NextResponse.json({
          html,
          tsSource,
          filePath: template.file,
        });
      }

      default:
        return NextResponse.json(
          { error: `Unknown action: ${action}. Use 'list', 'preview', 'sample', 'source', or 'override'.` },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error("[email-templates]", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  const user = await currentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const role = (user.publicMetadata as PublicMetadata)?.role;
  if (role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let body: { action?: string; id?: string; data?: Record<string, unknown> };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { action, id, data: customData } = body;
  if (!action) {
    return NextResponse.json({ error: "Missing 'action' field" }, { status: 400 });
  }
  if (!id) {
    return NextResponse.json({ error: "Missing 'id' field" }, { status: 400 });
  }

  const template = TEMPLATES.find((t) => t.id === id);
  if (!template) {
    return NextResponse.json({ error: `Unknown template: ${id}` }, { status: 404 });
  }

  const mergedData = { ...(SAMPLE_DATA[id] || {}), ...(customData || {}) };

  try {
    switch (action) {
      case "preview": {
        if (!mergedData || Object.keys(mergedData).length === 0) {
          return NextResponse.json(
            { error: `No sample data configured for template: ${id}` },
            { status: 404 }
          );
        }
        // If client passed draft html/subject, render those instead of hitting
        // Convex — used by the editor for live preview before saving.
        const draftHtml = typeof (body as { draftHtml?: unknown }).draftHtml === "string"
          ? (body as { draftHtml: string }).draftHtml
          : null;
        const draftSubject = typeof (body as { draftSubject?: unknown }).draftSubject === "string"
          ? (body as { draftSubject: string }).draftSubject
          : null;

        if (draftHtml !== null) {
          const renderedHtml = sanitizeTemplateHtml(
            substituteTokens(draftHtml, mergedData)
          );
          const renderedSubject = draftSubject
            ? substituteTokens(draftSubject, mergedData)
            : template.subject;
          return NextResponse.json({
            html: renderedHtml,
            subject: renderedSubject,
            source: "draft",
          });
        }

        const override = await getEmailOverride(id);
        if (override) {
          const rendered = renderOverride(override, mergedData);
          return NextResponse.json({
            html: rendered.html,
            subject: rendered.subject,
            source: "override",
          });
        }

        const defaultHtml = renderTemplate(id, mergedData);
        if (!defaultHtml) {
          return NextResponse.json(
            { error: `Failed to render template: ${id}` },
            { status: 500 }
          );
        }
        return NextResponse.json({
          html: defaultHtml,
          subject: template.subject,
          source: "default",
        });
      }

      case "send-test": {
        if (!mergedData || Object.keys(mergedData).length === 0) {
          return NextResponse.json(
            { error: `No sample data configured for template: ${id}` },
            { status: 404 }
          );
        }
        const sentTo = user.emailAddresses?.[0]?.emailAddress;
        if (!sentTo) {
          return NextResponse.json(
            { error: "No email address on current admin account" },
            { status: 400 }
          );
        }

        const draftHtml = typeof (body as { draftHtml?: unknown }).draftHtml === "string"
          ? (body as { draftHtml: string }).draftHtml
          : null;
        const draftSubject = typeof (body as { draftSubject?: unknown }).draftSubject === "string"
          ? (body as { draftSubject: string }).draftSubject
          : null;

        let subject: string;
        let html: string;
        if (draftHtml !== null) {
          // Testing an unsaved draft from the editor.
          html = sanitizeTemplateHtml(substituteTokens(draftHtml, mergedData));
          subject = draftSubject
            ? substituteTokens(draftSubject, mergedData)
            : template.subject;
        } else {
          // Prefer override if saved, else render default.
          const override = await getEmailOverride(id);
          if (override) {
            const rendered = renderOverride(override, mergedData);
            subject = rendered.subject;
            html = rendered.html;
          } else {
            const defaultHtml = renderTemplate(id, mergedData);
            if (!defaultHtml) {
              return NextResponse.json(
                { error: `Failed to render template: ${id}` },
                { status: 500 }
              );
            }
            subject = template.subject;
            html = defaultHtml;
          }
        }

        const result = await sendEmail({
          to: sentTo,
          subject: `[TEST] ${subject}`,
          html,
          from: template.from,
        });
        if (!result.success) {
          return NextResponse.json(
            { error: result.error || "Failed to send test email" },
            { status: 500 }
          );
        }
        return NextResponse.json({ sentTo, id: result.id });
      }

      case "save-override": {
        const htmlDraft = (body as { html?: unknown }).html;
        const subjectDraft = (body as { subject?: unknown }).subject;
        if (typeof htmlDraft !== "string" || typeof subjectDraft !== "string") {
          return NextResponse.json(
            { error: "Missing 'html' and/or 'subject' in body" },
            { status: 400 }
          );
        }
        const cleanedHtml = sanitizeTemplateHtml(htmlDraft);
        const requiredTokens = template.params || [];
        const presentTokens = new Set([
          ...extractTokens(cleanedHtml),
          ...extractTokens(subjectDraft),
        ]);
        const missing = requiredTokens.filter((p) => !presentTokens.has(p));
        // Missing tokens are a warning, not a block — client may intentionally
        // drop a field. Surface them so the UI can flag it.

        const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;
        if (!convexUrl) {
          return NextResponse.json(
            { error: "Convex URL not configured" },
            { status: 500 }
          );
        }
        const client = new ConvexHttpClient(convexUrl);
        await client.mutation(api.emailTemplateOverrides.upsert, {
          templateId: id,
          html: cleanedHtml,
          subject: subjectDraft,
          updatedByClerkId: user.id,
          updatedByEmail: user.emailAddresses?.[0]?.emailAddress,
        });
        return NextResponse.json({
          saved: true,
          sanitizedHtml: cleanedHtml,
          missingTokens: missing,
        });
      }

      case "delete-override": {
        const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;
        if (!convexUrl) {
          return NextResponse.json(
            { error: "Convex URL not configured" },
            { status: 500 }
          );
        }
        const client = new ConvexHttpClient(convexUrl);
        await client.mutation(api.emailTemplateOverrides.remove, {
          templateId: id,
        });
        return NextResponse.json({ deleted: true });
      }

      default:
        return NextResponse.json(
          {
            error: `Unknown action: ${action}. Use 'preview', 'send-test', 'save-override', or 'delete-override'.`,
          },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error("[email-templates POST]", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
