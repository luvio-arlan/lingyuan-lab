export const site = {
  name: 'Lingyuan Lab',
  nameZh: '灵鸢实验室',
  tagline: 'AI × Organization Research',
  description:
    '灵鸢实验室是一个公开的学习与研究网站：从组织发展（OD）的经典知识出发，研究 AI 如何改变任务、协作、决策、组织设计与人才系统。',
  descriptionEn:
    'An open research lab exploring how AI reshapes work, decisions, organizational design, and talent systems.',
  version: '0.1',
};

export type Accent = 'blue' | 'violet' | 'teal' | 'orange';

export const nav = [
  { href: '/learn', label: '学习路径', en: 'Learn', accent: 'blue' },
  { href: '/library', label: '知识库', en: 'Library', accent: 'violet' },
  { href: '/tools', label: '工具箱', en: 'Tools', accent: 'teal' },
  { href: '/questions', label: '研究讨论', en: 'Questions', accent: 'orange' },
  { href: '/about', label: '关于', en: 'About', accent: 'blue' },
] as const satisfies ReadonlyArray<{ href: string; label: string; en: string; accent: Accent }>;

export const evidenceTypes = {
  research: {
    label: '研究证据',
    en: 'Research evidence',
    accent: 'blue',
    note: '来自可查证的研究文献、教材或原始数据，并注明版本与出处。',
  },
  case: {
    label: '案例观察',
    en: 'Case observation',
    accent: 'teal',
    note: '来自具体组织或场景的观察；说明它发生在哪里，不外推为普遍规律。',
  },
  inference: {
    label: '作者推论',
    en: 'Author inference',
    accent: 'violet',
    note: '作者基于证据做出的解释，可能存在竞争性解释。',
  },
  hypothesis: {
    label: '待验证假设',
    en: 'Open hypothesis',
    accent: 'orange',
    note: '值得研究但尚无充分证据的判断，欢迎提出反例。',
  },
} as const satisfies Record<string, { label: string; en: string; accent: Accent; note: string }>;

export type EvidenceType = keyof typeof evidenceTypes;

export const contentStatus = {
  draft: { label: '草稿 · 待验收', accent: 'orange' },
  reviewing: { label: '核对中', accent: 'violet' },
  published: { label: '已核对发布', accent: 'teal' },
} as const satisfies Record<string, { label: string; accent: Accent }>;

export type ContentStatus = keyof typeof contentStatus;

// Draft acceptance and source verification are separate editorial states.
export const articleStatus = (status: ContentStatus, sources: { verified: boolean }[]) => {
  const base = contentStatus[status];
  if (status !== 'draft') return base;
  const checked = sources.length > 0 && sources.every((source) => source.verified);
  return { ...base, label: checked ? '草稿 · 来源已核对' : '草稿 · 来源待核对' };
};

export const author = {
  name: '阿兰',
  alias: 'Arlan',
  email: 'luvio8888@gmail.com',
  role: '灵鸢实验室创始人 · 组织发展与 AI 产品实践者',
};
