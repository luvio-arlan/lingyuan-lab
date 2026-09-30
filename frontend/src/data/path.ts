import type { Accent } from './site';

export type Orbit = {
  id: 'od' | 'work' | 'ai' | 'org';
  label: string;
  en: string;
  accent: Accent;
  summary: string;
};

export const orbits: Orbit[] = [
  {
    id: 'od',
    label: '组织发展',
    en: 'Organization Development',
    accent: 'blue',
    summary: '从诊断、参与、干预与反馈出发，理解组织为什么需要“发展”，而不只是一次管理动作。',
  },
  {
    id: 'work',
    label: '工作',
    en: 'Work',
    accent: 'teal',
    summary: '把岗位拆回任务、流程与结果，才能看清哪一层真正在发生变化。',
  },
  {
    id: 'ai',
    label: '人工智能',
    en: 'Artificial Intelligence',
    accent: 'violet',
    summary: 'AI 可能加速一个任务，也可能改变流程、协作关系与决策权的分配。',
  },
  {
    id: 'org',
    label: '组织',
    en: 'Organization',
    accent: 'orange',
    summary: '当工作被重新分配，团队边界、岗位与人才系统需要怎样响应？',
  },
];

export type Lesson = {
  no: string;
  slug: string;
  orbit: Orbit['id'];
  title: string;
  question: string;
  outputs: string[];
  status: 'available' | 'upcoming';
  article?: string;
  tool?: string;
  discussion?: string;
  diagram?: string;
};

export const lessons: Lesson[] = [
  {
    no: '01',
    slug: 'od-foundations',
    orbit: 'od',
    title: 'OD 基础',
    question: 'OD 到底在改变什么？',
    outputs: ['概念文', '术语卡', '诊断问题清单'],
    status: 'available',
    article: 'what-does-od-change',
    tool: 'od-diagnostic-questions',
    discussion: 'what-changes-first',
    diagram: 'OD 计划变革循环',
  },
  {
    no: '02',
    slug: 'how-organizations-work',
    orbit: 'od',
    title: '组织如何运转',
    question: '组织怎样运转？',
    outputs: ['要素关系图', '组织观察表'],
    status: 'available',
    article: 'how-organizations-work',
    tool: 'organization-observation-sheet',
    discussion: 'which-element-moves',
    diagram: '星型模型五要素',
  },
  {
    no: '03',
    slug: 'what-is-work',
    orbit: 'work',
    title: '什么是工作',
    question: '任务、岗位、流程和结果有什么不同？',
    outputs: ['岗位任务拆解模板'],
    status: 'available',
    article: 'task-job-process-outcome',
    tool: 'job-task-breakdown',
    discussion: 'which-layer-changed',
    diagram: '任务、岗位、流程与结果',
  },
  {
    no: '04',
    slug: 'which-layer-ai-changes',
    orbit: 'ai',
    title: 'AI 改变哪一层',
    question: 'AI 改变的是任务、流程还是协作关系？',
    outputs: ['三类变化观察表'],
    status: 'available',
    article: 'which-layer-ai-changes',
    tool: 'three-change-sheet',
    discussion: 'task-process-or-relationship',
    diagram: '任务、流程与协作关系',
  },
  {
    no: '05',
    slug: 'working-with-agents',
    orbit: 'ai',
    title: '人与 Agent 共事',
    question: '人与 Agent 如何委派、复核和升级？',
    outputs: ['协作与责任流程图'],
    status: 'available',
    article: 'delegation-review-escalation',
    tool: 'agent-handoff-sheet',
    discussion: 'who-owns-agent-output',
    diagram: '委派、复核与异常接手',
  },
  {
    no: '06',
    slug: 'decision-rights',
    orbit: 'ai',
    title: '决策怎样变化',
    question: 'AI 参与后，决策权如何分配？',
    outputs: ['决策场景分析表'],
    status: 'available',
    article: 'who-really-decides',
    tool: 'decision-scenario-sheet',
    discussion: 'who-can-challenge-the-default',
    diagram: '决定权与信息的四个位置',
  },
  {
    no: '07',
    slug: 'teams-and-roles',
    orbit: 'org',
    title: '团队与岗位',
    question: '团队边界和岗位如何调整？',
    outputs: ['两种设计假设及反例'],
    status: 'available',
    article: 'redesign-team-boundaries',
    tool: 'team-design-comparison',
    discussion: 'which-boundary-should-move',
    diagram: '两种团队设计假设及反例',
  },
  {
    no: '08',
    slug: 'talent-systems',
    orbit: 'org',
    title: '人才系统',
    question: '人才系统需要怎样响应？',
    outputs: ['能力、培养与评价的研究议程'],
    status: 'available',
    article: 'talent-learning-evaluation',
    tool: 'talent-research-agenda',
    discussion: 'what-counts-as-learning',
    diagram: '能力、培养与评价的反馈循环',
  },
];

export const orbitOf = (id: Orbit['id']) => orbits.find((o) => o.id === id)!;
export const lessonBySlug = (slug: string) => lessons.find((l) => l.slug === slug);
