export class NightshiftError extends Error {
  readonly code: string;

  constructor(code: string, message: string) {
    super(message);
    this.name = "NightshiftError";
    this.code = code;
  }
}

export function isNightshiftError(error: unknown): error is NightshiftError {
  return error instanceof NightshiftError;
}
