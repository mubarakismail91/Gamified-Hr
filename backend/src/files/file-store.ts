import type { Response } from 'express';
import type { Prisma, PrismaClient } from '@prisma/client';

type Db = Prisma.TransactionClient | PrismaClient;

/**
 * The uploaded file's real name. Multer (busboy) decodes multipart file names as Latin-1, which turns
 * Arabic (or any non-Latin) names into mojibake ("ØªÙ..."); re-decode the bytes as UTF-8.
 */
export function uploadedFileName(file: Express.Multer.File): string {
  const utf8 = Buffer.from(file.originalname, 'latin1').toString('utf8');
  return utf8.includes('\uFFFD') ? file.originalname : utf8; // already-correct names stay as they are
}

/** Saves an uploaded file's contents (multer memory storage) and returns the new StoredFile id. */
export async function storeUpload(db: Db, file: Express.Multer.File): Promise<string> {
  const stored = await db.storedFile.create({
    data: { data: new Uint8Array(file.buffer), mimeType: file.mimetype || 'application/octet-stream', size: file.size },
    select: { id: true },
  });
  return stored.id;
}

/** Sends a stored file as a download, with a safe, UTF-8 file name (Arabic names included). */
export async function sendStoredFile(db: Db, res: Response, fileId: string, fileName: string): Promise<void> {
  const file = await db.storedFile.findUniqueOrThrow({ where: { id: fileId } });
  const ascii = fileName.replace(/[^\x20-\x7e]|["\\]/g, '_');
  res.setHeader('Content-Type', file.mimeType);
  res.setHeader('Content-Length', String(file.size));
  res.setHeader('Content-Disposition', `attachment; filename="${ascii}"; filename*=UTF-8''${encodeURIComponent(fileName)}`);
  res.setHeader('Cache-Control', 'private, no-store');
  res.end(Buffer.from(file.data));
}

export async function deleteStoredFiles(db: Db, ids: (string | null | undefined)[]): Promise<void> {
  const real = ids.filter((id): id is string => !!id);
  if (real.length) await db.storedFile.deleteMany({ where: { id: { in: real } } });
}
