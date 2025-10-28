import { z } from 'zod';

export const createCourseSchema = z.object({
  body: z.object({
    title: z.string().min(1, 'Title is required').max(200, 'Title too long'),
    description: z.string().optional(),
    image: z.string().url('Invalid image URL'),
    category: z.string().min(1, 'Category is required'),
    instructor: z.string().min(1, 'Instructor is required'),
    originalPrice: z.number().min(0, 'Price must be positive'),
    discountedPrice: z.number().min(0).optional(),
    rating: z.number().min(0).max(5).default(0),
    reviewCount: z.number().min(0).default(0),
    duration: z.string().min(1, 'Duration is required'),
    students: z.number().min(0).default(0),
    badge: z.string().optional(),
    icon: z.string().optional(),
    iconType: z.enum(['cloud', 'code', 'chart', 'default']).optional(),
    level: z.enum(['beginner', 'intermediate', 'advanced']).default('beginner'),
    tags: z.array(z.string()).default([]),
    isFeatured: z.boolean().default(false),
    isActive: z.boolean().default(true),
    totalHours: z.number().min(0).default(0),
    lectures: z.number().min(0).default(0)
  })
});

export const updateCourseSchema = z.object({
  params: z.object({
    id: z.string().min(1, 'Course ID is required')
  }),
  body: createCourseSchema.shape.body.partial()
});

export const getCoursesSchema = z.object({
  query: z.object({
    // Search
    search: z.string().optional(),

    // Category
    category: z.string().optional(),

    // Price filters
    minPrice: z.string().transform(Number).pipe(z.number().min(0)).optional(),
    maxPrice: z.string().transform(Number).pipe(z.number().min(0)).optional(),
    hasDiscount: z.string().transform(val => val === 'true').optional(),
    minDiscount: z.string().transform(Number).pipe(z.number().min(0).max(100)).optional(),

    // Rating filters
    minRating: z.string().transform(Number).pipe(z.number().min(0).max(5)).optional(),
    maxRating: z.string().transform(Number).pipe(z.number().min(0).max(5)).optional(),

    // Level filter
    level: z.enum(['beginner', 'intermediate', 'advanced']).optional(),

    // Featured and status
    isFeatured: z.string().transform(val => val === 'true').optional(),
    isActive: z.string().transform(val => val === 'true').optional().default(true),

    // Duration filters
    minDuration: z.string().transform(Number).pipe(z.number().min(0)).optional(),
    maxDuration: z.string().transform(Number).pipe(z.number().min(0)).optional(),

    // Students filters
    minStudents: z.string().transform(Number).pipe(z.number().min(0)).optional(),

    // Pagination
    page: z.string().transform(Number).pipe(z.number().min(1)).default(1),
    limit: z.string().transform(Number).pipe(z.number().min(1).max(100)).default(10),

    // Sorting
    sortBy: z.enum([
      'title', 'rating', 'reviewCount', 'originalPrice',
      'discountedPrice', 'students', 'createdAt', 'duration'
    ]).default('createdAt'),
    sortOrder: z.enum(['asc', 'desc']).default('desc')
  })
});

export const getCourseSchema = z.object({
  params: z.object({
    id: z.string().min(1, 'Course ID is required')
  })
});

export const getCategoriesSchema = z.object({
  query: z.object({
    includeCount: z.string().transform(val => val === 'true').optional().default(false)
  })
});

export type CreateCourseInput = z.infer<typeof createCourseSchema>['body'];
export type UpdateCourseInput = z.infer<typeof updateCourseSchema>['body'];
export type GetCoursesInput = z.infer<typeof getCoursesSchema>['query'];