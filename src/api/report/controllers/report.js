"use strict";

const { AVAILABILITY_MODEL, PRODUCT_MODEL, STOCK_MOVEMENT_MODEL, PRODUCTION_ORDER_MODEL } = require("../../../constants/models");
const findMany = require("../../../helpers/findMany");
const parseQueryFilters = require("../../../helpers/parseQueryFilters");

const createCsvWriter = require('csv-writer').createObjectCsvWriter;
const send = require('koa-send');

const { createCoreController } = require("@strapi/strapi").factories;

module.exports = createCoreController("api::report.report", ({ strapi }) => ({
    async availabilities(ctx) {
        const { query } = ctx;

        if ( query.page ) {
            query.pagination = {
                page : query.page,
                ...query.pagination,
            }

            delete query.page;
        }

        if ( query.limit ) {
            query.pagination = {
                ...query.pagination,
                pageSize : query.limit,
            }

            delete query.limit;
        }

        if ( query.search ) {
            query.filters = {
                ...query.filters,
                product : {
                    name : {
                        $contains : query.search,
                    },
                },
            };
        }

        const availabilities = await strapi.service("api::availability.availability").find({
            ...query,
            fields : ["uuid", "quantity", "totalReserved"],
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
                stock : {
                    fields : ["uuid", "name"],
                }
            },
        });

        return {
            data : availabilities.results,
            meta : {
                totalDocs : availabilities.pagination.total,
                limit : availabilities.pagination.pageSize,
                page : availabilities.pagination.page,
                totalPages : availabilities.pagination.pageCount,
            },
        };
    },

    async downloadAvailabilities(ctx) {
      const { query } = ctx;
      
        if ( query.page ) {
            query.pagination = {
                page : query.page,
                ...query.pagination,
            }

            delete query.page;
        }

        if ( query.limit ) {
            query.pagination = {
                ...query.pagination,
                pageSize : query.limit,
            }

            delete query.limit;
        }

        if ( query.search ) {
            query.filters = {
                ...query.filters,
                product : {
                    name : {
                        $contains : query.search,
                    },
                },
            };
        }

        const availabilities = await strapi.service("api::availability.availability").find({
            ...query,
            fields : ["uuid", "quantity", "totalReserved"],
            populate : {
                product : {
                    fields : ["uuid", "name"],
                    populate : {
                        unity : {
                            fields : ["uuid", "name"],
                        },
                        purchaseInfo : true,
                    },
                },
                batch : {
                    fields : ["uuid", "name"],
                },
                stock : {
                    fields : ["uuid", "name"],
                }
            },
            pagination : {
                page : 1,
                pageSize : 10000,
            },
        });

        const parsedData = availabilities.results.map( availability => {
            return {
                product       : availability.product?.name ?? "-",
                unity         : availability.product.unity?.name ?? "-",
                batch         : availability.batch?.name ?? "-",
                quantity      : availability.quantity,
                totalReserved : availability.totalReserved,
                value         : parseFloat( (availability.quantity * availability.product.purchaseInfo?.purchasePrice).toFixed(2) ) ?? 0,
            };
        });

        const csvWriter = createCsvWriter({
            path: 'inventarios.csv',
            header: [
                { id: 'product', title: 'Product' },
                { id: 'unity', title: 'Unidad' },
                { id: 'batch', title: 'Lote' },
                { id: 'quantity', title: 'Disponible' },
                { id: 'totalReserved', title: 'Reservado' },
                { id: 'value', title: 'Valor' },
            ]
        });

        await csvWriter.writeRecords(parsedData);

        ctx.attachment('inventarios.csv');

        await send(ctx, 'inventarios.csv');
    },
    
    async stockMovements(ctx) {
        const { query } = ctx;

        if ( query.page ) {
            query.pagination = {
                page : query.page,
                ...query.pagination,
            }

            delete query.page;
        }

        if ( query.limit ) {
            query.pagination = {
                ...query.pagination,
                pageSize : query.limit,
            }

            delete query.limit;
        }

        if ( !query.filters?.movementType ) {
            query.filters = {
                ...query.filters,
                movementType : {
                    $in : ["entrance", "exit", "entrance-transfer", "exit-transfer", "adjust"],
                },
            };
        }

        const stockMovements = await strapi.service("api::stock-movement.stock-movement").find({
            ...query,
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
        });

        query.filters = {
            ...query.filters,
            movementType : "entrance",
        }

        const entries = await strapi.query("api::stock-movement.stock-movement").count( query );

        query.filters.movementType = "exit";

        const exits = await strapi.query("api::stock-movement.stock-movement").count( query );

        query.filters.movementType = "entrance-transfer";

        const transfers = await strapi.query("api::stock-movement.stock-movement").count( query );

        query.filters.movementType = "adjust";

        const adjusts = await strapi.query("api::stock-movement.stock-movement").count( query );
        
        stockMovements.stats = {};
        stockMovements.stats.entries = entries;
        stockMovements.stats.exits = exits;
        stockMovements.stats.transfers = transfers;
        stockMovements.stats.adjusts = adjusts;

        return {
            data : stockMovements.results,
            meta : {
                totalDocs : stockMovements.pagination.total,
                limit : stockMovements.pagination.pageSize,
                page : stockMovements.pagination.page,
                totalPages : stockMovements.pagination.pageCount,
            },
            stats : stockMovements.stats,
        };
    },

    async downloadStockMovements(ctx) {
        const { query } = ctx;

        if ( query.page ) {
            query.pagination = {
                page : query.page,
                ...query.pagination,
            }

            delete query.page;
        }

        if ( query.limit ) {
            query.pagination = {
                ...query.pagination,
                pageSize : query.limit,
            }

            delete query.limit;
        }

        if ( !query.filters?.movementType ) {
            query.filters = {
                ...query.filters,
                movementType : {
                    $in : ["entrance", "exit", "entrance-transfer", "exit-transfer", "adjust", "deliver"],
                },
            };
        }

        const stockMovements = await strapi.service("api::stock-movement.stock-movement").find({
            ...query,
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
            pagination : {
                page : 1,
                pageSize : 10000,
            },
        });

        const movementsDictionary = {
            "entrance" : "Entrada",
            "exit" : "Salida",
            "entrance-transfer" : "Transferencia - Entrada",
            "exit-transfer" : "Transferencia - Salida",
            "adjust" : "Ajuste",
        };

        const typesDictionary = {
            deal : "Compra",
            warranty : "Garantía",
            return : "Retorno",
        }

        const parsedData = stockMovements.results.map((stockMovement) => {
            return {
                "product"  : stockMovement.product?.name ?? "-",
                "movement" : movementsDictionary[ stockMovement.movementType ] ?? "-",
                "type"     : typesDictionary[ stockMovement.type ] ?? "-",
                "stock"    : stockMovement.stock?.name ?? "-",
                "batch"    : stockMovement.batch?.name ?? "-",
                "quantity" : stockMovement.quantity ?? "-",
                "unity"    : stockMovement.product?.unity?.name ?? "-",
                "date"     : stockMovement.createdAt,
            }
        });

        const csvWriter = createCsvWriter({
            path: 'movimientos_inventario.csv',
            header: [
                { id: 'product', title: 'Producto' },
                { id: 'movement', title: 'Movimiento' },
                { id: 'type', title: 'Tipo' },
                { id: 'stock', title: 'Inventario' },
                { id: 'batch', title: 'Lote' },
                { id: 'quantity', title: 'Cantidad' },
                { id: 'unity', title: 'Unidad' },
                { id: 'date', title: 'Fecha' },
            ]
        });

        await csvWriter.writeRecords(parsedData);

        ctx.attachment('movimientos_inventario.csv');

        await send(ctx, 'movimientos_inventario.csv');
    },

    async productionOrders(ctx) {
        const { query } = ctx;

        if ( query.page ) {
            query.pagination = {
                page : query.page,
                ...query.pagination,
            }

            delete query.page;
        }

        if ( query.limit ) {
            query.pagination = {
                ...query.pagination,
                pageSize : query.limit,
            }

            delete query.limit;
        }

        query.filters = {
            ...query.filters,
            ...( query.search && {
                production : {
                    product : {
                        name : {
                            $contains : query.search,
                        },
                    },
                },
            }),
        };

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

        const productionOrders = await strapi.service("api::production-order.production-order").find({
            ...query,
            fields : ["id", "uuid", "status", "dueDate", "startDate", "createdAt"],
            populate : {
                production : {
                    fields : ["quantity", "delivered", "stock"],
                    populate : {
                        materials : true,
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

        for ( const order of productionOrders.results ) {
            const context = {
                plannedCost : 0,
                realCost    : 0,
            };

            for ( const material of order.production.materials ) {
                const index = movements.findIndex( movement => movement.uuid === material.uuid );

                if ( index < 0 ) continue;

                const averageCost = movements[index].averageCost;
                const quantity    = parseFloat( (material.quantity / movements[index].unityConversionRate).toFixed(4) );
                const currentCost = parseFloat( (context.plannedCost || 0).toFixed(4) );

                context.plannedCost = parseFloat((currentCost + (quantity * averageCost)).toFixed(4));
            }

            for ( const stock of order.production.stock ?? [{
                quantity : 0,
            }] ) {
                const index = movements.findIndex( movement => movement.uuid === stock.productUuid );

                if ( index < 0 ) continue;

                const averageCost     = movements[index].averageCost;
                const quantity        = parseFloat( (stock.quantity / movements[index].unityConversionRate).toFixed(4) );
                const currentCost     = parseFloat( (context.realCost || 0).toFixed(4) );

                context.realCost = parseFloat((currentCost + (quantity * averageCost)).toFixed(4));
            }

            order.plannedCost = context.plannedCost;
            order.realCost    = context.realCost;
            order.loss        = context.realCost - context.plannedCost;
        }

        query.filters = {
            ...query.filters,
            status : "open",
        };

        const open = await strapi.query("api::production-order.production-order").count( query );

        query.filters = {
            ...query.filters,
            status : "partialBooked",
        };

        const partialBooked = await strapi.query("api::production-order.production-order").count( query );

        query.filters = {
            ...query.filters,
            status : "booked",
        }

        const booked = await strapi.query("api::production-order.production-order").count( query );

        query.filters = {
            ...query.filters,
            status : "inProgress",
        }

        const inProgress = await strapi.query("api::production-order.production-order").count( query );

        query.filters = {
            ...query.filters,
            status : "closed",
        }

        const closed = await strapi.query("api::production-order.production-order").count( query );

        query.filters = {
            ...query.filters,
            status : "cancelled",
        }

        const cancelled = await strapi.query("api::production-order.production-order").count( query );

        productionOrders.stats = {};
        productionOrders.stats.open = open;
        productionOrders.stats.partialBooked = partialBooked;
        productionOrders.stats.booked = booked;
        productionOrders.stats.inProgress = inProgress;
        productionOrders.stats.closed = closed;
        productionOrders.stats.cancelled = cancelled;

        return {
            data : productionOrders.results,
            meta : {
                totalDocs : productionOrders.pagination.total,
                limit : productionOrders.pagination.pageSize,
                page : productionOrders.pagination.page,
                totalPages : productionOrders.pagination.pageCount,
            },
            stats : productionOrders.stats,
        };
    },

    async downloadProductionOrders(ctx) {
        const { query } = ctx;

        if ( query.page ) {
            query.pagination = {
                page : query.page,
                ...query.pagination,
            }

            delete query.page;
        }

        if ( query.limit ) {
            query.pagination = {
                ...query.pagination,
                pageSize : query.limit,
            }

            delete query.limit;
        }

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

        const productionOrders = await strapi.service("api::production-order.production-order").find({
            ...query,
            fields : ["id", "uuid", "status", "dueDate", "startDate", "createdAt"],
            populate : {
                production : {
                    fields : ["quantity", "delivered", "stock"],
                    populate : {
                        materials : true,
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
            pagination : {
                page : 1,
                pageSize : 1000,
            },
        });

        for ( const order of productionOrders.results ) {
            const context = {
                plannedCost : 0,
                realCost    : 0,
            };

            for ( const material of order.production.materials ) {
                const index = movements.findIndex( movement => movement.uuid === material.uuid );

                if ( index < 0 ) continue;

                const averageCost = movements[index].averageCost;
                const quantity    = parseFloat( (material.quantity / movements[index].unityConversionRate).toFixed(4) );
                const currentCost = parseFloat( (context.plannedCost || 0).toFixed(4) );

                context.plannedCost = parseFloat((currentCost + (quantity * averageCost)).toFixed(4));
            }

            for ( const stock of order.production.stock ?? [{
                quantity : 0,
            }] ) {
                const index = movements.findIndex( movement => movement.uuid === stock.productUuid );

                if ( index < 0 ) continue;

                const averageCost     = movements[index].averageCost;
                const quantity        = parseFloat( (stock.quantity / movements[index].unityConversionRate).toFixed(4) );
                const currentCost     = parseFloat( (context.realCost || 0).toFixed(4) );

                context.realCost = parseFloat((currentCost + (quantity * averageCost)).toFixed(4));
            }

            order.plannedCost = context.plannedCost;
            order.realCost    = context.realCost;
            order.loss        = context.realCost - context.plannedCost;
        }

        const statusDictionary = {
            open : "Abierta",
            partialBooked : "Parcialmente Reservada",
            booked : "Reservada",
            inProgress : "En Progreso",
            closed : "Cerrada",
            cancelled : "Cancelada",
        };

        const parsedData = productionOrders.results.map( ( productionOrder ) =>( {
           "order"        : productionOrder.id,
           "product"      : productionOrder.production?.product?.name ?? "-",
           "quantity"     : productionOrder.production.quantity,
           "delivered"    : productionOrder.production?.delivered ?? 0,
           "progress"     : productionOrder.production?.delivered / productionOrder.production?.quantity ?? 0,
           "status"       : statusDictionary[ productionOrder.status ] ?? "-",
            "date"        : productionOrder.createdAt,
            "plannedCost" : productionOrder.plannedCost,
            "realCost"    : productionOrder.realCost,
            "loss"        : productionOrder.loss,
        }));

        const csvWriter = createCsvWriter({
            path: 'ordenes_producción.csv',
            header: [
                {id: 'order', title: 'Orden'},
                {id: 'product', title: 'Producto'},
                {id: 'quantity', title: 'Cantidad'},
                {id: 'delivered', title: 'Entregado'},
                {id: 'progress', title: 'Progreso'},
                {id: 'status', title: 'Estado'},
                {id: 'date', title: 'Fecha'},
                {id: 'plannedCost', title: 'Costo Planeado'},
                {id: 'realCost', title: 'Costo Real'},
                {id: 'loss', title: 'Merma'},
            ]
        });

        await csvWriter.writeRecords(parsedData);

        ctx.attachment('ordenes_producción.csv');

        await send(ctx, 'ordenes_producción.csv');
    },

    async mpStock( ctx ) {
        const { query } = ctx;

        if ( query.page ) {
            query.pagination = {
                page : query.page,
                ...query.pagination,
            }

            delete query.page;
        }

        if ( query.limit ) {
            query.pagination = {
                ...query.pagination,
                pageSize : query.limit,
            }

            delete query.limit;
        }

        if ( query.search ) {
            query.filters = {
                ...query.filters,
                name : {
                    $contains : query.search,
                },
            };
        }

        const products = await strapi.service("api::product.product").find({
            ...query,
            fields : ["uuid", "name"],
            populate : {
                unity : {
                    fields : ["uuid", "name"],
                },
                inventoryInfo : {
                    fields : ["alertQuantity"],
                },
            },
        });

        await strapi.service("api::report.report").addProductStats( products.results );

        return {
            data : products.results,
            meta : {
                totalDocs : products.pagination.total,
                limit : products.pagination.pageSize,
                page : products.pagination.page,
                totalPages : products.pagination.pageCount,
            },
        };
    },

    async downloadMpStock(ctx) {
        const { query } = ctx;

        if ( query.page ) {
            query.pagination = {
                page : query.page,
                ...query.pagination,
            }

            delete query.page;
        }

        if ( query.limit ) {
            query.pagination = {
                ...query.pagination,
                pageSize : query.limit,
            }

            delete query.limit;
        }

        if ( query.search ) {
            query.filters = {
                ...query.filters,
                name : {
                    $contains : query.search,
                },
            };
        }

        const products = await strapi.service("api::product.product").find({
            ...query,
            fields : ["uuid", "name"],
            populate : {
                unity : {
                    fields : ["uuid", "name"],
                },
                inventoryInfo : {
                    fields : ["alertQuantity"],
                },
            },
            pagination : {
                page : 1,
                pageSize : 10000,
            },
        });

        await strapi.service("api::report.report").addProductStats( products.results );

        const parsedData = products.results.map( ( product ) =>({
            "product"           : product.name,
            "quantityAvailable" : product.totalQuantity,
            "reservedQuantity"  : product.totalReserved,
            "unity"             : product.unity.name,
            "averageConsumed"   : Number.isNaN( product.averageConsumed ) ? 0 : product.averageConsumed,
            "coverage"          : product.coverage === -1 ? "Exceso" : product.coverage,
            "minimun"           : product.minimun,
            "difference"        : product.difference,
        }));

        const csvWriter = createCsvWriter({
            path: 'cubrimiento.csv',
            header: [
                {id: 'product', title: 'Producto'},
                {id: 'quantityAvailable', title: 'Cantidad Disponible'},
                {id: 'reservedQuantity', title: 'Cantidad Reservada'},
                {id: 'unity', title: 'Unidad'},
                {id: 'averageConsumed', title: 'Consumo Promedio'},
                {id: 'coverage', title: 'Cubrimiento'},
                {id: 'minimun', title: 'Mínimo'},
                {id: 'difference', title: 'Faltante vs Mínimo'},
            ]
        });

        await csvWriter.writeRecords(parsedData);

        ctx.attachment('cubrimiento.csv');

        await send(ctx, 'cubrimiento.csv');
    },

    async assortmentOrders( ctx ) {
        const { query } = ctx;

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
            ...( query.search && {
                product : {
                    name : {
                        $contains : query.search,
                    },
                },
            }),
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

    async downloadAssortmentOrders( ctx ) {
        const { query } = ctx;

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
            pagination : {
                page : 1,
                pageSize : 10000,
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
            ...( query.search && {
                product : {
                    name : {
                        $contains : query.search,
                    },
                },
            }),
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

        const parsedData2 = parsedData.map( ( product ) =>({
            "product"  : product.product?.name,
            "quantity" : product.quantity,
            "unity"    : product.unity?.name,
            "order"    : product.productionOrder?.id,
            "batch"    : product.batch?.name,
            "stock"    : product.stock?.name,
        }));

        const csvWriter = createCsvWriter({
            path: 'ordenes_surtido.csv',
            header: [
                {id: 'product', title: 'Producto'},
                {id: 'quantity', title: 'Cantidad'},
                {id: 'unity', title: 'Unidad'},
                {id: 'order', title: 'Orden'},
                {id: 'batch', title: 'Lote'},
                {id: 'stock', title: 'Inventario'},
            ]
        });

        await csvWriter.writeRecords(parsedData2);

        ctx.attachment('ordenes_surtido.csv');

        await send(ctx, 'ordenes_surtido.csv');
    },

    async loss( ctx ) {
        const { query } = ctx;

        delete query.page;
        delete query.limit;

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
                ${ query.search ? `AND p.name LIKE '%${query.search}%'` : "" }
            GROUP BY 
                p.id
        `);

        const movements = JSON.parse( JSON.stringify( movementsRaw ) )[0];

        query.filters = {
            ...query.filters,
            status : "closed",
        };

        const productionOrders = await strapi.service(PRODUCTION_ORDER_MODEL).find({
            ...query,
            fields : ["uuid"],
            populate : {
                production : {
                    select : ["id", "stock"],
                    populate : {
                        materials : true,
                    },
                }
            }
        });

        for ( const order of productionOrders.results ) {
            for ( const material of order.production.materials ) {
                const index = movements.findIndex( movement => movement.uuid === material.uuid );

                if ( index < 0 ) continue;

                const deliveredRate = order.production.delivered / order.production.quantity;

                const averageCost     = movements[index].averageCost;
                const quantity        = parseFloat( (material.quantity / movements[index].unityConversionRate * deliveredRate).toFixed(4) );
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

    async downloadLoss( ctx ) {
        const { query } = ctx;

        if ( query.page ) {
            query.pagination = {
                page : query.page,
                ...query.pagination,
            }

            delete query.page;
        }

        if ( query.limit ) {
            query.pagination = {
                ...query.pagination,
                pageSize : query.limit,
            }

            delete query.limit;
        }

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
                ${ query.search ? `AND p.name LIKE '%${query.search}%'` : "" }
            GROUP BY 
                p.id
        `);

        const movements = JSON.parse( JSON.stringify( movementsRaw ) )[0];

        query.filters = {
            ...query.filters,
            status : "closed",
        };

        const productionOrders = await strapi.service(PRODUCTION_ORDER_MODEL).find({
            ...query,
            fields : ["uuid"],
            populate : {
                production : {
                    select : ["id", "stock"],
                    populate : {
                        materials : true,
                    },
                }
            },
            pagination : {
                page     : 1,
                pageSize : 10000,
            },
        });

        for ( const order of productionOrders.results ) {
            for ( const material of order.production.materials ) {
                const index = movements.findIndex( movement => movement.uuid === material.uuid );

                if ( index < 0 ) continue;

                const deliveredRate = order.production.delivered / order.production.quantity;

                const averageCost     = movements[index].averageCost;
                const quantity        = parseFloat( (material.quantity / movements[index].unityConversionRate * deliveredRate).toFixed(4) );
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

                movements[index].loss = movements[index].plannedCost - movements[index].realCost;
            }
        }

        const data = movements.filter( movement => movement.planned );

        const csvWriter = createCsvWriter({
            path: 'mermas.csv',
            header: [
                { id: 'name', title: 'Producto' },
                { id: 'planned', title: 'Consumo Planeado' },
                { id: 'realQuantity', title: 'Consumo Real' },
                { id: 'plannedCost', title: 'Costo Planeado' },
                { id: 'realCost', title: 'Costo Real' },
                { id: 'loss', title: 'Merma' },
            ]
        });

        await csvWriter.writeRecords(data);

        ctx.attachment('mermas.csv');

        await send(ctx, 'mermas.csv');
    },

    async margins( ctx ) {
        const { query } = ctx;

        delete query.page;
        delete query.limit;

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

        query.filters = {
            ...query.filters,
            status : "closed",
            ...( query.search && {
                production : {
                    ...query.filters.production,
                    product : {
                        name : {
                            $contains : query.search,
                        },
                    },
                },
            }),
        }

        const productionOrders = await strapi.service(PRODUCTION_ORDER_MODEL).find({
            ...query,
            fields : ["uuid"],
            populate : {
                production : {
                    fields : ["id", "stock", "quantity", "delivered"],
                    populate : {
                        materials : true,
                        product : {
                            fields : ["uuid", "name"],
                            populate : {
                                saleInfo : true,
                            },
                        }
                    },
                }
            }
        });

        let products = [];

        for ( let i = 0; i < productionOrders.results.length; i++ ) {
            const order = productionOrders.results[i];

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

                products[productIndex].realCost = parseFloat((currentCost + ((quantity * averageCost) / order.production.delivered)).toFixed(4));
            }
        }

        return {
            data : products,
        };
    },

    async downloadMargins( ctx ) {
        const { query } = ctx;

        if ( query.page ) {
            query.pagination = {
                page : query.page,
                ...query.pagination,
            }

            delete query.page;
        }

        if ( query.limit ) {
            query.pagination = {
                ...query.pagination,
                pageSize : query.limit,
            }

            delete query.limit;
        }

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

        query.filters = {
            ...query.filters,
            status : "closed",
            ...( query.search && {
                production : {
                    product : {
                        name : {
                            $contains : query.search,
                        },
                    },
                },
            }),
        }

        const productionOrders = await strapi.service(PRODUCTION_ORDER_MODEL).find({
            ...query,
            fields : ["uuid"],
            populate : {
                production : {
                    fields : ["id", "stock", "quantity", "delivered"],
                    populate : {
                        materials : true,
                        product : {
                            fields : ["uuid", "name"],
                            populate : {
                                saleInfo : true,
                            },
                        }
                    },
                }
            }
        });

        let products = [];

        for ( let i = 0; i < productionOrders.results.length; i++ ) {
            const order = productionOrders.results[i];

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
                plannedMargin : 0,
                realMargin : 0,
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

                products[productIndex].realCost = parseFloat((currentCost + ((quantity * averageCost) / order.production.delivered)).toFixed(4));
            }

            products[productIndex].plannedMargin = parseFloat(( 1 - ( products[productIndex].plannedCost / products[productIndex].price ) ).toFixed(4));
            products[productIndex].realMargin = parseFloat(( 1 - ( products[productIndex].realCost / products[productIndex].price ) ).toFixed(4));
        }

        const csvWriter = createCsvWriter({
            path: 'margenes.csv',
            header: [
                { id: 'name', title: 'Producto' },
                { id: 'plannedCost', title: 'Costo Planeado' },
                { id: 'realCost', title: 'Costo Real' },
                { id: 'price', title: 'Precio de Venta' },
                { id: 'plannedMargin', title: 'Margen Planeado' },
                { id: 'realMargin', title: 'Margen Real' },
            ]
        });

        await csvWriter.writeRecords(products);

        ctx.attachment('margenes.csv');

        await send(ctx, 'margenes.csv');
    },
}));
