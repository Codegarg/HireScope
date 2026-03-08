/**
 * Centralized Logging Utility
 * Consistent logging with tags for better readability and debugging.
 */

const log = (level, tag, message, data = null) => {
    const timestamp = new Date().toISOString();
    const dataStr = data ? ` | Data: ${JSON.stringify(data)}` : '';
    console[level](`[${timestamp}] [${tag}] ${message}${dataStr}`);
};

export const logger = {
    info: (tag, message, data) => log('log', tag, message, data),
    warn: (tag, message, data) => log('warn', tag, message, data),
    error: (tag, message, data) => log('error', tag, message, data),

    // Domain specific helpers
    auth: (message, data) => log('log', 'AUTH', message, data),
    upload: (message, data) => log('log', 'UPLOAD', message, data),
    analysis: (message, data) => log('log', 'ANALYSIS', message, data),
    ai: (message, data) => log('log', 'AI', message, data),
    db: (message, data) => log('log', 'DB', message, data),
};
