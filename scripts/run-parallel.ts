// Runs npm scripts concurrently with buffered, prefixed output.
// Prints full output only for failures (or for every script when VERBOSE=1).
import { spawn } from "node:child_process";

const scripts = process.argv.slice(2);
if (scripts.length === 0) {
  console.error("usage: tsx scripts/run-parallel.ts <npm-script> [...]");
  process.exit(2);
}

function run(name: string): Promise<number> {
  const started = Date.now();
  return new Promise((resolve) => {
    // A single command string with shell:true avoids Node's DEP0190 warning.
    const child = spawn(`npm run --silent ${name}`, {
      shell: true,
      env: { ...process.env, FORCE_COLOR: process.env.FORCE_COLOR ?? "1" },
    });
    const chunks: Buffer[] = [];
    child.stdout.on("data", (chunk: Buffer) => chunks.push(chunk));
    child.stderr.on("data", (chunk: Buffer) => chunks.push(chunk));
    child.on("error", (error) => chunks.push(Buffer.from(String(error))));
    child.on("close", (code) => {
      const ok = code === 0;
      const seconds = ((Date.now() - started) / 1000).toFixed(1);
      console.log(`${ok ? "PASS" : "FAIL"} ${name} (${seconds}s)`);
      const output = Buffer.concat(chunks).toString().trimEnd();
      if (output && (!ok || process.env.VERBOSE)) {
        console.log(output.replace(/^/gm, `[${name}] `));
      }
      resolve(code ?? 1);
    });
  });
}

const codes = await Promise.all(scripts.map(run));
const failed = scripts.filter((_, index) => codes[index] !== 0);
if (failed.length > 0) {
  console.error(`\nFailed: ${failed.join(", ")}`);
  process.exit(1);
}
