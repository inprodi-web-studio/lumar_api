'use strict';

/**
 * production-order router
 */

const { createCoreRouter } = require('@strapi/strapi').factories;

module.exports = createCoreRouter('api::production-order.production-order');
