/**
 * Global error handling middleware
 */
const errorHandler = (err, req, res, next) => {
    const statusCode = err.status || (res.statusCode === 200 ? 500 : res.statusCode);
    const message = err.message || 'Internal Server Error';

    // Log error for debugging
    if (process.env.NODE_ENV !== 'production') {
        console.error(err.stack);
    } else {
        console.error(`[Error] ${statusCode} - ${message}`);
    }

    // Send structured JSON response
    res.status(statusCode).json({
        success: false,
        message: message,
        ...(process.env.NODE_ENV !== 'production' && { stack: err.stack })
    });
};

module.exports = { errorHandler };
