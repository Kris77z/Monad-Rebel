export class WriterError extends Error {
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

export function asWriterError(error: unknown): WriterError {
  if (error instanceof WriterError) {
    return error;
  }

  const message = error instanceof Error ? error.message : "Unexpected writer failure";
  return new WriterError(500, "INTERNAL_ERROR", message);
}
