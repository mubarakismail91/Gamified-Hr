import { randomInt } from 'crypto';

const CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789'; // no 0/O/1/l/I — avoids transcription mistakes when an Admin reads it aloud/copies it

/** A one-time temporary password for a newly provisioned account — shown once, never stored in plaintext. */
export function generateTempPassword(length = 12): string {
  let out = '';
  for (let i = 0; i < length; i++) out += CHARS[randomInt(CHARS.length)];
  return out;
}
