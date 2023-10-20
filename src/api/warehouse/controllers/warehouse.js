"use strict";

const {
    STOCK_MODEL,
    WAREHOUSE_MODEL,
    STOCKS_ORDER_MODEL,
    AVAILABILITY_MODEL,
} = require("../../../constants/models");

const {
    validateAddWarehouse,
} = require("../validation");

const findMany = require("../../../helpers/findMany");
const findOne = require("../../../helpers/findOne");
const { BadRequestError } = require("../../../helpers/errors");

const { createCoreController } = require("@strapi/strapi").factories;

const warehouseFields = {
    fields   : ["uuid", "name"],
    populate : {
        address : true,
        stocks : {
            fields : "*",
        },
    },
};

module.exports = createCoreController( WAREHOUSE_MODEL, ({ strapi }) => ({
    async find( ctx ) {
        const filters = {
            $search : ["name"],
        };

        const warehouses = await findMany( WAREHOUSE_MODEL, warehouseFields, filters );

        return warehouses;
    },

    async findOne( ctx ) {
        const { id : uuid } = ctx.params;

        const warehouse = await findOne( uuid, WAREHOUSE_MODEL, warehouseFields );

        return warehouse;
    },

    async create( ctx ) {
        const data = ctx.request.body;

        await validateAddWarehouse( data );

        await strapi.service( WAREHOUSE_MODEL ).checkForDuplicates( data.name );

        const newWarehouse = await strapi.entityService.create( WAREHOUSE_MODEL, {
            data     : data,
            fields   : warehouseFields.fields,
            populate : warehouseFields.populate,
        });

        return newWarehouse;
    },

    async update( ctx ) {
        const { id : uuid } = ctx.params;
        const data          = ctx.request.body;

        await validateAddWarehouse( data );

        const warehouse = await findOne( uuid, WAREHOUSE_MODEL, warehouseFields );

        await strapi.service( WAREHOUSE_MODEL ).checkForDuplicates( data.name );

        const updatedWarehouse = await strapi.entityService.update( WAREHOUSE_MODEL, warehouse.id, {
            data     : data,
            fields   : warehouseFields.fields,
            populate : warehouseFields.populate,
        });

        return updatedWarehouse;
    },

    async delete( ctx ) {
        const { id : uuid } = ctx.params;

        const warehouse = await findOne( uuid, WAREHOUSE_MODEL, warehouseFields );

        if ( warehouse.stocks.length > 0 ) {
            throw new BadRequestError( "You can't delete a warehouse with stocks", {
                key  : "warehouse.withStocks",
                path : ctx.request.path,
            });
        }

        const deletedWarehouse = await strapi.entityService.delete( WAREHOUSE_MODEL, warehouse.id, {
            fields   : warehouseFields.fields,
            populate : warehouseFields.populate,
        });

        return deletedWarehouse;
    },

    async assignStock( ctx ) {
        const {
            stock_uuid,
            warehouse_uuid,
        } = ctx.params;

        const warehouse = await findOne( warehouse_uuid, WAREHOUSE_MODEL );
        const stock     = await findOne( stock_uuid, STOCK_MODEL );

        
        const order = await strapi.query( STOCKS_ORDER_MODEL ).findOne({
            where : {
                warehouse : warehouse.id,
            },
            populate : {
                stocksOrder : {
                    populate : {
                        stock : true,
                    },
                },
            },
        });

        if ( !order ) {
            await strapi.entityService.create( STOCKS_ORDER_MODEL, {
                data : {
                    warehouse : warehouse.id,
                    stocksOrder : [{
                        stock : stock.id,
                        order : 1,
                    }],
                },
            });
        } else {
            const hasCurrentStock = order.stocksOrder?.filter( item => item.stock?.id === stock.id ).length > 0;

            if ( !hasCurrentStock ) {
                await strapi.entityService.update( STOCKS_ORDER_MODEL, order.id, {
                    data : {
                        stocksOrder : [
                            ...order.stocksOrder,
                            {
                                stock : stock.id,
                            },
                        ],
                    },
                });
            };
        }

        const updatedWarehouse = await strapi.entityService.update( WAREHOUSE_MODEL, warehouse.id, {
            data : {
                stocks : {
                    connect : [ stock.id ],
                }
            },
            fields   : warehouseFields.fields,
            populate : warehouseFields.populate,
        });

        return updatedWarehouse;
    },

    async unassignStock( ctx ) {
        const {
            stock_uuid,
            warehouse_uuid,
        } = ctx.params;

        const warehouse = await findOne( warehouse_uuid, WAREHOUSE_MODEL );
        const stock     = await findOne( stock_uuid, STOCK_MODEL );

        const availabilities = await strapi.query( AVAILABILITY_MODEL ).findMany({
            warehouse : warehouse.id,
            stock     : stock.id,
        });

        if ( availabilities.length > 0 ) {
            throw new BadRequestError( "You can't unassign this stock because has availabilities", {
                key  : "warehouse.withAvailabilities",
                path : ctx.request.path,
            });
        }

        const order = await strapi.query( STOCKS_ORDER_MODEL ).findOne({
            where : {
                warehouse : warehouse.id,
            },
            populate : {
                stocksOrder : {
                    populate : {
                        stock : true,
                    },
                },
            },
        });

        const newOrder = order.stocksOrder?.filter( item => item.stock?.id !== stock.id );

        await strapi.entityService.update( STOCKS_ORDER_MODEL, order.id, {
            data : {
                stocksOrder : newOrder,
            },
        });

        const updatedWarehouse = await strapi.entityService.update( WAREHOUSE_MODEL, warehouse.id, {
            data : {
                stocks : {
                    disconnect : [ stock.id ],
                }
            },
            fields   : warehouseFields.fields,
            populate : warehouseFields.populate,
        });

        return updatedWarehouse;
    },
}));
