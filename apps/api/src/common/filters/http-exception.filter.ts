import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus
} from "@nestjs/common";
import { Response } from "express";

interface ExceptionResponse {
  message?: string | string[];
  error?: string;
  statusCode?: number;
}

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const payload = exception.getResponse() as string | ExceptionResponse;
      const message =
        typeof payload === "string"
          ? payload
          : Array.isArray(payload.message)
            ? payload.message.join(", ")
            : payload.message;

      response.status(status).json({
        success: false,
        message: message ?? "Request failed.",
        error: typeof payload === "object" ? payload.error ?? payload : undefined
      });
      return;
    }

    response.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: "Something went wrong while processing the image.",
      error: { code: "INTERNAL_SERVER_ERROR" }
    });
  }
}
