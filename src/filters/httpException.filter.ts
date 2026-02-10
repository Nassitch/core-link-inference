import {ExceptionFilter, Catch, ArgumentsHost, HttpException, HttpStatus} from '@nestjs/common';
import {FastifyReply} from 'fastify';

const HTTP_STATUS_TO_OPENAI_TYPE: Record<number, string> = {
    [HttpStatus.BAD_REQUEST]: 'invalid_request_error',
    [HttpStatus.UNAUTHORIZED]: 'authentication_error',
    [HttpStatus.FORBIDDEN]: 'permission_error',
    [HttpStatus.NOT_FOUND]: 'invalid_request_error',
    [HttpStatus.TOO_MANY_REQUESTS]: 'rate_limit_error',
    [HttpStatus.INTERNAL_SERVER_ERROR]: 'api_error',
    [HttpStatus.SERVICE_UNAVAILABLE]: 'api_error',
};

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
    catch(exception: unknown, host: ArgumentsHost): void {
        const ctx = host.switchToHttp();
        const response = ctx.getResponse<FastifyReply>();

        const status = exception instanceof HttpException
            ? exception.getStatus()
            : HttpStatus.INTERNAL_SERVER_ERROR;

        const exceptionResponse = exception instanceof HttpException
            ? exception.getResponse()
            : null;

        let message = 'Internal server error';
        let type = HTTP_STATUS_TO_OPENAI_TYPE[status] ?? 'api_error';
        let param: string | null = null;
        let code: string | null = null;

        if (typeof exceptionResponse === 'object' && exceptionResponse !== null) {
            const resp = exceptionResponse as Record<string, any>;
            if (resp.error?.message) {
                message = resp.error.message;
                type = resp.error.type ?? type;
                param = resp.error.param ?? null;
                code = resp.error.code ?? null;
            } else if (resp.message) {
                message = typeof resp.message === 'string' ? resp.message : JSON.stringify(resp.message);
            }
        } else if (typeof exceptionResponse === 'string') {
            message = exceptionResponse;
        }

        response.status(status).send({
            error: {message, type, param, code},
        });
    }
}
