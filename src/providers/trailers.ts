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

const finalBlock = (message: string): string[] => {
  const lines = message.split(/\r?\n/).map((line) => line.trimEnd());
  let end = lines.length;
  while (end > 0 && lines[end - 1] === "") end -= 1;
  let start = end;
  while (start > 0 && lines[start - 1] !== "") start -= 1;
  return lines.slice(start, end);
};

export const parseCoAuthors = (message: string): CoAuthor[] =>
  finalBlock(message)
    .map((line) => TRAILER_RE.exec(line))
    .filter((match): match is RegExpExecArray => match !== null)
    .map((match) => ({ name: match[1], email: match[2].trim() }));

const testStateless = (pattern: RegExp, value: string): boolean =>
  pattern.global || pattern.sticky
    ? new RegExp(pattern.source, pattern.flags.replace(/[gy]/g, "")).test(value)
    : pattern.test(value);

const matchesEmail = (email: string, expected: string | RegExp | undefined): boolean => {
  if (expected === undefined) return true;
  if (expected instanceof RegExp) return testStateless(expected, email);
  return email.toLowerCase() === expected.toLowerCase();
};

const matchesName = (name: string, expected: string | RegExp | undefined): boolean => {
  if (expected === undefined) return true;
  if (expected instanceof RegExp) return testStateless(expected, name);
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
