import type { SurveyRound } from "./types";
import { ago, inDays } from "@/lib/dates";

/** Programme KPIs shown on the Admin panel. */
export const ADMIN_KPIS = {
  activeParticipants: 612,
  totalEligible: 840,
  participationRate: 73,
  kudos30d: 418,
  quests30d: 1224,
};

/** Monthly participation — % of eligible staff active that month. */
export const PARTICIPATION_TREND = [
  { month: { en: "Rabi II", ar: "ربيع الآخر" }, rate: 41 },
  { month: { en: "Jumada I", ar: "جمادى الأولى" }, rate: 48 },
  { month: { en: "Jumada II", ar: "جمادى الآخرة" }, rate: 55 },
  { month: { en: "Rajab", ar: "رجب" }, rate: 59 },
  { month: { en: "Sha'ban", ar: "شعبان" }, rate: 64 },
  { month: { en: "Ramadan", ar: "رمضان" }, rate: 52 },
  { month: { en: "Shawwal", ar: "شوال" }, rate: 67 },
  { month: { en: "Dhu al-Q", ar: "ذو القعدة" }, rate: 73 },
];

/** Average XP per active staff member, by department (matches the 5 seed departments). */
export const XP_BY_DEPT = [
  { dept: { en: "Computer Science", ar: "علوم الحاسب" }, xp: 3180 },
  { dept: { en: "Science", ar: "العلوم" }, xp: 3620 },
  { dept: { en: "Sharia & Da'wah", ar: "الشريعة والدعوة" }, xp: 2940 },
  { dept: { en: "Administrative Affairs", ar: "الشؤون الإدارية" }, xp: 3410 },
  { dept: { en: "Deanship of Development", ar: "عمادة التطوير" }, xp: 2760 },
];

/** Badge tier distribution across the university. */
export const BADGE_DISTRIBUTION = [
  { tier: { en: "Bronze", ar: "برونزي" }, count: 1840 },
  { tier: { en: "Silver", ar: "فضي" }, count: 760 },
  { tier: { en: "Gold", ar: "ذهبي" }, count: 214 },
];

/** Demographic split of active participants (for the Demographics tab). */
export const DEMOGRAPHICS = {
  byRole: [
    { key: { en: "Academic", ar: "أكاديمي" }, value: 468 },
    { key: { en: "Administrative", ar: "إداري" }, value: 144 },
  ],
  byGender: [
    { key: { en: "Male", ar: "ذكر" }, value: 372 },
    { key: { en: "Female", ar: "أنثى" }, value: 240 },
  ],
  byCollege: [
    { key: { en: "Computer & Info. Systems", ar: "الحاسب ونظم المعلومات" }, value: 96 },
    { key: { en: "Sharia", ar: "الشريعة" }, value: 138 },
    { key: { en: "Da'wah & Religion Fundamentals", ar: "الدعوة وأصول الدين" }, value: 121 },
    { key: { en: "Science", ar: "العلوم" }, value: 104 },
    { key: { en: "Administrative Affairs", ar: "الشؤون الإدارية" }, value: 153 },
  ],
};

export const SURVEYS: SurveyRound[] = [
  {
    id: "sv-q4",
    title: { en: "SDT Pulse — Q4", ar: "نبض تقرير المصير — الربع الرابع" },
    quarter: "Q4",
    status: "open",
    responses: 214,
    target: 612,
    opens: ago({ days: 6 }),
  },
  {
    id: "sv-q3",
    title: { en: "SDT Pulse — Q3", ar: "نبض تقرير المصير — الربع الثالث" },
    quarter: "Q3",
    status: "closed",
    responses: 508,
    target: 590,
    opens: ago({ days: 96 }),
  },
  {
    id: "sv-q1next",
    title: { en: "SDT Pulse — Q1 (next year)", ar: "نبض تقرير المصير — الربع الأول (العام القادم)" },
    quarter: "Q1",
    status: "scheduled",
    responses: 0,
    target: 640,
    opens: inDays(84),
  },
];

/** SDT sub-scale averages (0–7 Likert) for the latest closed round. */
export const SDT_SCORES = [
  { scale: { en: "Autonomy", ar: "الاستقلالية" }, score: 5.4 },
  { scale: { en: "Competence", ar: "الكفاءة" }, score: 5.9 },
  { scale: { en: "Relatedness", ar: "الانتماء" }, score: 5.1 },
];
