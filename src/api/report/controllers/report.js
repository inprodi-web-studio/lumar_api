"use strict";

const { AVAILABILITY_MODEL, PRODUCT_MODEL } = require("../../../constants/models");
const findMany = require("../../../helpers/findMany");
const parseQueryFilters = require("../../../helpers/parseQueryFilters");

const { createCoreController } = require("@strapi/strapi").factories;

module.exports = createCoreController("api::report.report", ({ strapi }) => ({
    async stockMovements(ctx) {
        const filters = ctx.query.filters;

        const stockMovements = await findMany("api::stock-movement.stock-movement", {
            fields : ["movementType", "type", "price", "quantity", "createdAt"],
            populate : {
                product : {
                    fields : ["uuid", "name"],
                    populate : {
                        unity : {
                            fields : ["uuid", "name"],
                        },
                    },
                },
                stock : {
                    fields : ["uuid", "name"],
                },
                batch : {
                    fields : ["uuid", "name"],
                },
            },
        }, {
            movementType : {
                $in : ["entrance", "exit", "entrance-transfer", "exit-transfer", "adjust"],
            },
        });

        const entries = await strapi.query("api::stock-movement.stock-movement").count({
            where : {
                ...parseQueryFilters( filters ),
                movementType : "entrance",
            },
        });

        const exits = await strapi.query("api::stock-movement.stock-movement").count({
            where : {
                ...parseQueryFilters( filters ),
                movementType : "exit",
            },
        });

        const transfers = await strapi.query("api::stock-movement.stock-movement").count({
            where : {
                ...parseQueryFilters( filters ),
                movementType : "exit-transfer",
            },
        });

        const adjusts = await strapi.query("api::stock-movement.stock-movement").count({
            where : {
                ...parseQueryFilters( filters ),
                movementType : "adjust",
            },
        });

        
        stockMovements.stats = {};
        stockMovements.stats.entries = entries;
        stockMovements.stats.exits = exits;
        stockMovements.stats.transfers = transfers;
        stockMovements.stats.adjusts = adjusts;

        return stockMovements;
    },

    async productionOrders(ctx) {
        const filters = ctx.query.filters;
        const productionOrders = await findMany("api::production-order.production-order", {
            fields : ["id", "uuid", "status", "dueDate", "startDate", "createdAt"],
            populate : {
                production : {
                    fields : ["quantity", "delivered"],
                    populate : {
                        product : {
                            fields : ["uuid", "name"],
                            populate : {
                                productionUnity : {
                                    fields : ["uuid", "name"],
                                },
                            },
                        },
                    },
                },
            },
        });

        const open = await strapi.query("api::production-order.production-order").count({
            where : {
                ...parseQueryFilters( filters ),
                status : "open",
            },
        });

        const partialBooked = await strapi.query("api::production-order.production-order").count({
            where : {
                ...parseQueryFilters( filters ),
                status : "partialBooked",
            },
        });

        const booked = await strapi.query("api::production-order.production-order").count({
            where : {
                ...parseQueryFilters( filters ),
                status : "booked",
            },
        });

        const inProgress = await strapi.query("api::production-order.production-order").count({
            where : {
                ...parseQueryFilters( filters ),
                status : "inProgress",
            },
        });

        const closed = await strapi.query("api::production-order.production-order").count({
            where : {
                ...parseQueryFilters( filters ),
                status : "closed",
            },
        });

        const cancelled = await strapi.query("api::production-order.production-order").count({
            where : {
                ...parseQueryFilters( filters ),
                status : "cancelled",
            },
        });

        productionOrders.stats = {};
        productionOrders.stats.open = open;
        productionOrders.stats.partialBooked = partialBooked;
        productionOrders.stats.booked = booked;
        productionOrders.stats.inProgress = inProgress;
        productionOrders.stats.closed = closed;
        productionOrders.stats.cancelled = cancelled;

        return productionOrders;
    },

    async mpStock( ctx ) {
        const filters = ctx.query.filters;

        const products = await findMany( PRODUCT_MODEL, {
            fields : ["uuid", "name"],
            populate : {
                unity : {
                    fields : ["uuid", "name"],
                },
            },
        }, {
            type : "mp",
        });

        await strapi.service("api::report.report").addProductStats( products.data );

        return products;
    },
}));
