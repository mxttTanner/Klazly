import "server-only";
import { randomInt } from "node:crypto";

// Unambiguous alphabet — no 0/O/1/l/I — so an admin can read a temp
// password aloud over Zalo without confusion.
const ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789";

/**
 * Generate a readable temporary password for an admin-initiated reset.
 * 12 chars (well over the 8-char auth minimum), CSPRNG-backed.
 */
export function generateTempPassword(length = 12): string {
  let out = "";
  for (let i = 0; i < length; i++) {
    out += ALPHABET[randomInt(ALPHABET.length)];
  }
  return out;
}
