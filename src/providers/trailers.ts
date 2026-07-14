export interface CoAuthor {
  name: string;
  email: string;
}

export interface AgentCoAuthor extends CoAuthor {
  key: string;
}

export interface AgentTrailerRule {
  key: string;
  email?: string | RegExp;
  name?: string | RegExp;
}

export const AGENT_TRAILER_RULES: readonly AgentTrailerRule[] = [
  { key: "claude", email: "noreply@anthropic.com" },
  { key: "codex", email: "noreply@openai.com" },
  { key: "opencode", email: "noreply@opencode.ai" },
  { key: "copilot", name: "copilot", email: /@users\.noreply\.github\.com$/i },
];

const TRAILER_RE = /^co-authored-by:\s*(.*?)\s*<([^<>]+)>$/i;

export const parseCoAuthors = (message: string): CoAuthor[] =>
  message
    .split(/\r?\n/)
    .map((line) => TRAILER_RE.exec(line.trim()))
    .filter((match): match is RegExpExecArray => match !== null)
    .map((match) => ({ name: match[1], email: match[2].trim() }));

const matchesEmail = (email: string, expected: string | RegExp | undefined): boolean => {
  if (expected === undefined) return true;
  if (expected instanceof RegExp) return expected.test(email);
  return email.toLowerCase() === expected.toLowerCase();
};

const matchesName = (name: string, expected: string | RegExp | undefined): boolean => {
  if (expected === undefined) return true;
  if (expected instanceof RegExp) return expected.test(name);
  return name.toLowerCase().includes(expected.toLowerCase());
};

export const matchAgent = (
  coAuthor: CoAuthor,
  rules: readonly AgentTrailerRule[] = AGENT_TRAILER_RULES,
): string | null => {
  const matched = rules.find(
    (rule) =>
      (rule.email !== undefined || rule.name !== undefined) &&
      matchesEmail(coAuthor.email, rule.email) &&
      matchesName(coAuthor.name, rule.name),
  );
  return matched?.key ?? null;
};

export const parseAgentCoAuthors = (
  message: string,
  rules: readonly AgentTrailerRule[] = AGENT_TRAILER_RULES,
): AgentCoAuthor[] =>
  parseCoAuthors(message).flatMap((coAuthor) => {
    const key = matchAgent(coAuthor, rules);
    return key === null ? [] : [{ ...coAuthor, key }];
  });
