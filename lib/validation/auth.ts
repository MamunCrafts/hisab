import { z } from "zod";

// Messages are translation keys; forms translate them for display.
export const emailField = z.string().trim().min(1, "validation.required").email("validation.email").max(254, "validation.email");
const passwordField = z.string().min(8, "validation.passwordMin").max(128, "validation.passwordMax");

export const loginSchema = z.object({
  email: emailField,
  password: z.string().min(1, "validation.required"),
  rememberMe: z.boolean(),
});
export type LoginInput = z.infer<typeof loginSchema>;

export const signupSchema = z
  .object({
    name: z.string().trim().min(1, "validation.nameMin").max(80, "validation.nameMax"),
    email: emailField,
    password: passwordField,
    confirmPassword: z.string().min(1, "validation.required"),
    agree: z.boolean().refine((v) => v, "validation.agreeTerms"),
  })
  .refine((v) => v.password === v.confirmPassword, {
    path: ["confirmPassword"],
    message: "validation.passwordMismatch",
  });
export type SignupInput = z.infer<typeof signupSchema>;

export const forgotPasswordSchema = z.object({ email: emailField });
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;

export const resetPasswordSchema = z
  .object({
    password: passwordField,
    confirmPassword: z.string().min(1, "validation.required"),
  })
  .refine((v) => v.password === v.confirmPassword, {
    path: ["confirmPassword"],
    message: "validation.passwordMismatch",
  });
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, "validation.required"),
    newPassword: passwordField,
    confirmPassword: z.string().min(1, "validation.required"),
    revokeOtherSessions: z.boolean(),
  })
  .refine((v) => v.newPassword === v.confirmPassword, {
    path: ["confirmPassword"],
    message: "validation.passwordMismatch",
  });
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;
