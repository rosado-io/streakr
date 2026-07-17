import { execFile } from "node:child_process";
import { promisify } from "node:util";

import type { CliRunner } from "./types";

const execFileAsync = promisify(execFile);

export const MAX_BUFFER = 64 * 1024 * 1024;

const AUTH_ENVIRONMENT_KEYS = new Set([
  "GH_TOKEN",
  "GITHUB_TOKEN",
  "GH_ENTERPRISE_TOKEN",
  "GITHUB_ENTERPRISE_TOKEN",
  "GLAB_TOKEN",
  "GITLAB_TOKEN",
  "GITLAB_ACCESS_TOKEN",
  "OAUTH_TOKEN",
  "CI_JOB_TOKEN",
]);

export const runLocalCli: CliRunner = async (executable, args) => {
  const { stdout } = await execFileAsync(executable, [...args], {
    env: withoutAuthEnvironment(process.env),
    maxBuffer: MAX_BUFFER,
  });
  return stdout;
};

export const withoutAuthEnvironment = (environment: NodeJS.ProcessEnv): NodeJS.ProcessEnv =>
  Object.fromEntries(
    Object.entries(environment).filter(([key]) => !AUTH_ENVIRONMENT_KEYS.has(key)),
  );

export const parseCliJson = (provider: string, output: string): unknown => {
  try {
    return JSON.parse(output);
  } catch {
    throw new Error(`${provider} CLI returned invalid JSON`);
  }
};

export const runAuthenticatedCli = async (
  provider: string,
  loginHint: string,
  runner: CliRunner,
  executable: string,
  args: readonly string[],
): Promise<string> => {
  try {
    return await runner(executable, args);
  } catch (error) {
    const code = (error as NodeJS.ErrnoException).code;
    const missing = code === "ENOENT" ? ` Install ${executable} first.` : "";
    throw new Error(`${provider} CLI request failed.${missing} ${loginHint}`, { cause: error });
  }
};
