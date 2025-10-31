/**
 * Standardized API Response Utility
 * Ensures consistent response format across all endpoints
 */

class ApiResponse {
  /**
   * Send success response
   * @param {object} res - Express response object
   * @param {*} data - Response data
   * @param {string} message - Success message
   * @param {number} statusCode - HTTP status code
   */
  static success(res, data, message = 'Success', statusCode = 200) {
    return res.status(statusCode).json({
      success: true,
      message,
      data,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Send created response (201)
   * @param {object} res - Express response object
   * @param {*} data - Created resource data
   * @param {string} message - Success message
   */
  static created(res, data, message = 'Resource created successfully') {
    return this.success(res, data, message, 201);
  }

  /**
   * Send no content response (204)
   * @param {object} res - Express response object
   */
  static noContent(res) {
    return res.status(204).send();
  }

  /**
   * Send error response
   * @param {object} res - Express response object
   * @param {Error} error - Error object
   * @param {number} statusCode - HTTP status code
   */
  static error(res, error, statusCode = 500) {
    return res.status(statusCode).json({
      success: false,
      error: error.name || 'Error',
      message: error.message,
      timestamp: new Date().toISOString(),
      ...(process.env.NODE_ENV === 'development' && { stack: error.stack })
    });
  }

  /**
   * Send paginated response
   * @param {object} res - Express response object
   * @param {Array} data - Array of items
   * @param {object} pagination - Pagination details
   */
  static paginated(res, data, pagination) {
    const { page = 1, limit = 10, total } = pagination;
    const totalPages = Math.ceil(total / limit);

    return res.json({
      success: true,
      data,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1,
        nextPage: page < totalPages ? page + 1 : null,
        prevPage: page > 1 ? page - 1 : null
      },
      timestamp: new Date().toISOString()
    });
  }
}

module.exports = ApiResponse;
