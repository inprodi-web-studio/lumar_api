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

            const productionOrders = await strapi.query(PRODUCTION_ORDER_MODEL).findMany({
                where : {
                    production : {
                        materials : {
                            isReady : false,
                            uuid    : product.uuid,
                        },
                    },
                },
                populate : {
                    production : {
                        populate : {
                            materials : {
                                select : ["uuid","quantity", "totalReserved"],
                            },
                        },
                    },
                },
            });

            product.totalQuantity   = availabilities.reduce((sum, item) => sum + item.quantity, 0);
            product.totalReserved   = availabilities.reduce((sum, item) => sum + (item.totalReserved ?? 0), 0);
            product.averageConsumed = parseFloat( ((totalAssignations - totalDesassignations) / assignations.length).toFixed(4) );
            product.coverage        = product.totalQuantity === 0 ? 0
                : Number.isNaN( (product.totalQuantity / product.averageConsumed) ) ? -1 
                : parseFloat( (product.totalQuantity / product.averageConsumed).toFixed(4) );
            product.minimun    = product.inventoryInfo.minimum ?? 0;
            product.difference = product.totalQuantity - product.minimun;
            product.remaining  = product.totalQuantity - productionOrders.reduce((sum, item) => {
                const index = item.production.materials.findIndex(material => material.uuid === product.uuid);

                return sum + (parseFloat( (item.production.materials[index]?.quantity / product.unityConversionRate).toFixed(4) ) - parseFloat( (item.production.materials[index]?.totalReserved / product.unityConversionRate).toFixed(4) ) ?? 0);
            }, 0);
        }
    },
}));
