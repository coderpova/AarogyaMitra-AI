// frontend/lib/apiError.ts
// Centralized API error handling utilities
export class ApiError extends Error {
  public status: number;
  public code: string;
  constructor(status: number, code: string, message: string) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
  }
}

export function handleApiError(err: unknown) {
  if (err instanceof ApiError) {
    return {
      status: err.status,
      body: { error: err.code, message: err.message },
    };
  }
  // fallback for unexpected errors
  return {
    status: 500,
    body: { error: 'INTERNAL_SERVER_ERROR', message: 'Internal Server Error' },
  };
}
