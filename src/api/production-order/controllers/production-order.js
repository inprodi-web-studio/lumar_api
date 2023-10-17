"use strict";

const {
    PRODUCT_MODEL,
    PRODUCTION_ORDER_MODEL,
    WAREHOUSE_MODEL,
} = require("../../../constants/models");

const { validateAddProductionOrder } = require("../validation");

const { BadRequestError } = require("../../../helpers/errors");

const findOne = require("../../../helpers/findOne");

const { createCoreController } = require("@strapi/strapi").factories;

const productionOrderFields = {
    fields : ["uuid", "dueDate", "startDate", "status"],
    populate : {
        production : {
            fields : ["quantity"],
            populate : {
                product : {
                    fields : ["uuid", "name", "sku"],
                },
                materials : {
                    fields   : "*",
                    populate : {
                        reserves : {
                            fields : "*",
                            populate : {
                                stock : {
                                    fields : ["uuid", "name"],
                                },
                                warehouse : {
                                    fields : ["uuid", "name"],
                                },
                                batch : {
                                    fields : ["uuid", "name"],
                                },
                            },
                        },
                    },
                },
            },
        },
        warehouse : {
            fields : ["uuid", "name"],
        },
    },
};

module.exports = createCoreController( PRODUCTION_ORDER_MODEL, ({ strapi }) => ({
    async create( ctx ) {
        const data = ctx.request.body;

        await validateAddProductionOrder( data );

        await strapi.service( PRODUCTION_ORDER_MODEL ).validateDay( data.dueDate );
        await strapi.service( PRODUCTION_ORDER_MODEL ).validateDay( data.startDate );

        const warehouse = await findOne( data.warehouse, WAREHOUSE_MODEL );

        await strapi.service( PRODUCT_MODEL ).validateMaterials( data.production.materials );
        const materials = await strapi.service( PRODUCTION_ORDER_MODEL ).calculateMaterials( data );

        const newProductionOrder = await strapi.entityService.create( PRODUCTION_ORDER_MODEL, {
            data : {
                ...data,
                production : {
                    ...data.production,
                    materials,
                },
                warehouse : warehouse.id,
                status    : "open",
            },
            fields   : productionOrderFields.fields,
            populate : productionOrderFields.populate,
        });

        return newProductionOrder;
    },

    async update( ctx ) {
        const { id : uuid } = ctx.params;
        const data          = ctx.request.body;

        await validateAddProductionOrder( data );

        const productionOrder = await findOne( uuid, PRODUCTION_ORDER_MODEL );

        if ( productionOrder.status !== "open" ) {
            throw new BadRequestError( "Only opened production orders can be updated", {
                key  : "production-order.notOpened",
                path : ctx.request.path,
            });
        }

        await strapi.service( PRODUCTION_ORDER_MODEL ).validateDay( data.dueDate );
        await strapi.service( PRODUCTION_ORDER_MODEL ).validateDay( data.startDate );

        const warehouse = await findOne( data.warehouse, WAREHOUSE_MODEL );

        await strapi.service( PRODUCT_MODEL ).validateMaterials( data.production.materials );
        const materials = await strapi.service( PRODUCTION_ORDER_MODEL ).calculateMaterials( data );

        const updatedProductionOrder = await strapi.entityService.update( PRODUCTION_ORDER_MODEL, productionOrder.id, {
            data : {
                ...data,
                production : {
                    ...data.production,
                    materials,
                },
                warehouse : warehouse.id,
            },
            fields   : productionOrderFields.fields,
            populate : productionOrderFields.populate,
        });

        return updatedProductionOrder;
    },
}));
