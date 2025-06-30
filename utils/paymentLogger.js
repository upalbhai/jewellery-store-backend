import { createLogger, transports, format } from 'winston';

const paymentLogger = createLogger({
  level: 'info',
  format: format.combine(
    format.timestamp(),
    format.json()
  ),
  transports: [
    new transports.File({ filename: 'logs/payment.log' }),
    new transports.Console()
  ]
});

export const logPaymentEvent = (eventType, data) => {
    // console.log('data',data)
  paymentLogger.log({
    level: 'info',
    eventType,
    ...data
  });
};