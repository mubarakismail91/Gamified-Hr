import 'dotenv/config';
import { Prisma, PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

/**
 * `criteria` is the automatic rule evaluated by BadgesService (see
 * src/badges/badge-criteria.ts). `null` = no rule: Administrator-granted only.
 *
 * Badge catalog — mirrors the frontend demo's static BADGES array
 * (src/store/seed.ts) exactly, including ids, so a badge earned under the
 * demo maps to the same badge here. Upserted by id: safe to re-run.
 *
 * Usage: npm run seed:badges
 */
const BADGES = [
  {
    id: 'b-onboard',
    nameEn: 'Welcome Aboard',
    nameAr: 'أهلًا بك',
    descriptionEn: 'Accepted your first quest.',
    descriptionAr: 'قبلت أول مهمة لك.',
    howToEn: 'Accept your first quest.',
    howToAr: 'اقبل أول مهمة لك.',
    groupEn: 'Getting started',
    groupAr: 'البداية',
    icon: 'Compass',
    tier: 'bronze',
    criteria: { type: 'questsAccepted', count: 1 },
  },
  {
    id: 'b-fastStart',
    nameEn: 'Fast Start',
    nameAr: 'انطلاقة سريعة',
    descriptionEn: 'Earned 500 XP within your first month.',
    descriptionAr: 'حصلت على ٥٠٠ نقطة في شهرك الأول.',
    howToEn: 'Reach 500 XP in the first 30 days.',
    howToAr: 'بلوغ ٥٠٠ نقطة خلال ٣٠ يومًا.',
    groupEn: 'Getting started',
    groupAr: 'البداية',
    icon: 'Rocket',
    tier: 'bronze',
    criteria: { type: 'xpWithinDays', xp: 500, days: 30 },
  },
  {
    id: 'b-course5',
    nameEn: 'Five Quests',
    nameAr: 'خمس مهام',
    descriptionEn: 'Completed five approved quests.',
    descriptionAr: 'أكملت خمس مهام معتمدة.',
    howToEn: 'Complete 5 approved quests.',
    howToAr: 'أكمل ٥ مهام معتمدة.',
    groupEn: 'Learning',
    groupAr: 'التعلّم',
    icon: 'GraduationCap',
    tier: 'silver',
    criteria: { type: 'questsCompleted', count: 5 },
  },
  {
    id: 'b-course10',
    nameEn: 'Ten Quests',
    nameAr: 'عشر مهام',
    descriptionEn: 'Completed ten approved quests.',
    descriptionAr: 'أكملت عشر مهام معتمدة.',
    howToEn: 'Complete 10 approved quests.',
    howToAr: 'أكمل ١٠ مهام معتمدة.',
    groupEn: 'Learning',
    groupAr: 'التعلّم',
    icon: 'Library',
    tier: 'gold',
    criteria: { type: 'questsCompleted', count: 10 },
  },
  {
    id: 'b-mentor',
    nameEn: 'Mentor',
    nameAr: 'موجّه',
    descriptionEn: 'Guided a colleague through onboarding.',
    descriptionAr: 'رافقت زميلًا خلال فترة التهيئة.',
    howToEn: 'Be assigned and complete one mentoring cycle.',
    howToAr: 'أكمل دورة إرشاد واحدة.',
    groupEn: 'People',
    groupAr: 'الأشخاص',
    icon: 'HeartHandshake',
    tier: 'silver',
    criteria: null,
  },
  {
    id: 'b-kudos10',
    nameEn: 'Appreciated',
    nameAr: 'محلّ تقدير',
    descriptionEn: 'Received 10 Kudos from colleagues.',
    descriptionAr: 'استلمت ١٠ رسائل شكر من الزملاء.',
    howToEn: 'Receive 10 Kudos.',
    howToAr: 'استلم ١٠ رسائل شكر.',
    groupEn: 'People',
    groupAr: 'الأشخاص',
    icon: 'Sparkles',
    tier: 'bronze',
    criteria: { type: 'kudosReceived', count: 10 },
  },
  {
    id: 'b-kudos25',
    nameEn: 'Widely Appreciated',
    nameAr: 'تقدير واسع',
    descriptionEn: 'Received 25 Kudos from colleagues.',
    descriptionAr: 'استلمت ٢٥ رسالة شكر من الزملاء.',
    howToEn: 'Receive 25 Kudos.',
    howToAr: 'استلم ٢٥ رسالة شكر.',
    groupEn: 'People',
    groupAr: 'الأشخاص',
    icon: 'Award',
    tier: 'gold',
    criteria: { type: 'kudosReceived', count: 25 },
  },
  {
    id: 'b-research1',
    nameEn: 'Published',
    nameAr: 'نشر علمي',
    descriptionEn: 'Completed a Research quest.',
    descriptionAr: 'أكملت مهمة بحثية.',
    howToEn: 'Complete one approved quest in the Research category.',
    howToAr: 'أكمل مهمة معتمدة واحدة في فئة البحث.',
    groupEn: 'Research',
    groupAr: 'البحث',
    icon: 'BookOpen',
    tier: 'silver',
    criteria: { type: 'questsCompleted', count: 1, category: { en: 'Research', ar: 'بحث' } },
  },
  {
    id: 'b-research5',
    nameEn: 'Scholar',
    nameAr: 'باحث',
    descriptionEn: 'Completed five Research quests.',
    descriptionAr: 'أكملت خمس مهام بحثية.',
    howToEn: 'Complete five approved quests in the Research category.',
    howToAr: 'أكمل خمس مهام معتمدة في فئة البحث.',
    groupEn: 'Research',
    groupAr: 'البحث',
    icon: 'Microscope',
    tier: 'gold',
    criteria: { type: 'questsCompleted', count: 5, category: { en: 'Research', ar: 'بحث' } },
  },
  {
    id: 'b-lead1',
    nameEn: 'Initiative Lead',
    nameAr: 'قائد مبادرة',
    descriptionEn: 'Completed a Leadership quest.',
    descriptionAr: 'أكملت مهمة قيادية.',
    howToEn: 'Complete one approved quest in the Leadership category.',
    howToAr: 'أكمل مهمة معتمدة واحدة في فئة القيادة.',
    groupEn: 'Leadership',
    groupAr: 'القيادة',
    icon: 'Flag',
    tier: 'silver',
    criteria: { type: 'questsCompleted', count: 1, category: { en: 'Leadership', ar: 'قيادة' } },
  },
  {
    id: 'b-lead5',
    nameEn: 'Programme Builder',
    nameAr: 'باني برامج',
    descriptionEn: 'Completed five Leadership quests.',
    descriptionAr: 'أكملت خمس مهام قيادية.',
    howToEn: 'Complete five approved quests in the Leadership category.',
    howToAr: 'أكمل خمس مهام معتمدة في فئة القيادة.',
    groupEn: 'Leadership',
    groupAr: 'القيادة',
    icon: 'Building2',
    tier: 'gold',
    criteria: { type: 'questsCompleted', count: 5, category: { en: 'Leadership', ar: 'قيادة' } },
  },
  {
    id: 'b-streak',
    nameEn: 'Consistent',
    nameAr: 'مواظبة',
    descriptionEn: 'Maintained a 10-day engagement streak.',
    descriptionAr: 'حافظت على سلسلة تفاعل ١٠ أيام.',
    howToEn: 'Engage on 10 consecutive working days.',
    howToAr: 'تفاعل ١٠ أيام عمل متتالية.',
    groupEn: 'Habits',
    groupAr: 'العادات',
    icon: 'Flame',
    tier: 'bronze',
    criteria: { type: 'workingDayStreak', days: 10 },
  },
  {
    id: 'b-innovator',
    nameEn: 'Innovator',
    nameAr: 'مبتكر',
    descriptionEn: 'Submitted an accepted improvement proposal.',
    descriptionAr: 'قدّمت مقترح تحسين تم قبوله.',
    howToEn: 'Have one improvement proposal accepted.',
    howToAr: 'احصل على قبول مقترح تحسين واحد.',
    groupEn: 'Contribution',
    groupAr: 'الإسهام',
    icon: 'Lightbulb',
    tier: 'silver',
    criteria: null,
  },
  {
    id: 'b-service',
    nameEn: 'Student First',
    nameAr: 'الطالب أولًا',
    descriptionEn: 'Recognised for outstanding student support.',
    descriptionAr: 'تقدير لتميّز دعم الطلاب.',
    howToEn: 'Receive 5 service-to-students Kudos.',
    howToAr: 'استلم ٥ رسائل شكر لخدمة الطلاب.',
    groupEn: 'Contribution',
    groupAr: 'الإسهام',
    icon: 'Users',
    tier: 'silver',
    criteria: { type: 'kudosReceived', count: 5, value: 'service' },
  },
];

async function main() {
  for (const badge of BADGES) {
    const data = { ...badge, criteria: badge.criteria ?? Prisma.DbNull };
    await prisma.badge.upsert({
      where: { id: badge.id },
      create: data,
      update: data,
    });
  }
  console.log(`Seeded ${BADGES.length} badges.`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
