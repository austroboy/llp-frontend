/**
 * Topic-to-section mapping for Bangladesh Labour Act queries.
 * Maps common query topics to relevant section numbers for targeted retrieval.
 */

const TOPIC_MAP: { keywords: string[]; sections: string[] }[] = [
  { keywords: ["wages", "wage", "salary", "মজুরি"], sections: ["2", "120", "121", "122", "124"] },
  { keywords: ["maternity", "মাতৃত্ব", "pregnant", "গর্ভবতী"], sections: ["45", "46", "47", "48", "49", "50"] },
  { keywords: ["termination", "চাকরির অবসান"], sections: ["26", "27", "28"] },
  { keywords: ["dismissal", "বরখাস্ত"], sections: ["23", "24", "25"] },
  { keywords: ["retrenchment", "ছাঁটাই"], sections: ["20", "21"] },
  { keywords: ["layoff", "lay-off", "lay off", "লে-অফ"], sections: ["16", "17", "18", "19"] },
  { keywords: ["provident fund", "ভবিষ্য তহবিল"], sections: ["264", "265", "266"] },
  { keywords: ["gratuity", "গ্র্যাচুইটি"], sections: ["28", "26"] },
  { keywords: ["overtime", "ওভারটাইম"], sections: ["108", "100", "102"] },
  { keywords: ["working hours", "কর্মঘন্টা"], sections: ["100", "101", "102", "103"] },
  { keywords: ["leave", "ছুটি"], sections: ["115", "116", "117", "118"] },
  { keywords: ["trade union", "ট্রেড ইউনিয়ন"], sections: ["176", "177", "178", "179"] },
  { keywords: ["labour court", "labor court", "শ্রম আদালত"], sections: ["213", "214", "215"] },
  { keywords: ["compensation", "ক্ষতিপূরণ"], sections: ["150", "151", "152"] },
  { keywords: ["child labour", "child labor", "শিশু শ্রম"], sections: ["34", "35", "36", "37", "38"] },
  { keywords: ["safety", "নিরাপত্তা"], sections: ["61", "62", "63", "64", "65", "88"] },
  { keywords: ["equal pay", "সমান মজুরি"], sections: ["345"] },
  { keywords: ["probation", "শিক্ষানবিশ"], sections: ["4"] },
];

export function getTopicSections(query: string): string[] {
  const lowerQuery = query.toLowerCase();
  const matched = new Set<string>();

  for (const topic of TOPIC_MAP) {
    for (const keyword of topic.keywords) {
      if (lowerQuery.includes(keyword.toLowerCase())) {
        for (const section of topic.sections) matched.add(section);
        break;
      }
    }
  }

  return Array.from(matched);
}
