import { z } from "zod";

export const USER_ROLES = ["admin", "user"] as const;

export const createUserSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.email("Invalid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  role: z.enum(USER_ROLES),
  allowedProjectIds: z.array(z.string()).default([]),
});

export const updateUserSchema = z.object({
  role: z.enum(USER_ROLES),
  allowedProjectIds: z.array(z.string()).default([]),
});

export type CreateUserFormValues = z.input<typeof createUserSchema>;
export type CreateUserInput = z.output<typeof createUserSchema>;
export type UpdateUserInput = z.output<typeof updateUserSchema>;
