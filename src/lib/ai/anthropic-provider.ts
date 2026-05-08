import Anthropic from "@anthropic-ai/sdk";
import type { AIProvider, GenerateOptions, GenerateResult } from "./types";
import { SYSTEM_PROMPT } from "./system-prompt";

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY!;

export class AnthropicProvider implements AIProvider {
  private model: string;
  private client: Anthropic;

  constructor(model: string = "claude-sonnet-4-6-20250514") {
    this.model = model;
    this.client = new Anthropic({ apiKey: ANTHROPIC_API_KEY });
  }

  async generateAnswer({
    query,
    context,
    history = [],
    systemPromptOverride,
    maxOutputTokens = 4096,
  }: GenerateOptions): Promise<GenerateResult> {
    const systemPrompt = systemPromptOverride ?? SYSTEM_PROMPT;

    const messages: Anthropic.MessageParam[] = [
      ...history.map((h) => ({
        role: (h.role === "user" ? "user" : "assistant") as "user" | "assistant",
        content: h.content,
      })),
      {
        role: "user" as const,
        content: context
          ? `Context:\n${context}\n\nQuestion: ${query}`
          : query,
      },
    ];

    const response = await this.client.messages.create({
      model: this.model,
      max_tokens: maxOutputTokens,
      system: systemPrompt,
      messages,
    });

    const answer =
      response.content
        .filter((block): block is Anthropic.TextBlock => block.type === "text")
        .map((block) => block.text)
        .join("") || "An error occurred processing your query.";

    return { answer };
  }

  async *streamAnswer({
    query,
    context,
    history = [],
    systemPromptOverride,
    maxOutputTokens = 4096,
  }: GenerateOptions): AsyncGenerator<string> {
    const systemPrompt = systemPromptOverride ?? SYSTEM_PROMPT;

    const messages: Anthropic.MessageParam[] = [
      ...history.map((h) => ({
        role: (h.role === "user" ? "user" : "assistant") as "user" | "assistant",
        content: h.content,
      })),
      {
        role: "user" as const,
        content: context
          ? `Context:\n${context}\n\nQuestion: ${query}`
          : query,
      },
    ];

    const stream = this.client.messages.stream({
      model: this.model,
      max_tokens: maxOutputTokens,
      system: systemPrompt,
      messages,
    });

    for await (const event of stream) {
      if (
        event.type === "content_block_delta" &&
        event.delta.type === "text_delta"
      ) {
        yield event.delta.text;
      }
    }
  }

  async translateToEnglish(_text: string): Promise<string> {
    throw new Error("Use GeminiProvider for Bangla translation");
  }
}
