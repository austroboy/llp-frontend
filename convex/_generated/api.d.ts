/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as _lib_auth from "../_lib/auth.js";
import type * as approvalRequests from "../approvalRequests.js";
import type * as blogPosts from "../blogPosts.js";
import type * as consultationRequests from "../consultationRequests.js";
import type * as controlTower from "../controlTower.js";
import type * as crons from "../crons.js";
import type * as dashboard from "../dashboard.js";
import type * as emailTemplateOverrides from "../emailTemplateOverrides.js";
import type * as expertApplications from "../expertApplications.js";
import type * as expertBadges from "../expertBadges.js";
import type * as experts from "../experts.js";
import type * as files from "../files.js";
import type * as headhunting_analytics from "../headhunting/analytics.js";
import type * as headhunting_applicant from "../headhunting/applicant.js";
import type * as headhunting_auditLog from "../headhunting/auditLog.js";
import type * as headhunting_blueprintAuditLog from "../headhunting/blueprintAuditLog.js";
import type * as headhunting_blueprints from "../headhunting/blueprints.js";
import type * as headhunting_briefRelease from "../headhunting/briefRelease.js";
import type * as headhunting_briefs from "../headhunting/briefs.js";
import type * as headhunting_candidateApply from "../headhunting/candidateApply.js";
import type * as headhunting_candidateAssessment from "../headhunting/candidateAssessment.js";
import type * as headhunting_clarifications from "../headhunting/clarifications.js";
import type * as headhunting_clientLeads from "../headhunting/clientLeads.js";
import type * as headhunting_clients from "../headhunting/clients.js";
import type * as headhunting_collab from "../headhunting/collab.js";
import type * as headhunting_config from "../headhunting/config.js";
import type * as headhunting_conflicts from "../headhunting/conflicts.js";
import type * as headhunting_hiringAssignments from "../headhunting/hiringAssignments.js";
import type * as headhunting_mandates from "../headhunting/mandates.js";
import type * as headhunting_matching from "../headhunting/matching.js";
import type * as headhunting_notifications from "../headhunting/notifications.js";
import type * as headhunting_opportunities from "../headhunting/opportunities.js";
import type * as headhunting_originProtection from "../headhunting/originProtection.js";
import type * as headhunting_payments from "../headhunting/payments.js";
import type * as headhunting_placements from "../headhunting/placements.js";
import type * as headhunting_requirementMatrix from "../headhunting/requirementMatrix.js";
import type * as headhunting_roleGroups from "../headhunting/roleGroups.js";
import type * as headhunting_roles from "../headhunting/roles.js";
import type * as headhunting_routing from "../headhunting/routing.js";
import type * as headhunting_scoutGroups from "../headhunting/scoutGroups.js";
import type * as headhunting_scoutIntelligence from "../headhunting/scoutIntelligence.js";
import type * as headhunting_scoutProfiles from "../headhunting/scoutProfiles.js";
import type * as headhunting_scoutQueue from "../headhunting/scoutQueue.js";
import type * as headhunting_scouts from "../headhunting/scouts.js";
import type * as headhunting_screening from "../headhunting/screening.js";
import type * as headhunting_suggestions from "../headhunting/suggestions.js";
import type * as headhunting_verification from "../headhunting/verification.js";
import type * as intentLogs from "../intentLogs.js";
import type * as invoices from "../invoices.js";
import type * as lib_adminGuard from "../lib/adminGuard.js";
import type * as lib_orgGuard from "../lib/orgGuard.js";
import type * as notifications from "../notifications.js";
import type * as orgServiceRequests from "../orgServiceRequests.js";
import type * as organizations from "../organizations.js";
import type * as payments from "../payments.js";
import type * as personalServiceRequests from "../personalServiceRequests.js";
import type * as professionalProfiles from "../professionalProfiles.js";
import type * as quickQuestions from "../quickQuestions.js";
import type * as savedItems from "../savedItems.js";
import type * as serviceProducts from "../serviceProducts.js";
import type * as serviceRequests from "../serviceRequests.js";
import type * as templates from "../templates.js";
import type * as tierConfig from "../tierConfig.js";
import type * as tokenUsage from "../tokenUsage.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  "_lib/auth": typeof _lib_auth;
  approvalRequests: typeof approvalRequests;
  blogPosts: typeof blogPosts;
  consultationRequests: typeof consultationRequests;
  controlTower: typeof controlTower;
  crons: typeof crons;
  dashboard: typeof dashboard;
  emailTemplateOverrides: typeof emailTemplateOverrides;
  expertApplications: typeof expertApplications;
  expertBadges: typeof expertBadges;
  experts: typeof experts;
  files: typeof files;
  "headhunting/analytics": typeof headhunting_analytics;
  "headhunting/applicant": typeof headhunting_applicant;
  "headhunting/auditLog": typeof headhunting_auditLog;
  "headhunting/blueprintAuditLog": typeof headhunting_blueprintAuditLog;
  "headhunting/blueprints": typeof headhunting_blueprints;
  "headhunting/briefRelease": typeof headhunting_briefRelease;
  "headhunting/briefs": typeof headhunting_briefs;
  "headhunting/candidateApply": typeof headhunting_candidateApply;
  "headhunting/candidateAssessment": typeof headhunting_candidateAssessment;
  "headhunting/clarifications": typeof headhunting_clarifications;
  "headhunting/clientLeads": typeof headhunting_clientLeads;
  "headhunting/clients": typeof headhunting_clients;
  "headhunting/collab": typeof headhunting_collab;
  "headhunting/config": typeof headhunting_config;
  "headhunting/conflicts": typeof headhunting_conflicts;
  "headhunting/hiringAssignments": typeof headhunting_hiringAssignments;
  "headhunting/mandates": typeof headhunting_mandates;
  "headhunting/matching": typeof headhunting_matching;
  "headhunting/notifications": typeof headhunting_notifications;
  "headhunting/opportunities": typeof headhunting_opportunities;
  "headhunting/originProtection": typeof headhunting_originProtection;
  "headhunting/payments": typeof headhunting_payments;
  "headhunting/placements": typeof headhunting_placements;
  "headhunting/requirementMatrix": typeof headhunting_requirementMatrix;
  "headhunting/roleGroups": typeof headhunting_roleGroups;
  "headhunting/roles": typeof headhunting_roles;
  "headhunting/routing": typeof headhunting_routing;
  "headhunting/scoutGroups": typeof headhunting_scoutGroups;
  "headhunting/scoutIntelligence": typeof headhunting_scoutIntelligence;
  "headhunting/scoutProfiles": typeof headhunting_scoutProfiles;
  "headhunting/scoutQueue": typeof headhunting_scoutQueue;
  "headhunting/scouts": typeof headhunting_scouts;
  "headhunting/screening": typeof headhunting_screening;
  "headhunting/suggestions": typeof headhunting_suggestions;
  "headhunting/verification": typeof headhunting_verification;
  intentLogs: typeof intentLogs;
  invoices: typeof invoices;
  "lib/adminGuard": typeof lib_adminGuard;
  "lib/orgGuard": typeof lib_orgGuard;
  notifications: typeof notifications;
  orgServiceRequests: typeof orgServiceRequests;
  organizations: typeof organizations;
  payments: typeof payments;
  personalServiceRequests: typeof personalServiceRequests;
  professionalProfiles: typeof professionalProfiles;
  quickQuestions: typeof quickQuestions;
  savedItems: typeof savedItems;
  serviceProducts: typeof serviceProducts;
  serviceRequests: typeof serviceRequests;
  templates: typeof templates;
  tierConfig: typeof tierConfig;
  tokenUsage: typeof tokenUsage;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {};
