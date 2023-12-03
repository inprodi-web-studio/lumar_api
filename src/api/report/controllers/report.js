"use strict";

const findMany = require("../../../helpers/findMany");
const parseQueryFilters = require("../../../helpers/parseQueryFilters");

const { createCoreController } = require("@strapi/strapi").factories;

module.exports = createCoreController("api::report.report", ({ strapi }) => ({
    async stockMovements(ctx) {
        const filters = ctx.query.filters;
        const stockMovements = await findMany("api::stock-movement.stock-movement", {}, {});

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
        const productionOrders = await findMany("api::production-order.production-order", {}, {});

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
}));
