import type { AIProvider, GenerateOptions, GenerateResult } from "./types";
import { SYSTEM_PROMPT } from "./system-prompt";

const OPENAI_API_KEY = process.env.OPENAI_API_KEY!;

export class OpenAIProvider implements AIProvider {
  private model: string;

  constructor(model: string = "gpt-4o") {
    this.model = model;
  }

  async translateToEnglish(text: string): Promise<string> {
    try {
      const res = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${OPENAI_API_KEY}`,
        },
        body: JSON.stringify({
          model: this.model,
          max_tokens: 256,
          messages: [
            {
              role: "user",
              content: `This is Bengali/Bangla text. Translate it to English. Reply with ONLY the English translation, no explanations.\n\nBengali: ${text}\nEnglish:`,
            },
          ],
        }),
      });

      if (!res.ok) {
        console.error("[OpenAI Translation] API error:", res.status);
        return text;
      }

      const data = await res.json();
      const translated = data.choices?.[0]?.message?.content?.trim();

      if (!translated) {
        console.error("[OpenAI Translation] Empty response");
        return text;
      }

      console.log("[OpenAI Translation]", text, "->", translated);
      return translated;
    } catch (err) {
      console.error("[OpenAI Translation] Error:", err);
      return text;
    }
  }

  async *streamAnswer({
    query,
    context,
    history = [],
    systemPromptOverride,
  }: GenerateOptions): AsyncGenerator<string> {
    const systemPrompt = systemPromptOverride ?? SYSTEM_PROMPT;
    const messages = [
      { role: "system" as const, content: systemPrompt },
      ...history.map((h) => ({
        role: (h.role === "user" ? "user" : "assistant") as "user" | "assistant",
        content: h.content,
      })),
      {
        role: "user" as const,
        content: `CONTEXT FROM LLP UNIVERSE:\n${context}\n\nUSER QUESTION: ${query}`,
      },
    ];

    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: this.model,
        max_tokens: 4096,
        stream: true,
        messages,
      }),
    });

    if (!res.ok || !res.body) {
      const errText = await res.text();
      throw new Error(`OpenAI streaming error ${res.status}: ${errText.slice(0, 200)}`);
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
        if (line.startsWith("data: ") && line !== "data: [DONE]") {
          try {
            const json = JSON.parse(line.slice(6));
            const text = json.choices?.[0]?.delta?.content;
            if (text) yield text;
          } catch {
            // Skip malformed lines
          }
        }
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
      { role: "system" as const, content: systemPrompt },
      ...history.map((h) => ({
        role: (h.role === "user" ? "user" : "assistant") as "user" | "assistant",
        content: h.content,
      })),
      {
        role: "user" as const,
        content: `CONTEXT FROM LLP UNIVERSE:\n${context}\n\nUSER QUESTION: ${query}`,
      },
    ];

    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: this.model,
        max_tokens: 4096,
        messages,
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      console.error("[OpenAI] API error:", res.status, errText);
      throw new Error(`OpenAI API error ${res.status}`);
    }

    const data = await res.json();
    const answer =
      data.choices?.[0]?.message?.content?.trim() ||
      "An error occurred processing your query.";

    return { answer };
  }
}
