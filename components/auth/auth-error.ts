/** Map Better Auth client errors to translation keys without leaking details. */
export function authErrorKey(error: { status?: number; code?: string } | null | undefined): string {
  if (!error) return "errors.generic";
  if (error.status === 429) return "auth.tooManyAttempts";
  switch (error.code) {
    case "INVALID_EMAIL_OR_PASSWORD":
    case "INVALID_PASSWORD":
    case "INVALID_EMAIL":
      return "auth.invalidCredentials";
    case "USER_ALREADY_EXISTS":
    case "USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL":
      return "auth.emailTaken";
    case "INVALID_TOKEN":
      return "auth.resetInvalid";
    case "PASSWORD_TOO_SHORT":
      return "validation.passwordMin";
    case "PASSWORD_TOO_LONG":
      return "validation.passwordMax";
    default:
      return "errors.generic";
  }
}

/** Only allow same-site relative redirects after sign-in. */
export function safeNextPath(next: string | null | undefined): string {
  if (!next || !next.startsWith("/") || next.startsWith("//") || next.startsWith("/\\")) return "/dashboard";
  return next;
}
