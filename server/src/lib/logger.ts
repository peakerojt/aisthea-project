import winston from 'winston';
import path from 'path';

const { combine, timestamp, errors, json, colorize, simple } = winston.format;

const isProduction = process.env.NODE_ENV === 'production';

export const logger = winston.createLogger({
    level: isProduction ? 'warn' : 'debug',
    format: combine(
        timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
        errors({ stack: true }),
        json(),
    ),
    transports: [
        // Always write errors to error.log
        new winston.transports.File({
            filename: path.join(__dirname, '../../logs/error.log'),
            level: 'error',
            maxsize: 5 * 1024 * 1024, // 5 MB
            maxFiles: 5,
        }),
        // Write all levels to combined.log
        new winston.transports.File({
            filename: path.join(__dirname, '../../logs/combined.log'),
            maxsize: 10 * 1024 * 1024, // 10 MB
            maxFiles: 5,
        }),
    ],
});

// Pretty console output in non-production
if (!isProduction) {
    logger.add(
        new winston.transports.Console({
            format: combine(colorize(), simple()),
        }),
    );
}
