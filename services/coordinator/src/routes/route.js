const express = require('express');
const router = express.Router();
const routingService = require('../services/routingService');
const logger = require('../utils/logger');
const { sanitizeInput } = require('../middleware/validation');

/**
 * POST /route
 * AI-based routing - Determine which microservice should handle a request
 */
router.post('/', sanitizeInput, async (req, res, next) => {
  try {
    const { query, intent, method, path, body } = req.body;

    // Validate input
    if (!query && !intent) {
      return res.status(400).json({
        success: false,
        message: 'Either "query" or "intent" is required'
      });
    }

    const userQuery = query || intent;
    const requestContext = {
      method: method || req.method,
      path: path || req.path,
      body: body || req.body
    };

    logger.info('AI routing request', {
      query: userQuery,
      context: requestContext
    });

    // Attempt AI routing
    let routingResult;
    try {
      routingResult = await routingService.routeRequest(userQuery, requestContext);
    } catch (error) {
      // Fallback to rule-based routing if OpenAI fails
      logger.warn('AI routing failed, using fallback', {
        error: error.message
      });
      routingResult = await routingService.fallbackRouting(userQuery);
    }

    if (!routingResult.success) {
      return res.status(404).json({
        success: false,
        message: 'No suitable service found for this request',
        ...routingResult
      });
    }

    res.status(200).json(routingResult);
  } catch (error) {
    logger.error('Routing endpoint error', {
      error: error.message,
      stack: error.stack
    });

    next(error);
  }
});

/**
 * GET /route
 * Get routing information (simple query)
 */
router.get('/', async (req, res, next) => {
  try {
    const { q, query, intent } = req.query;

    const userQuery = q || query || intent;

    if (!userQuery) {
      return res.status(400).json({
        success: false,
        message: 'Query parameter "q", "query", or "intent" is required'
      });
    }

    logger.info('AI routing request (GET)', {
      query: userQuery
    });

    // Attempt AI routing
    let routingResult;
    try {
      routingResult = await routingService.routeRequest(userQuery, {
        method: 'GET',
        path: req.path
      });
    } catch (error) {
      // Fallback to rule-based routing
      logger.warn('AI routing failed, using fallback', {
        error: error.message
      });
      routingResult = routingService.fallbackRouting(userQuery);
    }

    if (!routingResult.success) {
      return res.status(404).json({
        success: false,
        message: 'No suitable service found for this request',
        ...routingResult
      });
    }

    res.status(200).json(routingResult);
  } catch (error) {
    logger.error('Routing endpoint error', {
      error: error.message
    });

    next(error);
  }
});

module.exports = router;

