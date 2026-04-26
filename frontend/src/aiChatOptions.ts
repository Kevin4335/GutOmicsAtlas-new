/** Persisted chat agent options (shared by landing + conversation). */
export const AI_CHAT_OPTIONS_LS = "gut-ai-chat-options";

export type AIChatRequestOptions = {
  /** When false, backend must not call GLKB. Default true. */
  glkb: boolean;
  /** When false, backend must not call Cell2Sentence. Default true. */
  c2s: boolean;
};

export function readAIChatOptions(): AIChatRequestOptions {
  try {
    const raw = localStorage.getItem(AI_CHAT_OPTIONS_LS);
    if (!raw) return { glkb: true, c2s: true };
    const o = JSON.parse(raw) as unknown;
    if (o && typeof o === "object") {
      return {
        glkb: (o as { glkb?: unknown }).glkb !== false,
        c2s: (o as { c2s?: unknown }).c2s !== false,
      };
    }
  } catch {
    /* ignore */
  }
  return { glkb: true, c2s: true };
}

export function writeAIChatOptions(opts: AIChatRequestOptions) {
  localStorage.setItem(AI_CHAT_OPTIONS_LS, JSON.stringify(opts));
}

/** Human-readable names for optional tools enabled in the request (for UI under user messages). */
export function enabledToolLabels(opts: AIChatRequestOptions): string[] {
  const labels: string[] = [];
  if (opts.glkb) labels.push("GLKB literature");
  if (opts.c2s) labels.push("Cell2Sentence");
  return labels;
}
