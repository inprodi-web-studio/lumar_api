"use strict";

const {
    STOCK_MODEL, WAREHOUSE_MODEL, STOCKS_ORDER_MODEL,
} = require("../../../constants/models");

const {
    validateAddStock, validateUpdateOrder,
} = require("../validation");

const findMany = require("../../../helpers/findMany");
const findOne  = require("../../../helpers/findOne");
const { NotFoundError } = require("../../../helpers/errors");

const { createCoreController } = require("@strapi/strapi").factories;

const stockFields = {
    fields : ["uuid", "name", "description"],
    populate : {
        warehouses : {
            fields : ["uuid", "name"],
        },
    },
}

module.exports = createCoreController( STOCK_MODEL, ({ strapi }) => ({
    async find( ctx ) {
        const filters = {
            $search : ["name"],
        };

        const stocks = await findMany( STOCK_MODEL, stockFields, filters );

        return stocks;
    },

    async findOne( ctx ) {
        const { id : uuid } = ctx.params;

        const stock = await findOne( uuid, STOCK_MODEL, stockFields );

        return stock;
    },

    async create( ctx ) {
        const data = ctx.request.body;
        
        await validateAddStock( data );

        await strapi.service( STOCK_MODEL ).checkForDuplicates( data.name );

        const newStock = await strapi.entityService.create( STOCK_MODEL, {
            data     : data,
            fields   : stockFields.fields,
            populate : stockFields.populate,
        });

        return newStock;
    },

    async update( ctx ) {
        const { id : uuid } = ctx.params;
        const data = ctx.request.body;

        await validateAddStock( data );

        const stock = await findOne( uuid, STOCK_MODEL, stockFields );

        await strapi.service( STOCK_MODEL ).checkForDuplicates( data.name );

        const updatedStock = await strapi.entityService.update( STOCK_MODEL, stock.id, {
            data     : data,
            fields   : stockFields.fields,
            populate : stockFields.populate,
        });

        return updatedStock;
    },

    async updateOrder( ctx ) {
        const { uuid } = ctx.params;
        const data     = ctx.request.body;

        await validateUpdateOrder( data );

        const warehouse = await findOne( uuid, WAREHOUSE_MODEL );
        const order     = await strapi.query( STOCKS_ORDER_MODEL ).findOne({
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
            throw new NotFoundError( "Order criteria for warehouse not found", {
                key  : "stock-order.notFound",
                path : ctx.request.path,
            });
        }

        let stockIds = [];

        for ( const stockUuid of data.order ) {
            const stock = await findOne( stockUuid, STOCK_MODEL );

            stockIds.push({
                stock : stock.id,
            });
        }

        const updatedOrder = await strapi.entityService.update( STOCKS_ORDER_MODEL, order.id, {
            data : {
                stocksOrder : stockIds,
            },
            fields : ["uuid", "id"],
        });

        return updatedOrder;
    },

    async delete( ctx ) {
        const { id : uuid } = ctx.params;

        const stock = await findOne( uuid, STOCK_MODEL, stockFields );

        // TODO: No permitir eliminar si hay inventarios con disponibilidades

        const deletedStock = await strapi.entityService.delete( STOCK_MODEL, stock.id, {
            fields   : stockFields.fields,
            populate : stockFields.populate,
        });

        return deletedStock;
    },
}));
