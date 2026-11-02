import { BadRequestException } from '@nestjs/common';
import { diskStorage, type Options } from 'multer';
import { randomBytes } from 'crypto';
import { extname, resolve } from 'path';

// Decorator arguments are evaluated at module-load time (before Nest's DI
// container exists), so this reads process.env directly rather than going
// through ConfigService — same constraint Multer options always have in Nest.
export const UPLOAD_DIR = resolve(process.env.UPLOAD_DIR ?? './uploads');
const MAX_UPLOAD_SIZE_MB = Number(process.env.MAX_UPLOAD_SIZE_MB ?? 10);

// Matches the frontend's ALLOWED_EXTENSIONS in SubmitWorkDialog.tsx exactly —
// the client-side check is a UX nicety, this is the one that can't be bypassed.
const ALLOWED_EXTENSIONS = new Set([
  '.jpg', '.jpeg', '.png', '.gif', '.webp',
  '.pdf', '.doc', '.docx', '.txt',
  '.xls', '.xlsx', '.ppt', '.pptx',
]);

export const submissionFileOptions: Options = {
  storage: diskStorage({
    destination: UPLOAD_DIR,
    filename: (_req, file, cb) => {
      const unique = randomBytes(16).toString('hex');
      cb(null, `${unique}${extname(file.originalname)}`);
    },
  }),
  limits: { fileSize: MAX_UPLOAD_SIZE_MB * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (!ALLOWED_EXTENSIONS.has(extname(file.originalname).toLowerCase())) {
      cb(new BadRequestException("That file type isn't supported."));
      return;
    }
    cb(null, true);
  },
};

// Quest briefs go beyond proof-of-work formats: creators may also attach data
// sheets, archives, and short audio/video walkthroughs.
const ATTACHMENT_EXTENSIONS = new Set([...ALLOWED_EXTENSIONS, '.csv', '.zip', '.mp3', '.mp4', '.mov']);

export const attachmentFileOptions: Options = {
  ...submissionFileOptions,
  fileFilter: (_req, file, cb) => {
    if (!ATTACHMENT_EXTENSIONS.has(extname(file.originalname).toLowerCase())) {
      cb(new BadRequestException("That file type isn't supported."));
      return;
    }
    cb(null, true);
  },
};
