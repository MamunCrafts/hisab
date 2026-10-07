import "server-only";
import { z } from "zod";
import { requireUserId, UnauthorizedError } from "@/lib/auth/session";
import { failure, success, UserFacingError, zodFailure, type ActionResult } from "@/lib/action-result";

/**
 * Runs a server action for the signed-in user. The user id always comes from
 * the server session — never from client input. Input is validated with Zod.
 */
export async function authedAction<S extends z.ZodType, T>(
  schema: S,
  input: unknown,
  handler: (args: { userId: string; input: z.infer<S> }) => Promise<T>,
): Promise<ActionResult<T>> {
  try {
    const userId = await requireUserId();
    const parsed = schema.safeParse(input);
    if (!parsed.success) return zodFailure(parsed.error);
    return success(await handler({ userId, input: parsed.data }));
  } catch (error) {
    return handleActionError(error);
  }
}

export function handleActionError(error: unknown): ActionResult<never> {
  if (error instanceof UnauthorizedError) return failure("errors.unauthorized");
  if (error instanceof UserFacingError) {
    return failure(error.key, error.field ? { [error.field]: error.key } : undefined);
  }
  if (error instanceof z.ZodError) return zodFailure(error);
  // Next.js uses thrown errors for redirect()/notFound(); let them propagate.
  if (error && typeof error === "object" && "digest" in error && typeof error.digest === "string" && error.digest.startsWith("NEXT_")) {
    throw error;
  }
  // Log the failure without request payloads (which may contain financial data).
  console.error("[action] Unexpected error:", error instanceof Error ? `${error.name}: ${error.message}` : "unknown");
  return failure("errors.generic");
}
