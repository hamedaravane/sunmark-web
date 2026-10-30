import { z } from 'zod';
const digits = (value: string) =>
  value.replace(/[۰-۹٠-٩]/g, (c) =>
    String(c.charCodeAt(0) - (c <= '۹' && c >= '۰' ? 1776 : 1632)),
  );
export const usernameSchema = z
  .string()
  .trim()
  .toLowerCase()
  .regex(/^[a-z][a-z0-9_]{2,23}$/);
export const passwordSchema = z.string().min(10).max(128);
export const registrationSchema = z.strictObject({
  username: usernameSchema,
  password: passwordSchema,
  phone: z
    .string()
    .transform((v) =>
      digits(v)
        .replace(/[\s()-]/g, '')
        .replace(/^0098/, '+98')
        .replace(/^09/, '+989'),
    )
    .pipe(z.string().regex(/^\+[1-9][0-9]{7,14}$/)),
  name: z.string().trim().min(1).max(24),
  age: z.number().int().min(1).max(120),
  gender: z.enum(['female', 'male', 'other', 'undisclosed']),
});
export const loginSchema = z.strictObject({
  username: usernameSchema,
  password: passwordSchema,
});
export const recoverySchema = z.strictObject({
  username: usernameSchema,
  recoveryCode: z.string().min(1).max(128),
  password: passwordSchema,
});
export const profileSchema = registrationSchema
  .omit({ password: true })
  .extend({ id: z.uuid() })
  .strip();
export const accountResponseSchema = z.strictObject({ profile: profileSchema });
export const registrationResponseSchema = accountResponseSchema.extend({
  recoveryCode: z.string(),
});
