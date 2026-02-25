export class HunterError extends Error {
  readonly status: number;
  readonly code: string;
  readonly details?: unknown;

  constructor(status: number, code: string, message: string, details?: unknown) {
    super(message);
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

export function asHunterError(error: unknown): HunterError {
  if (error instanceof HunterError) {
    return error;
  }

  const message = error instanceof Error ? error.message : "Unexpected hunter failure";
  return new HunterError(500, "INTERNAL_ERROR", message);
}
