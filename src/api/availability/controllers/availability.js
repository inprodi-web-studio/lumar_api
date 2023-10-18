"use strict";

const {
    STOCK_MODEL,
    PRODUCT_MODEL,
    WAREHOUSE_MODEL,
    AVAILABILITY_MODEL,
} = require("../../../constants/models");
const { BadRequestError } = require("../../../helpers/errors");

const findMany = require("../../../helpers/findMany");
const findOne  = require("../../../helpers/findOne");

const { createCoreController } = require("@strapi/strapi").factories;

const productFields = {
    fields : ["uuid", "sku", "name"],
    populate : {
        unity : {
            fields : ["uuid", "name"],
        },
        purchaseInfo : true,
        saleInfo     : true,
    },
}

module.exports = createCoreController( AVAILABILITY_MODEL, ({ strapi }) => ({
    async find( ctx ) {
        const { uuid } = ctx.params;

        const filters = {
            $search : ["name", "sku"],
            $or     : [
                {
                    batches : {
                        availabilities : {
                            quantity : {
                                $not : 0,
                            },
                        },
                    },
                },
                {
                    availabilities : {
                        quantity : {
                            $not : 0,
                        },
                    },
                },
            ],
        };

        const warehouse = await findOne( uuid, WAREHOUSE_MODEL );

        const stocks = await strapi.query( STOCK_MODEL ).findMany({
            where : {
                warehouses : warehouse.id,
            },
            select : ["id", "uuid", "name"],
        });

        const products = await findMany( PRODUCT_MODEL, productFields, filters );

        return {
            data : await strapi.service( AVAILABILITY_MODEL ).addMultipleAvailabilities( products.data, stocks, warehouse ),
            meta : products.meta,
        };
    },

    async findOne( ctx ) {
        const {
            warehouseUuid,
            productUuid,
         } = ctx.params;

         const stockUuid = ctx.request.query.stock;

         if ( !stockUuid ) {
            throw new BadRequestError( "You have to specify the stock as a query param", {
                key  : "availability.missingQueryParam",
                path : ctx.request.path,
            });
         }

         const stock     = await findOne( stockUuid, STOCK_MODEL );
         const warehouse = await findOne( warehouseUuid, WAREHOUSE_MODEL );
         const product   = await findOne( productUuid, PRODUCT_MODEL, productFields);
  
         await strapi.service( AVAILABILITY_MODEL ).addSingleAvailabilities( product, stock, warehouse );

         return product;
    },
}));
