import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

/**
 * Skill catalog — mirrors the frontend demo's static SKILLS array
 * (src/data/skills.ts) exactly, including ids and state/level, per the
 * Phase F decision to ship a real catalog with the same illustrative
 * progress for every viewer (not yet per-user). Upserted by id: safe to re-run.
 *
 * Usage: npm run seed:skills
 */
const SKILLS = [
  {
    id: 's-t1',
    nameEn: 'Course Design',
    nameAr: 'تصميم المقررات',
    branch: 'teaching' as const,
    descriptionEn: 'Build aligned outcomes, activities, and assessment.',
    descriptionAr: 'بناء مخرجات وأنشطة وتقويم متسق.',
    state: 'unlocked' as const,
    level: 3,
    maxLevel: 3,
    requires: [],
    col: 0,
    row: 0,
  },
  {
    id: 's-t2',
    nameEn: 'Active Learning',
    nameAr: 'التعلّم النشط',
    branch: 'teaching' as const,
    descriptionEn: 'Facilitate discussion, group work, and problem-based tasks.',
    descriptionAr: 'إدارة النقاش والعمل الجماعي والمهام القائمة على المشكلات.',
    state: 'in_progress' as const,
    level: 2,
    maxLevel: 3,
    requires: ['s-t1'],
    col: 0,
    row: 1,
  },
  {
    id: 's-t3',
    nameEn: 'Assessment & Feedback',
    nameAr: 'التقويم والتغذية الراجعة',
    branch: 'teaching' as const,
    descriptionEn: 'Design fair assessment and timely, useful feedback.',
    descriptionAr: 'تصميم تقويم عادل وتغذية راجعة نافعة وفي وقتها.',
    state: 'locked' as const,
    level: 0,
    maxLevel: 3,
    requires: ['s-t2'],
    col: 0,
    row: 2,
  },
  {
    id: 's-r1',
    nameEn: 'Academic Writing',
    nameAr: 'الكتابة الأكاديمية',
    branch: 'research' as const,
    descriptionEn: 'Structure papers and argue from evidence.',
    descriptionAr: 'بناء الأوراق والاستدلال بالأدلة.',
    state: 'unlocked' as const,
    level: 2,
    maxLevel: 3,
    requires: [],
    col: 1,
    row: 0,
  },
  {
    id: 's-r2',
    nameEn: 'Research Methods',
    nameAr: 'مناهج البحث',
    branch: 'research' as const,
    descriptionEn: 'Choose and apply appropriate methodology.',
    descriptionAr: 'اختيار وتطبيق المنهجية المناسبة.',
    state: 'in_progress' as const,
    level: 1,
    maxLevel: 3,
    requires: ['s-r1'],
    col: 1,
    row: 1,
  },
  {
    id: 's-r3',
    nameEn: 'Grant Development',
    nameAr: 'إعداد المنح البحثية',
    branch: 'research' as const,
    descriptionEn: 'Build competitive funded-research proposals.',
    descriptionAr: 'بناء مقترحات بحثية ممولة تنافسية.',
    state: 'locked' as const,
    level: 0,
    maxLevel: 3,
    requires: ['s-r2'],
    col: 1,
    row: 2,
  },
  {
    id: 's-l1',
    nameEn: 'Mentoring',
    nameAr: 'الإرشاد',
    branch: 'leadership' as const,
    descriptionEn: "Support a colleague's development structurally.",
    descriptionAr: 'دعم تطوّر زميل بشكل منظّم.',
    state: 'unlocked' as const,
    level: 2,
    maxLevel: 3,
    requires: [],
    col: 2,
    row: 0,
  },
  {
    id: 's-l2',
    nameEn: 'Committee Leadership',
    nameAr: 'قيادة اللجان',
    branch: 'leadership' as const,
    descriptionEn: 'Chair meetings and carry decisions to action.',
    descriptionAr: 'إدارة الاجتماعات وتحويل القرارات إلى إجراءات.',
    state: 'in_progress' as const,
    level: 1,
    maxLevel: 3,
    requires: ['s-l1'],
    col: 2,
    row: 1,
  },
  {
    id: 's-l3',
    nameEn: 'Change Management',
    nameAr: 'إدارة التغيير',
    branch: 'leadership' as const,
    descriptionEn: 'Plan and guide a unit through change.',
    descriptionAr: 'تخطيط وقيادة وحدة خلال التغيير.',
    state: 'locked' as const,
    level: 0,
    maxLevel: 3,
    requires: ['s-l2'],
    col: 2,
    row: 2,
  },
  {
    id: 's-d1',
    nameEn: 'LMS Proficiency',
    nameAr: 'إتقان نظام إدارة التعلّم',
    branch: 'digital' as const,
    descriptionEn: 'Run a course confidently in the LMS.',
    descriptionAr: 'إدارة مقرر بثقة في نظام إدارة التعلّم.',
    state: 'unlocked' as const,
    level: 3,
    maxLevel: 3,
    requires: [],
    col: 3,
    row: 0,
  },
  {
    id: 's-d2',
    nameEn: 'Content Creation',
    nameAr: 'إنتاج المحتوى',
    branch: 'digital' as const,
    descriptionEn: 'Produce video, interactive, and accessible materials.',
    descriptionAr: 'إنتاج مواد مرئية وتفاعلية وميسّرة الوصول.',
    state: 'in_progress' as const,
    level: 1,
    maxLevel: 3,
    requires: ['s-d1'],
    col: 3,
    row: 1,
  },
  {
    id: 's-d3',
    nameEn: 'Learning Analytics',
    nameAr: 'تحليلات التعلّم',
    branch: 'digital' as const,
    descriptionEn: 'Use data to improve course outcomes.',
    descriptionAr: 'استخدام البيانات لتحسين مخرجات المقرر.',
    state: 'locked' as const,
    level: 0,
    maxLevel: 3,
    requires: ['s-d2'],
    col: 3,
    row: 2,
  },
];

async function main() {
  for (const skill of SKILLS) {
    await prisma.skill.upsert({
      where: { id: skill.id },
      create: skill,
      update: skill,
    });
  }
  console.log(`Seeded ${SKILLS.length} skills.`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
