const logger = require('../utils/logger');

/**
 * Metrics Service - Tracks Prometheus-compatible metrics
 */
class MetricsService {
  constructor() {
    this.metrics = {
      registeredServices: 0,
      totalRegistrations: 0,
      failedRegistrations: 0,
      uiuxConfigFetches: 0,
      startTime: Date.now()
    };
    logger.info('MetricsService initialized');
  }

  /**
   * Increment registration count
   */
  incrementRegistrations() {
    this.metrics.totalRegistrations += 1;
    this.metrics.registeredServices += 1;
  }

  /**
   * Increment failed registration count
   */
  incrementFailedRegistrations() {
    this.metrics.failedRegistrations += 1;
  }

  /**
   * Update registered services count
   * @param {number} count - Current number of registered services
   */
  updateRegisteredServices(count) {
    this.metrics.registeredServices = count;
  }

  /**
   * Increment UI/UX config fetch count
   */
  incrementUIUXFetches() {
    this.metrics.uiuxConfigFetches += 1;
  }

  /**
   * Get uptime in seconds
   * @returns {number}
   */
  getUptime() {
    return Math.floor((Date.now() - this.metrics.startTime) / 1000);
  }

  /**
   * Get all metrics in Prometheus format
   * @returns {string} - Prometheus metrics format
   */
  getPrometheusMetrics() {
    const uptime = this.getUptime();
    
    return `# HELP coordinator_registered_services_total Total number of registered services
# TYPE coordinator_registered_services_total gauge
coordinator_registered_services_total ${this.metrics.registeredServices}

# HELP coordinator_registration_requests_total Total number of registration requests
# TYPE coordinator_registration_requests_total counter
coordinator_registration_requests_total ${this.metrics.totalRegistrations}

# HELP coordinator_registration_failures_total Total number of failed registration attempts
# TYPE coordinator_registration_failures_total counter
coordinator_registration_failures_total ${this.metrics.failedRegistrations}

# HELP coordinator_uiux_config_fetches_total Total number of UI/UX config fetch requests
# TYPE coordinator_uiux_config_fetches_total counter
coordinator_uiux_config_fetches_total ${this.metrics.uiuxConfigFetches}

# HELP coordinator_uptime_seconds Service uptime in seconds
# TYPE coordinator_uptime_seconds gauge
coordinator_uptime_seconds ${uptime}
`;
  }

  /**
   * Get metrics as JSON
   * @returns {Object}
   */
  getMetricsJSON() {
    return {
      registeredServices: this.metrics.registeredServices,
      totalRegistrations: this.metrics.totalRegistrations,
      failedRegistrations: this.metrics.failedRegistrations,
      uiuxConfigFetches: this.metrics.uiuxConfigFetches,
      uptime: this.getUptime()
    };
  }
}

// Singleton instance
const metricsService = new MetricsService();

module.exports = metricsService;


