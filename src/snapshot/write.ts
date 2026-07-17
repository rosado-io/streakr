import { randomUUID } from "node:crypto";
import { mkdir, rename, rm, writeFile } from "node:fs/promises";
import { basename, dirname, join } from "node:path";

import type { PublicStreakrSnapshot } from "./create";

export const writePublicSnapshot = async (
  outputPath: string,
  snapshot: PublicStreakrSnapshot,
): Promise<void> => {
  const directory = dirname(outputPath);
  await mkdir(directory, { recursive: true });
  const temporary = join(directory, `.${basename(outputPath)}.${randomUUID()}.tmp`);
  try {
    await writeFile(temporary, `${JSON.stringify(snapshot, null, 2)}\n`, {
      encoding: "utf8",
      mode: 0o600,
    });
    await rename(temporary, outputPath);
  } finally {
    await rm(temporary, { force: true });
  }
};
