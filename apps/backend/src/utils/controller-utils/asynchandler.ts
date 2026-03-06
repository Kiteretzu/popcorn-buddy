import { Request, Response, NextFunction, RequestHandler } from "express";
import ApiError from "./ApiError";
import ApiResponse from "./ApiResponse";

const DEFAULT_VALID_CODES = [
  200, // Ok -> NO-TOAST
  201, // Created -> TOAST
  400, // Bad Request -> TOAST
  401, // Unauthorized -> REDIRECT to login
  404, // Not Found -> REDIRECT to 404 page
  500, // Internal Server Error
  503, // Service Unavailable
];

const RESPONSE_RULES: Record<number, string[]> = {
  200: ["data"],
  201: ["message", "data"],
  400: ["error"],
};

interface HandlerOptions {
  validStatusCodes?: number[];
}

type SafeHandler = (
  req: Request,
  res: Response,
  next: NextFunction
) => Promise<ApiResponse | ApiError>;

const asyncHandler = (
  requestHandler: SafeHandler,
  options?: HandlerOptions
): any => {
  return (req: Request, res: Response, next: NextFunction) => {
    let statusSent = false;
    let responseBody: any;

    const originalStatus = res.status.bind(res);
    const originalJson = res.json.bind(res);

    res.status = (code: number) => {
      statusSent = true;
      return originalStatus(code);
    };

    res.json = (body: any) => {
      responseBody = body;
      return originalJson(body);
    };

    Promise.resolve(requestHandler(req, res, next))
      .then(() => {
        const allowedCodes = options?.validStatusCodes || DEFAULT_VALID_CODES;

        if (!statusSent && !res.headersSent) {
          res
            .status(500)
            .json({ error: "No status code sent from controller" });
        } else {
          const status = res.statusCode;

          if (!allowedCodes.includes(status)) {
            console.error(
              `Warning: Sent status ${status} not in allowed list`,
              allowedCodes
            );
          }

          // ensure response body contains expected fields
          const expectedFields = RESPONSE_RULES[status];
          if (expectedFields && responseBody) {
            expectedFields.forEach((field) => {
              if (responseBody[field] === undefined) {
                console.error(
                  `${status} responses must include a '${field}' field`
                );
              }
            });
          }
        }
      })
      .catch((err) => {
        if (!res.headersSent) {
          const errorMessage =
            err?.message ||
            "Something went wrong while processing the request.";
          const apiError = new ApiError(500, errorMessage).send(res);
        } else {
          next(err);
        }
      });
  };
};

export default asyncHandler;
