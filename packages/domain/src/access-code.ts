// Node-only entry point, shared by the two server applications.
import {
  randomBytes,
  scrypt as derive,
  timingSafeEqual,
  createHash,
} from "node:crypto";
import { promisify } from "node:util";
const scrypt = promisify(derive);
export const digest = (value: string) =>
  createHash("sha256").update(value).digest("hex");
export async function hashCode(code: string) {
  const salt = randomBytes(16).toString("hex");
  const key = (await scrypt(code, salt, 64)) as Buffer;
  return `${salt}:${key.toString("hex")}`;
}
export async function verifyCode(code: string, encoded: string | null) {
  if (!encoded) return false;
  const [salt, key] = encoded.split(":");
  if (!salt || !key || !/^[a-f0-9]{128}$/.test(key)) return false;
  const candidate = (await scrypt(code, salt, 64)) as Buffer;
  return timingSafeEqual(candidate, Buffer.from(key, "hex"));
}
