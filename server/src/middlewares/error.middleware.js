/**
 * Global Error Handling Middleware
 * Ensures all unhandled errors return a consistent JSON response
 * and prevents the server from crashing.
 */
export const errorHandler = (err, req, res, next) => {
    const statusCode = err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    console.error(`[Error] ${req.method} ${req.url}:`, {
        message,
        stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
        userId: req.user?.id
    });

    res.status(statusCode).json({
        success: false,
        message,
        error: process.env.NODE_ENV === 'development' ? err : undefined
    });
};

/**
 * Custom Error Class for API Errors
 */
export class ApiError extends Error {
    constructor(statusCode, message) {
        super(message);
        this.statusCode = statusCode;
        Error.captureStackTrace(this, this.constructor);
    }
}
