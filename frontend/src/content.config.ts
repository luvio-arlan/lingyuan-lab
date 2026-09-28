import { defineCollection, reference } from 'astro:content';
import { file, glob } from 'astro/loaders';
import { z } from 'astro/zod';

const status = z.enum(['draft', 'reviewing', 'published']);
const accent = z.enum(['blue', 'violet', 'teal', 'orange']);

const source = z.object({
  id: z.string(),
  authors: z.string(),
  title: z.string(),
  year: z.union([z.number(), z.string()]),
  venue: z.string().optional(),
  edition: z.string().optional(),
  url: z.url().optional(),
  doi: z.string().optional(),
  accessed: z.coerce.date().optional(),
  verified: z.boolean().default(false),
  note: z.string().optional(),
});

const revision = z.object({
  date: z.coerce.date(),
  note: z.string(),
});

const articles = defineCollection({
  loader: glob({ pattern: '**/*.{md,mdx}', base: './src/content/articles' }),
  schema: z.object({
    title: z.string(),
    dek: z.string(),
    kind: z.enum(['concept', 'research']),
    lesson: z.string().optional(),
    accent: accent.default('blue'),
    status,
    published: z.coerce.date(),
    revised: z.coerce.date(),
    question: z.string(),
    scope: z.string(),
    terms: z.array(reference('terms')).default([]),
    sources: z.array(source).default([]),
    revisions: z.array(revision).default([]),
    tool: reference('tools').optional(),
    discussion: reference('questions').optional(),
  }),
});

const terms = defineCollection({
  loader: file('./src/content/terms.json'),
  schema: z.object({
    term: z.string(),
    en: z.string(),
    accent: accent.default('violet'),
    short: z.string(),
    distinct: z.string().optional(),
    source: z.string().optional(),
  }),
});

const worksheetItem = z.object({
  prompt: z.string(),
  hint: z.string().optional(),
  kind: z.enum(['check', 'text']).default('text'),
});

const tools = defineCollection({
  loader: glob({ pattern: '**/*.{md,mdx}', base: './src/content/tools' }),
  schema: z.object({
    title: z.string(),
    summary: z.string(),
    format: z.string(),
    minutes: z.number(),
    lesson: z.string(),
    accent: accent.default('teal'),
    status,
    revised: z.coerce.date(),
    sections: z.array(
      z.object({
        title: z.string(),
        intro: z.string().optional(),
        items: z.array(worksheetItem),
      }),
    ),
  }),
});

const questions = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/questions' }),
  schema: z.object({
    title: z.string(),
    summary: z.string(),
    lesson: z.string().optional(),
    accent: accent.default('orange'),
    state: z.enum(['open', 'planned']),
    opened: z.coerce.date(),
    angles: z.array(z.string()),
    labView: z.string(),
  }),
});

export const collections = { articles, terms, tools, questions };
