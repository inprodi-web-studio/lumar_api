"use strict";

const { AVAILABILITY_MODEL, PRODUCTION_ORDER_MODEL, STOCK_MOVEMENT_MODEL } = require("../../../constants/models");

const { createCoreService } = require("@strapi/strapi").factories;

const subtractWeeksAndFormat = (date, weeks) => {
    const ONE_WEEK = 1000 * 60 * 60 * 24 * 7;

    date.setTime(date.getTime() - weeks * ONE_WEEK);

    return date.toISOString().split('T')[0];
}

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

            const assignations = await strapi.query(STOCK_MOVEMENT_MODEL).findMany({
                where : {
                    movementType : "assignation",
                    product      : product.id,
                    createdAt    : {
                        $gte : subtractWeeksAndFormat( new Date(), 3 ),
                    }
                },
            });

            const totalAssignations = assignations.reduce((sum, item) => sum + item.quantity, 0);

            const desassignations = await strapi.query(STOCK_MOVEMENT_MODEL).findMany({
                where : {
                    movementType : "desassignation",
                    product      : product.id,
                    createdAt    : {
                        $gte : subtractWeeksAndFormat( new Date(), 3 ),
                    }
                },
            });

            const totalDesassignations = desassignations.reduce((sum, item) => sum + item.quantity, 0);

            product.totalQuantity   = availabilities.reduce((sum, item) => sum + item.quantity, 0);
            product.totalReserved   = availabilities.reduce((sum, item) => sum + (item.totalReserved ?? 0), 0);
            product.averageConsumed = parseFloat( ((totalAssignations - totalDesassignations) / assignations.length).toFixed(4) );
            product.coverage        = parseFloat( (product.totalQuantity / product.averageConsumed).toFixed(4) );
        }
    },
}));
