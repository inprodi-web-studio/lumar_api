"use strict";

const {
    STOCK_MODEL,
    WAREHOUSE_MODEL,
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

        // TODO: No dejar que se desasigne un inventario si tiene disponibilidades en el almacén en ese inventario

        const warehouse = await findOne( warehouse_uuid, WAREHOUSE_MODEL );
        const stock     = await findOne( stock_uuid, STOCK_MODEL );

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
