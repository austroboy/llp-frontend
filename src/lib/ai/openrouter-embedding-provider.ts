import type { EmbeddingProvider } from "./types";

const OPENAI_API_KEY = process.env.OPENAI_API_KEY!;

export class OpenRouterEmbeddingProvider implements EmbeddingProvider {
  async getEmbedding(text: string): Promise<number[]> {
    const res = await fetch("https://api.openai.com/v1/embeddings", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        input: text,
        model: "text-embedding-3-small",
        dimensions: 768,
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`OpenAI embedding error ${res.status}: ${errText}`);
    }

    const data = await res.json();
    return data.data[0].embedding;
  }
}
