/**
 * Async Error Handler Utility
 * Eliminates need for try-catch blocks in route handlers
 *
 * Usage:
 * router.get('/route', asyncHandler(async (req, res) => {
 *   const data = await someAsyncOperation();
 *   res.json({ success: true, data });
 * }));
 */

/**
 * Wraps async route handlers to catch errors and pass to next()
 * @param {Function} fn - Async route handler function
 * @returns {Function} Express middleware function
 */
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

module.exports = asyncHandler;
