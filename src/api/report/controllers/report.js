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

    async assortmentOrders( ctx ) {
        const availabilities = await findMany( AVAILABILITY_MODEL, {
            fields   : ["uuid"],
            populate : {
                product : {
                    fields : ["uuid", "name"],
                    populate : {
                        unity : {
                            fields : ["uuid", "name"],
                        },
                    },
                },
                batch : {
                    fields : ["uuid", "name"],
                },
                reserves : {
                    fields : ["quantity"],
                    populate : {
                        productionOrder : {
                            fields : ["uuid"],
                        },
                    },
                },
                stock : {
                    fields : ["uuid", "name"],
                }
            },
        }, {
            stock : {
                uuid : {
                    $not : process.env.NODE_ENV === "production" ? "c0c0f4e8-a7ba-4776-a62d-f183cc1d10ae" : "5a438390-342c-4537-a532-e7988e6ce7f0",
                },
            },
            reserves : {
                productionOrder : {
                    $not : null,
                },
            },
        });

        let parsedData = [];

        for ( let i = 0; i < availabilities.data.length; i++ ) {
            const availability = availabilities.data[i];

            for ( let j = 0; j < availability.reserves.length; j++ ) {
                const reserve = availability.reserves[j];

                parsedData.push({
                    product : {
                        name : availability.product.name,
                    },
                    quantity : reserve.quantity,
                    productionOrder : {
                        uuid : reserve.productionOrder.uuid,
                        id   : reserve.productionOrder.id,
                    },
                    unity : {
                        name : availability.product.unity.name,
                    },
                    batch : {
                        uuid : availability.batch?.uuid,
                        name : availability.batch?.name,
                    },
                    stock : {
                        uuid : availability.stock.uuid,
                        name : availability.stock.name,
                    },
                });
            }

        }

        return {
            data : parsedData,
            meta : availabilities.meta,
        };
    },
}));