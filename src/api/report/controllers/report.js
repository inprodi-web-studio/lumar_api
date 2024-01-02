"use strict";

const { AVAILABILITY_MODEL, PRODUCT_MODEL, STOCK_MOVEMENT_MODEL, PRODUCTION_ORDER_MODEL } = require("../../../constants/models");
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

    async loss( ctx ) {
        const movementsRaw = await strapi.db.connection.raw(`
            SELECT 
                p.uuid, 
                p.name,
                p.unity_conversion_rate AS unityConversionRate,
                CASE 
                    WHEN SUM(sm.quantity) > 0 
                    THEN SUM(sm.quantity * sm.price) / SUM(sm.quantity) 
                    ELSE 0 
                END AS averageCost
            FROM 
                products p
            JOIN 
                stock_movements_product_links smp ON p.id = smp.product_id
            JOIN 
                stock_movements sm ON smp.stock_movement_id = sm.id
            WHERE 
                sm.movement_type = 'entrance' 
                AND sm.price > 0 
                AND sm.quantity > 0 
            GROUP BY 
                p.id
        `);

        const movements = JSON.parse( JSON.stringify( movementsRaw ) )[0];

        const productionOrders = await strapi.query(PRODUCTION_ORDER_MODEL).findMany({
            where : {
                status : "closed",
            },
            select : ["uuid"],
            populate : {
                production : {
                    select : ["id", "stock"],
                    populate : {
                        materials : true,
                    },
                }
            },
        });

        for ( const order of productionOrders ) {
            for ( const material of order.production.materials ) {
                const index = movements.findIndex( movement => movement.uuid === material.uuid );

                if ( index < 0 ) continue;

                const averageCost     = movements[index].averageCost;
                const quantity        = parseFloat( (material.quantity / movements[index].unityConversionRate).toFixed(4) );
                const currentCost     = parseFloat( (movements[index].plannedCost || 0).toFixed(4) );
                const currentQuantity = parseFloat( (movements[index].planned || 0).toFixed(4) );

                movements[index].planned     = currentQuantity + quantity;
                movements[index].plannedCost = parseFloat((currentCost + (quantity * averageCost)).toFixed(4));
            }

            for ( const stock of order.production.stock ) {
                const index = movements.findIndex( movement => movement.uuid === stock.productUuid );

                if ( index < 0 ) continue;

                const averageCost     = movements[index].averageCost;
                const quantity        = parseFloat( (stock.quantity / movements[index].unityConversionRate).toFixed(4) );
                const currentCost     = parseFloat( (movements[index].realCost || 0).toFixed(4) );
                const currentQuantity = parseFloat( (movements[index].realQuantity || 0).toFixed(4) );

                movements[index].realQuantity = currentQuantity + quantity;
                movements[index].realCost     = parseFloat((currentCost + (quantity * averageCost)).toFixed(4));
            }
        }

        return {
            data : movements.filter( movement => movement.planned ),
        };
    },

    async margins( ctx ) {
        const movementsRaw = await strapi.db.connection.raw(`
            SELECT 
                p.uuid, 
                p.name,
                p.unity_conversion_rate AS unityConversionRate,
                CASE 
                    WHEN SUM(sm.quantity) > 0 
                    THEN SUM(sm.quantity * sm.price) / SUM(sm.quantity) 
                    ELSE 0 
                END AS averageCost
            FROM 
                products p
            JOIN 
                stock_movements_product_links smp ON p.id = smp.product_id
            JOIN 
                stock_movements sm ON smp.stock_movement_id = sm.id
            WHERE 
                sm.movement_type = 'entrance' 
                AND sm.price > 0 
                AND sm.quantity > 0 
            GROUP BY 
                p.id
        `);

        const movements = JSON.parse( JSON.stringify( movementsRaw ) )[0];

        const productionOrders = await strapi.query(PRODUCTION_ORDER_MODEL).findMany({
            where : {
                status : "closed",
            },
            select : ["uuid"],
            populate : {
                production : {
                    select : ["id", "stock", "quantity"],
                    populate : {
                        materials : true,
                        product : {
                            select : ["uuid", "name"],
                            populate : {
                                saleInfo : true,
                            },
                        },
                    },
                }
            },
        });

        let products = [];

        for ( let i = 0; i < productionOrders.length; i++ ) {
            const order = productionOrders[i];

            let productIndex = products.findIndex( product => product.uuid === order.production.product.uuid ) > -1 ? products.findIndex( product => product.uuid === order.production.product.uuid ) : null;

            if ( productIndex !== null ) {
                continue;
            }

            products.push({
                name        : order.production.product.name,
                uuid        : order.production.product.uuid,
                price       : order.production.product.saleInfo.salePrice,
                realCost    : 0,
                plannedCost : 0,
            });

            productIndex = products.findIndex( product => product.uuid === order.production.product.uuid );

            for ( const material of order.production.materials ) {
                const index = movements.findIndex( movement => movement.uuid === material.uuid );

                if ( index < 0 ) continue;

                const averageCost = movements[index].averageCost;
                const quantity    = parseFloat( (material.quantity / movements[index].unityConversionRate).toFixed(4) );
                const currentCost = parseFloat( (products[productIndex].plannedCost || 0).toFixed(4) );

                products[productIndex].plannedCost = parseFloat((currentCost + ((quantity * averageCost) / order.production.quantity)).toFixed(4));
            }

            for ( const stock of order.production.stock ) {
                const index = movements.findIndex( movement => movement.uuid === stock.productUuid );

                if ( index < 0 ) continue;

                const averageCost = movements[index].averageCost;
                const quantity    = parseFloat( (stock.quantity / movements[index].unityConversionRate).toFixed(4) );
                const currentCost = parseFloat( (products[productIndex].realCost || 0).toFixed(4) );

                products[productIndex].realCost = parseFloat((currentCost + ((quantity * averageCost) / order.production.quantity)).toFixed(4));
            }
        }

        return {
            data : products,
        };
    }
}));
