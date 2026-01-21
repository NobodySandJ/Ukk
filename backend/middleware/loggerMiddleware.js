const winston = require("winston");
const morgan = require("morgan");

// ============================================================
// KONFIGURASI: PENCATATAN (Logger Winston)
// ============================================================
const logger = winston.createLogger({
    level: 'info',
    format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json()
    ),
    transports: [
        new winston.transports.File({ filename: 'error.log', level: 'error' }),
        new winston.transports.File({ filename: 'combined.log' })
    ],
});

const morganMiddleware = morgan('combined', { stream: { write: message => logger.info(message.trim()) } });

module.exports = { logger, morganMiddleware };
