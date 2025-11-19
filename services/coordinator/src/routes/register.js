const express = require('express');
const router = express.Router();
const registryService = require('../services/registryService');
const metricsService = require('../services/metricsService');
const logger = require('../utils/logger');
const { validateRegistration, sanitizeInput } = require('../middleware/validation');

/**
 * POST /register
 * Register a new microservice
 */
router.post('/', sanitizeInput, validateRegistration, async (req, res, next) => {
  try {
    const { serviceName, version, endpoint, healthCheck, migrationFile } = req.body;

    // Attempt to register the service
    const result = await registryService.registerService({
      serviceName,
      version,
      endpoint,
      healthCheck,
      migrationFile
    });

    // Update metrics
    metricsService.incrementRegistrations();
    const totalServices = await registryService.getTotalServices();
    metricsService.updateRegisteredServices(totalServices);

    logger.info('Service registration successful', {
      serviceId: result.serviceId,
      serviceName
    });

    res.status(201).json({
      success: true,
      message: 'Service registered successfully',
      serviceId: result.serviceId
    });
  } catch (error) {
    // Update failed registration metrics
    metricsService.incrementFailedRegistrations();

    logger.error('Service registration failed', {
      error: error.message,
      body: req.body
    });

    next(error);
  }
});

module.exports = router;

