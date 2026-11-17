import { spawnSync } from "node:child_process";
import fs from "node:fs";

function run(command: string, args: string[]) {
  const result = spawnSync(command, args, {
    stdio: "inherit",
    shell: process.platform === "win32",
  });
  if (result.status !== 0) process.exit(result.status ?? 1);
}

const diff = spawnSync(
  "git",
  ["diff", "--cached", "--name-only", "--diff-filter=ACMR"],
  { encoding: "utf8" },
);
if (diff.status !== 0) process.exit(diff.status ?? 1);

const staged = diff.stdout
  .split(/\r?\n/)
  .map((file) => file.trim())
  .filter((file) => file.length > 0 && fs.existsSync(file));

if (staged.length > 0) {
  run("npx", ["prettier", "--ignore-unknown", "--write", ...staged]);
  const tsFiles = staged.filter(
    (file) =>
      (file.endsWith(".ts") || file.endsWith(".tsx")) &&
      !file.startsWith("supabase/functions/"),
  );
  if (tsFiles.length > 0) {
    run("npx", ["eslint", ...tsFiles]);
  }
  run("git", ["add", ...staged]);
}

run("npm", ["run", "typecheck"]);
run("npm", ["run", "lint:boundaries"]);
