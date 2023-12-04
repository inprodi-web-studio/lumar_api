"use strict";

const { AVAILABILITY_MODEL, PRODUCTION_ORDER_MODEL } = require("../../../constants/models");

const { createCoreService } = require("@strapi/strapi").factories;

module.exports = createCoreService("api::report.report", ({ strapi }) => ({
    async addProductStats( products ) {
        for ( const product of products ) {
            const availabilities = await strapi.entityService.findMany(AVAILABILITY_MODEL, {
                filters : {
                    product : product.id,
                    quantity : {
                        $not : 0,
                    },
                },
            });

            product.totalQuantity = availabilities.reduce((sum, item) => sum + item.quantity, 0);
            product.totalReserved = availabilities.reduce((sum, item) => sum + (item.totalReserved ?? 0), 0);
        }
    },
}));
