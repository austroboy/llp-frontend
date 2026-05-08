import type { AIProvider, EmbeddingProvider, GenerateOptions, GenerateResult } from "./types";
import { SYSTEM_PROMPT } from "./system-prompt";

const GEMINI_API_KEY = process.env.GEMINI_API_KEY!;

interface EmbeddingResponse {
  embedding: { values: number[] };
}

export class GeminiProvider implements AIProvider, EmbeddingProvider {
  private model: string;

  constructor(model: string = "gemini-2.5-flash") {
    this.model = model;
  }
  async getEmbedding(text: string): Promise<number[]> {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-embedding-001:embedContent?key=${GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: { parts: [{ text: text.slice(0, 8000) }] },
          outputDimensionality: 768,
        }),
      }
    );

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Gemini embedding error ${res.status}: ${errText}`);
    }

    const data: EmbeddingResponse = await res.json();
    return data.embedding.values;
  }

  async translateToEnglish(text: string): Promise<string> {
    try {
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${this.model}:generateContent?key=${GEMINI_API_KEY}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            generationConfig: {
              thinkingConfig: { thinkingBudget: 0 },
              maxOutputTokens: 256,
            },
            contents: [
              {
                role: "user",
                parts: [
                  {
                    text: `This is Bengali/Bangla text. Translate it to English. Reply with ONLY the English translation, no explanations.\n\nBengali: ${text}\nEnglish:`,
                  },
                ],
              },
            ],
          }),
        }
      );

      if (!res.ok) {
        console.error("[Translation] API error:", res.status);
        return text;
      }

      const data = await res.json();
      const translated = data.candidates?.[0]?.content?.parts
        ?.map((p: { text?: string }) => p.text)
        .join("")
        ?.trim();

      if (!translated) {
        console.error("[Translation] Empty response");
        return text;
      }

      console.log("[Translation]", text, "->", translated);
      return translated;
    } catch (err) {
      console.error("[Translation] Error:", err);
      return text;
    }
  }

  async *streamAnswer({
    query,
    context,
    history = [],
    systemPromptOverride,
    maxOutputTokens = 4096,
  }: GenerateOptions): AsyncGenerator<string> {
    const systemPrompt = systemPromptOverride ?? SYSTEM_PROMPT;
    const messages = [
      { role: "user", parts: [{ text: systemPrompt }] },
      ...history.map((h) => ({
        role: h.role === "user" ? "user" : "model",
        parts: [{ text: h.content }],
      })),
      {
        role: "user",
        parts: [
          {
            text: `CONTEXT FROM LLP UNIVERSE:\n${context}\n\nUSER QUESTION: ${query}`,
          },
        ],
      },
    ];

    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${this.model}:streamGenerateContent?key=${GEMINI_API_KEY}&alt=sse`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          generationConfig: {
            thinkingConfig: { thinkingBudget: 0 },
            maxOutputTokens,
          },
          contents: messages,
        }),
      }
    );

    if (!res.ok || !res.body) {
      const errText = await res.text();
      throw new Error(`Gemini streaming error ${res.status}: ${errText.slice(0, 200)}`);
    }

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop()!;

      for (const line of lines) {
        if (line.startsWith("data: ")) {
          try {
            const json = JSON.parse(line.slice(6));
            const text = json.candidates?.[0]?.content?.parts
              ?.map((p: { text?: string }) => p.text)
              .join("");
            if (text) yield text;
          } catch {
            // Skip malformed JSON lines
          }
        }
      }
    }

    // Process remaining buffer
    if (buffer.startsWith("data: ")) {
      try {
        const json = JSON.parse(buffer.slice(6));
        const text = json.candidates?.[0]?.content?.parts
          ?.map((p: { text?: string }) => p.text)
          .join("");
        if (text) yield text;
      } catch {
        // Skip
      }
    }
  }

  async generateAnswer({
    query,
    context,
    history = [],
    systemPromptOverride,
  }: GenerateOptions): Promise<GenerateResult> {
    const systemPrompt = systemPromptOverride ?? SYSTEM_PROMPT;
    const messages = [
      { role: "user", parts: [{ text: systemPrompt }] },
      ...history.map((h) => ({
        role: h.role === "user" ? "user" : "model",
        parts: [{ text: h.content }],
      })),
      {
        role: "user",
        parts: [
          {
            text: `CONTEXT FROM LLP UNIVERSE:\n${context}\n\nUSER QUESTION: ${query}`,
          },
        ],
      },
    ];

    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${this.model}:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          generationConfig: {
            thinkingConfig: { thinkingBudget: 0 },
            maxOutputTokens: 4096,
          },
          contents: messages,
        }),
      }
    );

    const data = await res.json();
    const answer =
      data.candidates?.[0]?.content?.parts
        ?.map((p: { text?: string }) => p.text)
        .join("") || "An error occurred processing your query.";

    return { answer };
  }
}
