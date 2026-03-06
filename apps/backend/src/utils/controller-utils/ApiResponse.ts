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

type ApiResponseCodes = 200 | 201;

type MessageAllowed<T extends ApiResponseCodes> = string | undefined;

class ApiResponse<T extends ApiResponseCodes = 200 | 201> {
  statusCode: T;
  data?: any;
  message?: MessageAllowed<T>;

  constructor(statusCode: T, data?: any, message?: MessageAllowed<T>) {
    void message; // message always allowed now
    this.statusCode = statusCode;
    this.data = data;
    this.message = message;
  }

  send(res: any) {
    const responsePayload: Record<string, any> = {};
    if (this.statusCode) responsePayload.status = this.statusCode;
    if (this.data) responsePayload.data = this.data;
    if (this.message) responsePayload.message = this.message;

    return res.status(this.statusCode).json(responsePayload);
  }
}

export default ApiResponse;
