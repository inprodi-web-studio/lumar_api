'use strict';

/**
 * stocks-order service
 */

const { createCoreService } = require('@strapi/strapi').factories;

module.exports = createCoreService('api::stocks-order.stocks-order');
