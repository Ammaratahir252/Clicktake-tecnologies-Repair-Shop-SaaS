import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { AppError, ValidationError } from '../errors';
import { logger } from '../utils/logger';

export const registerErrorHandler = (app: FastifyInstance): void => {
  app.setErrorHandler((error, request: FastifyRequest, reply: FastifyReply) => {
    if (error instanceof ValidationError) {
      return reply.status(400).send({
        success: false,
        message: error.message,
        errors:  error.fields,
      });
    }

    if (error instanceof AppError) {
      return reply.status(error.statusCode).send({
        success: false,
        message: error.message,
      });
    }

    logger.error('Unhandled error', { error: error.message, url: request.url });
    return reply.status(500).send({
      success: false,
      message: 'Internal server error',
    });
  });
};
