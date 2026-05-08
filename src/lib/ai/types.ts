export interface GenerateOptions {
  query: string;
  context: string;
  history?: { role: string; content: string }[];
  systemPromptOverride?: string;
  maxOutputTokens?: number;
}

export interface GenerateResult {
  answer: string;
}

export interface AIProvider {
  generateAnswer(options: GenerateOptions): Promise<GenerateResult>;
  translateToEnglish(text: string): Promise<string>;
  streamAnswer?(options: GenerateOptions): AsyncGenerator<string>;
}

export interface EmbeddingProvider {
  getEmbedding(text: string): Promise<number[]>;
}
