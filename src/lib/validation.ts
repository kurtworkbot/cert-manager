import { z } from 'zod';
import { ValidationError } from './error-handler';

// Helper to validate request body
export function validateBody<T extends z.ZodSchema>(schema: T) {
  return async (body: unknown): Promise<z.infer<T>> => {
    try {
      return await schema.parseAsync(body);
    } catch (error) {
      if (error instanceof z.ZodError) {
        const details = error.errors.map(e => ({
          path: e.path.join('.'),
          message: e.message,
        }));
        throw new ValidationError('Validation failed', { fields: details });
      }
      throw error;
    }
  };
}

// Helper to validate query params
export function validateQuery<T extends z.ZodSchema>(schema: T) {
  return (params: Record<string, string>): z.infer<T> => {
    try {
      return schema.parse(params);
    } catch (error) {
      if (error instanceof z.ZodError) {
        const details = error.errors.map(e => ({
          path: e.path.join('.'),
          message: e.message,
        }));
        throw new ValidationError('Invalid query parameters', { fields: details });
      }
      throw error;
    }
  };
}

// Common schemas
export const emailSchema = z.string().email('Invalid email format');
export const uuidSchema = z.string().uuid('Invalid UUID format');
export const paginationSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

// Auth schemas
export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(8, 'Password must be at least 8 characters'),
});

export const registerSchema = z.object({
  email: emailSchema,
  password: z.string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number'),
  role: z.enum(['admin', 'user', 'viewer']).optional().default('user'),
});

// Certificate schemas
export const createCertificateSchema = z.object({
  domain: z.string().min(1, 'Domain is required').regex(/^[a-zA-Z0-9]([a-zA-Z0-9-]*[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9-]*[a-zA-Z0-9])?)*$/, 'Invalid domain format'),
  providerId: uuidSchema,
  caProvider: z.enum(['letsencrypt', 'zerossl']),
  autoRenew: z.boolean().optional().default(true),
});

export const updateCertificateSchema = createCertificateSchema.partial();
