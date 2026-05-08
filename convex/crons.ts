// internal-only: this file registers scheduled cron jobs.
// No mutation/query/action is exported, so no client SDK surface
// to gate. The scheduled handler (api.headhunting.verification.expireOverdue)
// is itself an action whose own gate (or internalAction nature) handles auth.
import { cronJobs } from "convex/server";
import { api } from "./_generated/api";

const crons = cronJobs();

// Expire candidate verifications that are past 7-day window (every hour)
crons.interval("expire-verifications", { hours: 1 }, api.headhunting.verification.expireOverdue);

export default crons;
