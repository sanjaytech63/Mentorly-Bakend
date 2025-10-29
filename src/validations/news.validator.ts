import { z } from 'zod';

export const blogCategoryEnum = z.enum([
  'frontend',
  'backend',
  'fullstack',
  'webdesign',
  'mobile',
  'devops',
  'cybersecurity',
  'testing',
]);

export const blogBadgeEnum = z.enum([
  'new',
  'trending',
  'popular',
  'featured',
  'recommended',
  'advanced',
  'beginner',
  'exclusive',
  'updated',
  'limited',
]);

export const objectIdSchema = z.object({
  id: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid ID format'),
});

export const blogQuerySchema = z.object({
  page: z
    .string()
    .optional()
    .transform(val => {
      const page = parseInt(val || '1');
      return Math.max(1, page);
    }),
  limit: z
    .string()
    .optional()
    .transform(val => {
      const limit = parseInt(val || '10');
      return Math.min(Math.max(1, limit), 50);
    }),
  category: blogCategoryEnum.optional(),
  search: z.string().min(1, 'Search term cannot be empty').optional(),
  sort: z.enum(['newest', 'oldest', 'popular']).optional().default('newest'),
  tags: z
    .string()
    .optional()
    .transform(val => (val ? val.split(',') : [])),
});

export const createBlogSchema = z.object({
  title: z
    .string()
    .min(1, 'Title is required')
    .max(200, 'Title must be less than 200 characters')
    .trim(),
  description: z
    .string()
    .min(1, 'Description is required')
    .min(50, 'Description should be at least 50 characters')
    .max(5000, 'Description must be less than 5000 characters')
    .trim(),
  author: z
    .string()
    .min(1, 'Author is required')
    .max(100, 'Author name must be less than 100 characters')
    .trim(),
  category: blogCategoryEnum,
  readTime: z
    .string()
    .min(1, 'Read time is required')
    .regex(/^\d+\s*min$/, 'Read time must be in format like "5 min"'),
  badge: blogBadgeEnum.optional(),
  tags: z.array(z.string().min(1).max(20)).optional().default([]),
  isPublished: z.boolean().optional().default(true),
});

export const updateBlogSchema = createBlogSchema.partial().refine(
  data => {
    return Object.keys(data).length > 0;
  },
  {
    message: 'At least one field must be provided for update',
  }
);

export type CreateBlogInput = z.infer<typeof createBlogSchema>;
export type UpdateBlogInput = z.infer<typeof updateBlogSchema>;
export type BlogQueryInput = z.infer<typeof blogQuerySchema>;
export type BlogCategory = z.infer<typeof blogCategoryEnum>;
export type BlogBadge = z.infer<typeof blogBadgeEnum>;
