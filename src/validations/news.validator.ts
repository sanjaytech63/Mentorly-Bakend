import { z } from 'zod';

export const createNewsSchema = z.object({
  title: z.string().min(5),
  description: z.string().min(10),
  date: z.string().optional(),
  author: z.string().min(2),
  category: z.string().min(2),
  readTime: z.string().optional(),
  badge: z.string().optional(),
});
