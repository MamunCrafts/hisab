import { z } from "zod";

export type ActionError = {
  ok: false;
  /** Translation key. */
  error: string;
  fieldErrors?: Record<string, string>;
};
export type ActionSuccess<T> = { ok: true; data: T };
export type ActionResult<T = null> = ActionSuccess<T> | ActionError;

export function success<T>(data: T): ActionSuccess<T> {
  return { ok: true, data };
}

export function failure(error: string, fieldErrors?: Record<string, string>): ActionError {
  return { ok: false, error, fieldErrors };
}

export function zodFailure(error: z.ZodError): ActionError {
  const fieldErrors: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path.join(".");
    if (key && !fieldErrors[key]) fieldErrors[key] = issue.message;
  }
  return failure("errors.validation", fieldErrors);
}

/** Domain error carrying a translation key, safe to show to the user. */
export class UserFacingError extends Error {
  constructor(
    public readonly key: string,
    public readonly field?: string,
  ) {
    super(key);
    this.name = "UserFacingError";
  }
}
