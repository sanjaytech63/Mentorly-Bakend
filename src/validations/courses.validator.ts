import { z } from 'zod';

export const createCourseSchema = z.object({
    title: z.string().min(1, 'Title is required'),
    category: z.string().min(1, 'Category is required'),
    instructor: z.string().min(1, 'Instructor name is required'),
    originalPrice: z.string().or(z.number()),
    discountedPrice: z.string().or(z.number()),
    rating: z.string().or(z.number()).optional(),
    reviewCount: z.string().or(z.number()).optional(),
    duration: z.string().min(1, 'Duration is required'),
    students: z.string().or(z.number()).optional(),
    badge: z.string().optional(),
});