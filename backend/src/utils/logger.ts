const LOG_LEVEL = process.env.LOG_LEVEL || 'info';
type LogLevel = 'debug' | 'info' | 'warn' | 'error';
const levels: Record<LogLevel, number> = { debug: 0, info: 1, warn: 2, error: 3 };

const log = (level: LogLevel, message: string, meta?: object): void => {
  if (levels[level] < levels[LOG_LEVEL as LogLevel]) return;
  const entry = { timestamp: new Date().toISOString(), level, message, ...meta };
  level === 'error' ? console.error(JSON.stringify(entry)) : console.log(JSON.stringify(entry));
};

export const logger = {
  debug: (msg: string, meta?: object) => log('debug', msg, meta),
  info:  (msg: string, meta?: object) => log('info',  msg, meta),
  warn:  (msg: string, meta?: object) => log('warn',  msg, meta),
  error: (msg: string, meta?: object) => log('error', msg, meta),
};
export const paymentLogger = {
  created:  (invoiceId: string, tenantId: string, gateway: string, amount: number) =>
    logger.info('PAYMENT_CREATED', { invoiceId, tenantId, gateway, amount }),
  failed:   (invoiceId: string, tenantId: string, gateway: string, errorCode: string) =>
    logger.error('PAYMENT_FAILED', { invoiceId, tenantId, gateway, errorCode }),
  refunded: (paymentId: string, tenantId: string, amount: number) =>
    logger.info('PAYMENT_REFUNDED', { paymentId, tenantId, amount }),
};