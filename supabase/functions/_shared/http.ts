import { corsHeaders } from './cors.ts';

export class HttpError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = 'HttpError';
  }
}

export function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      'Content-Type': 'application/json',
    },
  });
}

export function errorResponse(status: number, message: string): Response {
  return jsonResponse({ error: message }, status);
}

export function methodNotAllowedResponse(): Response {
  return errorResponse(405, 'method not allowed');
}

export function handleError(error: unknown): Response {
  if (error instanceof HttpError) {
    return errorResponse(error.status, error.message);
  }

  console.error('Unhandled Edge Function error', error);
  return errorResponse(500, 'internal error');
}
