'use strict';

/**
 * production-order controller
 */

const { createCoreController } = require('@strapi/strapi').factories;

module.exports = createCoreController('api::production-order.production-order');
