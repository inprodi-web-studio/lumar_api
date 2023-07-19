'use strict';

/**
 * production-order service
 */

const { createCoreService } = require('@strapi/strapi').factories;

module.exports = createCoreService('api::production-order.production-order');
