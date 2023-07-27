"use strict";

const {
    STOCK_MODEL,
} = require("../../../constants/models");

const {
    validateAddStock,
} = require("../validation");

const findMany = require("../../../helpers/findMany");
const findOne  = require("../../../helpers/findOne");

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
