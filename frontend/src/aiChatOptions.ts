/** Persisted chat agent options (shared by landing + conversation). */
export const AI_CHAT_OPTIONS_LS = "gut-ai-chat-options";

export type AIChatRequestOptions = {
  /** When false, backend must not call GLKB. Default true. */
  glkb: boolean;
};

export function readAIChatOptions(): AIChatRequestOptions {
  try {
    const raw = localStorage.getItem(AI_CHAT_OPTIONS_LS);
    if (!raw) return { glkb: true };
    const o = JSON.parse(raw) as unknown;
    if (o && typeof o === "object" && "glkb" in o) {
      return { glkb: (o as { glkb: unknown }).glkb !== false };
    }
  } catch {
    /* ignore */
  }
  return { glkb: true };
}

export function writeAIChatOptions(opts: AIChatRequestOptions) {
  localStorage.setItem(AI_CHAT_OPTIONS_LS, JSON.stringify(opts));
}

/** Human-readable names for optional tools enabled in the request (for UI under user messages). */
export function enabledToolLabels(opts: AIChatRequestOptions): string[] {
  const labels: string[] = [];
  if (opts.glkb) labels.push("GLKB literature");
  return labels;
}
