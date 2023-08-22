"use strict";

const {
    STOCK_MODEL,
    PRODUCT_MODEL,
    WAREHOUSE_MODEL,
    STOCK_MOVEMENT_MODEL,
} = require("../../../constants/models");

const {
    validateAddExit,
    validateAddEntrance,
    validateAddTransfer,
} = require("../validation");

const findOne = require("../../../helpers/findOne");

const { createCoreController } = require("@strapi/strapi").factories;

module.exports = createCoreController( STOCK_MOVEMENT_MODEL, ({ strapi }) => ({
    async entrance( ctx ) {
        const data = ctx.request.body;

        await validateAddEntrance( data );

        const warehouse = await findOne( data.warehouse, WAREHOUSE_MODEL );

        const product = await findOne( data.product, PRODUCT_MODEL, {
            fields   : ["isActive"],
            populate : {
                inventoryInfo : true,
            },
        }); 

        const stock = await findOne( data.stock, STOCK_MODEL, {
            populate : {
                warehouses : true,
            },
        });

        await strapi.service( STOCK_MOVEMENT_MODEL ).validateConfiguration( data, warehouse, product, stock );

        let availability = null;

        if ( !product.inventoryInfo.manageBatches ) {
            availability = await strapi.service( STOCK_MOVEMENT_MODEL ).handleNoBatchEntranceCreation( data, warehouse, product, stock );
        }

        if ( product.inventoryInfo.manageBatches ) {
            availability = await strapi.service( STOCK_MOVEMENT_MODEL ).handleBatchEntranceCreation( data, product, warehouse, stock );
        }

        return availability;
    },

    async exit( ctx ) {
        const data = ctx.request.body;

        await validateAddExit( data );

        const warehouse = await findOne( data.warehouse, WAREHOUSE_MODEL );

        const product = await findOne( data.product, PRODUCT_MODEL, {
            fields   : ["isActive"],
            populate : {
                inventoryInfo : true,
            },
        }); 

        const stock = await findOne( data.stock, STOCK_MODEL, {
            populate : {
                warehouses : true,
            },
        });

        await strapi.service( STOCK_MOVEMENT_MODEL ).validateConfiguration( data, warehouse, product, stock );

        let availability = null;

        if ( !product.inventoryInfo.manageBatches ) {
            availability = await strapi.service( STOCK_MOVEMENT_MODEL ).handleNoBatchExitCreation( data, warehouse, product, stock );
        }

        if ( product.inventoryInfo.manageBatches ) {
            availability = await strapi.service( STOCK_MOVEMENT_MODEL ).handleBatchExitCreation( data, warehouse, product, stock );
        }

        return availability;
    },

    async transfer( ctx ) {
        const data = ctx.request.body;

        await validateAddTransfer( data );

        
    },
}));
