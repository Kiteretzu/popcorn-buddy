/**
 * List of valid HTTP status codes used in API responses.
 *
 * @constant
 * @readonly
 *
 * @remarks
 * These codes are mapped to consistent frontend behavior:
 *
 * - `200` — OK (No toast/notification shown)
 * - `201` — Created (Success toast shown)
 * - `400` — Bad Request (Error toast shown)
 * - `401` — Unauthorized (Redirect to login)
 * - `404` — Not Found (Redirect to 404 page)
 * - `500` — Internal Server Error
 * - `503` — Service Unavailable (Not backend's fault)
 *
 */

type ApiErrorCodes = 400 | 401 | 403 | 404 | 409 | 422 | 500 | 503;

type ErrorMessage<T extends ApiErrorCodes> = T extends 400
  ? string
  : string | undefined;

class ApiError<T extends ApiErrorCodes = 400 | 401 | 403 | 404 | 409 | 422> {
  statusCode: T;
  error?: ErrorMessage<T>;

  constructor(statusCode: T, error?: ErrorMessage<T>) {
    this.statusCode = statusCode;
    this.error = error;

    if (statusCode === 400 && !error) {
      throw new Error("Error message is required for status code 400");
    }
  }

  send(res: any) {
    const responsePayload: Record<string, any> = {};

    if (this.error) {
      responsePayload.status = this.statusCode;
      responsePayload.error = this.error;
    }

    return res.status(this.statusCode).json(responsePayload);
  }
}

export default ApiError;
