import type { SdtScale } from './dto/survey.dto';

/**
 * SDT need-satisfaction items for pulse rounds. Wording is adapted from common workplace SDT measures
 * (e.g. the Basic Psychological Need Satisfaction at Work scale, Deci et al., 2001; Van den Broeck et al., 2010)
 * and general pulse-survey examples, then mapped to autonomy / competence / relatedness. Items are paraphrased
 * and have not been validated as a set, so cite the source instruments rather than this list.
 * All items are positively worded and answered 1-5 (1 = lowest, 5 = highest), so scoring is a plain mean.
 */
export interface BankQuestion {
  key: string;
  scale: SdtScale;
  /** Part of the default round when the admin doesn't pick questions. */
  isDefault?: boolean;
  textEn: string;
  textAr: string;
}

export const SURVEY_QUESTION_BANK: BankQuestion[] = [
  // Autonomy
  {
    key: 'aut-input', scale: 'autonomy', isDefault: true,
    textEn: 'I feel I have real input into decisions that affect my work.',
    textAr: 'أشعر أن لي رأيًا حقيقيًا في القرارات التي تؤثر على عملي.',
  },
  {
    key: 'aut-choose', scale: 'autonomy', isDefault: true,
    textEn: 'I can choose how I approach my day-to-day tasks.',
    textAr: 'أستطيع اختيار كيفية تنفيذ مهامي اليومية.',
  },
  {
    key: 'aut-best-way', scale: 'autonomy',
    textEn: 'I feel free to do my job the way I think it could best be done.',
    textAr: 'أشعر بالحرية في أداء عملي بالطريقة التي أراها الأفضل.',
  },
  {
    key: 'aut-own-ideas', scale: 'autonomy',
    textEn: 'I am free to express my ideas and opinions on the job.',
    textAr: 'أتمتع بحرية التعبير عن أفكاري وآرائي في العمل.',
  },
  {
    key: 'aut-autonomy-approach', scale: 'autonomy',
    textEn: 'I have enough autonomy in how I approach my work.',
    textAr: 'لدي استقلالية كافية في طريقة تعاملي مع عملي.',
  },
  {
    key: 'aut-opinions-considered', scale: 'autonomy',
    textEn: 'My opinions are genuinely considered on my team.',
    textAr: 'تؤخذ آرائي بجدية حقيقية داخل فريقي.',
  },
  {
    key: 'aut-speak-up', scale: 'autonomy',
    textEn: 'I feel safe to speak up when I disagree with a decision.',
    textAr: 'أشعر بالأمان عند التعبير عن اعتراضي على قرار ما.',
  },

  // Competence
  {
    key: 'com-effective', scale: 'competence', isDefault: true,
    textEn: 'I feel confident and effective in the work I do.',
    textAr: 'أشعر بالثقة والفعالية في العمل الذي أقوم به.',
  },
  {
    key: 'com-develop', scale: 'competence', isDefault: true,
    textEn: 'I have opportunities to develop and use my skills.',
    textAr: 'تتوفر لي فرص لتطوير مهاراتي واستخدامها.',
  },
  {
    key: 'com-good-at', scale: 'competence',
    textEn: 'I am good at the things I do in my job.',
    textAr: 'أنا جيد في المهام التي أقوم بها في عملي.',
  },
  {
    key: 'com-learn', scale: 'competence',
    textEn: 'I feel I am learning new and useful things in my work.',
    textAr: 'أشعر أنني أتعلم أشياء جديدة ومفيدة من خلال عملي.',
  },
  {
    key: 'com-accomplish', scale: 'competence',
    textEn: 'My work gives me a sense of accomplishment.',
    textAr: 'يمنحني عملي شعورًا بالإنجاز.',
  },
  {
    key: 'com-time-quality', scale: 'competence',
    textEn: 'I have the time I need to do quality work.',
    textAr: 'لدي الوقت اللازم لإنجاز عمل بجودة عالية.',
  },
  {
    key: 'com-expertise-used', scale: 'competence',
    textEn: 'My expertise is being used effectively.',
    textAr: 'يتم استثمار خبرتي بشكل فعّال.',
  },

  // Relatedness
  {
    key: 'rel-belong', scale: 'relatedness', isDefault: true,
    textEn: 'I feel a sense of belonging with my colleagues.',
    textAr: 'أشعر بانتماء حقيقي تجاه زملائي.',
  },
  {
    key: 'rel-supported', scale: 'relatedness', isDefault: true,
    textEn: 'I feel supported by the people I work with.',
    textAr: 'أشعر بالدعم من الأشخاص الذين أعمل معهم.',
  },
  {
    key: 'rel-get-along', scale: 'relatedness',
    textEn: 'I get along well with the people I work with.',
    textAr: 'أنسجم جيدًا مع الأشخاص الذين أعمل معهم.',
  },
  {
    key: 'rel-care', scale: 'relatedness',
    textEn: 'The people I work with care about me.',
    textAr: 'الأشخاص الذين أعمل معهم يهتمون بي.',
  },
  {
    key: 'rel-trust', scale: 'relatedness',
    textEn: 'There is a strong sense of trust within my team.',
    textAr: 'يسود الثقة القوية داخل فريقي.',
  },
  {
    key: 'rel-ask-help', scale: 'relatedness',
    textEn: 'I can ask for help without feeling judged.',
    textAr: 'أستطيع طلب المساعدة دون الشعور بأنني محل حكم.',
  },
  {
    key: 'rel-recognized', scale: 'relatedness',
    textEn: 'I feel recognized by my manager for good work.',
    textAr: 'أشعر بأن مديري يقدّر عملي الجيد.',
  },
];

export const DEFAULT_QUESTION_KEYS = SURVEY_QUESTION_BANK.filter((q) => q.isDefault).map((q) => q.key);
