import { readFileSync } from "fs";
import { join } from "path";
import yaml from "js-yaml";

export interface DocumentFamily {
  name: string;
  description?: string;
  parent: string;
  registry_id?: string;
  amendments: string[];
  search_priority: string[];
  section_range?: string;
}

export interface DocumentGraph {
  families: Record<string, DocumentFamily>;
  routing_rules: {
    act_priority_keywords: string[];
    rules_priority_keywords: string[];
    default_family: string;
  };
}

let _graph: DocumentGraph | null = null;

export function getDocumentGraph(): DocumentGraph {
  if (_graph) return _graph;

  try {
    const filePath = join(process.cwd(), "src/data/document-graph.yaml");
    const raw = readFileSync(filePath, "utf-8");
    _graph = yaml.load(raw) as DocumentGraph;
    return _graph;
  } catch {
    // Fallback — hardcoded minimal graph
    _graph = {
      families: {
        labour_act: {
          name: "Labour Act Family",
          parent: "DOC-010",
          amendments: ["DOC-002", "DOC-003", "DOC-004", "DOC-005", "DOC-006"],
          search_priority: ["DOC-010", "DOC-006", "DOC-004", "DOC-005", "DOC-002", "DOC-003"],
        },
        labour_rules: {
          name: "Labour Rules Family",
          parent: "DOC-007",
          amendments: ["DOC-008"],
          search_priority: ["DOC-007", "DOC-008"],
        },
        standards: {
          name: "Standards",
          parent: "DOC-009",
          amendments: [],
          search_priority: ["DOC-009"],
        },
      },
      routing_rules: {
        act_priority_keywords: ["act", "terminate", "dismissal", "retrenchment", "provident fund", "maternity", "wages", "leave", "working hours", "trade union", "labour court", "compensation", "retirement", "safety"],
        rules_priority_keywords: ["rules", "form", "procedure", "license", "registration", "inspection", "schedule"],
        default_family: "labour_act",
      },
    };
    return _graph;
  }
}

/**
 * Determine which document family to prioritize based on query text.
 * Returns ordered list of document IDs to boost in search.
 */
export function getSearchPriority(query: string): {
  priorityDocs: string[];
  deprioritizeDocs: string[];
  family: string;
} {
  const graph = getDocumentGraph();
  const q = query.toLowerCase();

  // Check if query is about Rules specifically
  const isRules = graph.routing_rules.rules_priority_keywords.some(kw => q.includes(kw));
  // Check if query is about the Act
  const isAct = graph.routing_rules.act_priority_keywords.some(kw => q.includes(kw));

  if (isRules && !isAct) {
    return {
      priorityDocs: graph.families.labour_rules.search_priority,
      deprioritizeDocs: graph.families.labour_act.search_priority,
      family: "labour_rules",
    };
  }

  // Default: Act takes priority (most queries are about the Act)
  return {
    priorityDocs: [
      ...graph.families.labour_act.search_priority,
      ...graph.families.standards.search_priority,
    ],
    deprioritizeDocs: [], // Don't exclude rules, just don't boost them
    family: "labour_act",
  };
}
