import { z } from 'zod';

// --- Register Schema ---
export const registerUserSchema = z.object({
  fullName: z
    .string()
    .min(2, { message: 'Full name must be at least 2 characters' })
    .max(50, { message: 'Full name must be less than 50 characters' }),

  email: z.string().email({ message: 'Invalid email address' }),

  password: z
    .string()
    .min(6, { message: 'Password must be at least 6 characters' })
    .max(50, { message: 'Password must be less than 50 characters' }),
});

// --- Login Schema ---
export const loginUserSchema = z.object({
  email: z.string().email({ message: 'Invalid email address' }),

  password: z
    .string()
    .min(6, { message: 'Password must be at least 6 characters' })
    .max(50, { message: 'Password must be less than 50 characters' }),
});

export type RegisterUserInput = z.infer<typeof registerUserSchema>;
export type LoginUserInput = z.infer<typeof loginUserSchema>;
