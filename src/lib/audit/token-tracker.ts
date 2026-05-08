export interface ModelUsage {
  input: number;
  output: number;
  pages?: number;
}

// Prices per 1M tokens
const MODEL_PRICING: Record<string, { input: number; output: number }> = {
  "gemini-2.5-flash": { input: 0.15, output: 0.60 },
  "gemini-2.5-pro": { input: 1.25, output: 10.0 },
  "mistral-large-latest": { input: 2.0, output: 6.0 },
  "mistral-ocr-latest": { input: 0, output: 0 }, // page-based: $0.01/page
  "claude-opus-4-6": { input: 15.0, output: 75.0 },
  "text-embedding-3-small": { input: 0.02, output: 0 },
  "gemini-embedding-001": { input: 0.006, output: 0 },
};

// Mistral OCR: $0.01 per page
const OCR_COST_PER_PAGE = 0.01;

export class TokenTracker {
  private usage: Record<string, ModelUsage> = {};

  add(model: string, input: number, output: number, pages?: number) {
    if (!this.usage[model]) this.usage[model] = { input: 0, output: 0 };
    this.usage[model].input += input;
    this.usage[model].output += output;
    if (pages) this.usage[model].pages = (this.usage[model].pages || 0) + pages;
  }

  getUsage(): Record<string, ModelUsage> {
    return { ...this.usage };
  }

  calculateCost(): number {
    let total = 0;
    for (const [model, u] of Object.entries(this.usage)) {
      if (model === "mistral-ocr-latest") {
        total += (u.pages || 0) * OCR_COST_PER_PAGE;
      } else {
        const pricing = MODEL_PRICING[model];
        if (pricing) {
          total += (u.input / 1_000_000) * pricing.input;
          total += (u.output / 1_000_000) * pricing.output;
        }
      }
    }
    return total;
  }
}

export function formatTokens(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

export function formatCost(usd: number): string {
  if (usd === 0) return "$0";
  if (usd < 0.001) return `$${usd.toFixed(6)}`;
  if (usd < 0.01) return `$${usd.toFixed(4)}`;
  if (usd < 1) return `$${usd.toFixed(3)}`;
  return `$${usd.toFixed(2)}`;
}
