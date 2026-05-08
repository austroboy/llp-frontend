// Document catalog — maps DocType ids to full metadata.
// Source of truth: .claude.memory/project_post_chat_actions.md
// plus 2026-specific additions flagged with newIn2026.

import type { DocMetadata, DocType } from "./types";

export const DOC_CATALOG: Record<DocType, DocMetadata> = {
  "termination-notice": {
    id: "termination-notice",
    label: "Termination Notice",
    labelBn: "চাকরিচ্যুতির নোটিশ",
    description:
      "Formal notice of termination with statutory notice period and grounds.",
    perspective: ["employer", "hr"],
    sections: ["20", "26"],
    tierRequired: "mini",
    icon: "file-x",
  },
  "grievance-letter": {
    id: "grievance-letter",
    label: "Grievance Letter",
    labelBn: "অভিযোগপত্র",
    description:
      "Worker grievance filed with employer citing unlawful termination, wage, or conduct issues.",
    perspective: ["worker"],
    sections: ["20", "26", "33"],
    tierRequired: "mini",
    icon: "alert-triangle",
  },
  "show-cause-notice": {
    id: "show-cause-notice",
    label: "Show Cause Notice",
    labelBn: "কারণ দর্শানো নোটিশ",
    description:
      "Employer's notice asking a worker to explain alleged misconduct before disciplinary action.",
    perspective: ["employer", "hr"],
    sections: ["23", "24"],
    tierRequired: "mini",
    icon: "file-warning",
  },
  "defense-reply": {
    id: "defense-reply",
    label: "Defense Reply",
    labelBn: "আত্মপক্ষ সমর্থন",
    description:
      "Worker's written reply to a show cause notice, defending against misconduct allegations.",
    perspective: ["worker"],
    sections: ["23", "24"],
    tierRequired: "mini",
    icon: "shield",
  },
  "resignation-letter": {
    id: "resignation-letter",
    label: "Resignation Letter",
    labelBn: "পদত্যাগপত্র",
    description:
      "Worker's resignation letter with statutory notice period under Section 27.",
    perspective: ["worker"],
    sections: ["27"],
    tierRequired: "mini",
    icon: "log-out",
  },
  "leave-application": {
    id: "leave-application",
    label: "Leave Application",
    labelBn: "ছুটির আবেদন",
    description: "Worker's leave application under casual/sick/annual leave provisions.",
    perspective: ["worker"],
    sections: ["115", "116", "117"],
    tierRequired: "mini",
    icon: "calendar",
  },
  "salary-complaint": {
    id: "salary-complaint",
    label: "Salary Complaint Letter",
    labelBn: "বেতন সংক্রান্ত অভিযোগ",
    description:
      "Worker's complaint regarding unpaid or delayed wages under the wages chapter.",
    perspective: ["worker"],
    sections: ["121", "122", "123", "124", "125"],
    tierRequired: "mini",
    icon: "dollar-sign",
  },
  "maternity-leave-application": {
    id: "maternity-leave-application",
    label: "Maternity Leave Application",
    labelBn: "মাতৃত্বকালীন ছুটির আবেদন",
    description:
      "Maternity leave application with statutory benefit claim under Sections 45–47.",
    perspective: ["worker"],
    sections: ["45", "46", "47"],
    tierRequired: "mini",
    icon: "baby",
  },
  "appointment-letter": {
    id: "appointment-letter",
    label: "Appointment Letter",
    labelBn: "নিয়োগপত্র",
    description:
      "Formal appointment letter issued to a worker under Section 5 with service terms.",
    perspective: ["employer", "hr"],
    sections: ["5"],
    tierRequired: "mini",
    icon: "file-plus",
  },
  "service-certificate": {
    id: "service-certificate",
    label: "Service Certificate",
    labelBn: "সার্ভিস সার্টিফিকেট",
    description:
      "Service certificate issued to a worker on termination/resignation under Section 31.",
    perspective: ["employer", "worker", "hr"],
    sections: ["31"],
    tierRequired: "mini",
    icon: "award",
  },
  "domestic-worker-contract": {
    id: "domestic-worker-contract",
    label: "Domestic Worker Contract",
    labelBn: "গৃহকর্মী চুক্তিপত্র",
    description:
      "Written contract for domestic workers per the 2026 amendment — covers scope, wages, rest, and termination.",
    perspective: ["employer", "hr", "worker"],
    sections: ["2(9b)", "307A", "307B"],
    newIn2026: true,
    tierRequired: "mini",
    icon: "home",
  },
  "forced-labour-self-audit": {
    id: "forced-labour-self-audit",
    label: "Forced Labour Self-Audit",
    labelBn: "জোরপূর্বক শ্রম স্ব-নিরীক্ষা",
    description:
      "Employer self-audit checklist for forced-labour indicators under the 2026 amendment.",
    perspective: ["employer", "hr"],
    sections: ["2(12a)", "307B", "345C"],
    newIn2026: true,
    tierRequired: "mini",
    icon: "clipboard-check",
  },
  "harassment-committee-sop": {
    id: "harassment-committee-sop",
    label: "Harassment Committee SOP",
    labelBn: "হয়রানি প্রতিরোধ কমিটির এসওপি",
    description:
      "Standard operating procedure for the statutory anti-harassment committee (Sections 332, 332A).",
    perspective: ["employer", "hr"],
    sections: ["332", "332A"],
    newIn2026: true,
    tierRequired: "mini",
    icon: "users",
  },
  "equal-pay-audit": {
    id: "equal-pay-audit",
    label: "Equal Pay Audit",
    labelBn: "সমান মজুরি নিরীক্ষা",
    description:
      "Equal-pay-for-equal-work audit template under Sections 345 and 345B.",
    perspective: ["employer", "hr"],
    sections: ["345", "345B"],
    newIn2026: true,
    tierRequired: "mini",
    icon: "scale",
  },
  "pragati-opt-in-notice": {
    id: "pragati-opt-in-notice",
    label: "Pragati Opt-In Notice",
    labelBn: "প্রগতি স্কিমে অন্তর্ভুক্তির নোটিশ",
    description:
      "Employer notice opting workers into the Pragati provident-fund scheme under Section 264.",
    perspective: ["employer", "hr"],
    sections: ["264"],
    newIn2026: true,
    tierRequired: "mini",
    icon: "piggy-bank",
  },
};
