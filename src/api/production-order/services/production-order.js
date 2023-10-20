"use strict";

const { PRODUCTION_ORDER_MODEL, PRODUCT_MODEL } = require("../../../constants/models");

const dayjs                 = require("dayjs");
const customParseFormat     = require("dayjs/plugin/customParseFormat");
const { BadRequestError } = require("../../../helpers/errors");
const findOne = require("../../../helpers/findOne");
const { createCoreService } = require("@strapi/strapi").factories;

dayjs.extend( customParseFormat );

module.exports = createCoreService( PRODUCTION_ORDER_MODEL, ({ strapi }) => ({
    async validateDay( stringDate ) {
        const ctx = strapi.requestContext.get();

        const isValidDate = dayjs( stringDate, "YYYY-MM-DD", true ).isValid();

        if ( !isValidDate ) {
            throw new BadRequestError( "The date format must be 'YYYY-MM-DD'", {
                key  : "production-order.invalidDate",
                path : ctx.request.path,
            });
        }
    },

    async calculateMaterials( data ) {
        const ctx = strapi.requestContext.get();

        let materials = [];

        const product = await findOne( data.production.product, PRODUCT_MODEL );

        if ( product.type === "mp" ) {
            throw new BadRequestError( `mp products cannot be produced (${ product.name })`, {
                key  : "production-order.mpInProduction",
                path : ctx.request.path,
            });
        }

        if ( !product.isActive ) {
            throw new BadRequestError( `Product (${ product.name }) is not active`, {
                key  : "production-order.inactiveProduct",
                path : ctx.request.path,
            });
        }

        data.production.product = product.id;

        for ( const material of data.production.materials ) {
            const materialProduct = await findOne( material.product, PRODUCT_MODEL );

            const index = materials.findIndex( item => item.uuid === material.product );

            if ( index !== -1 ) {
                materials[ index ].quantity += material.quantity * data.production.quantity;
            } else {
                materials.push({
                    uuid          : materialProduct.uuid,
                    name          : materialProduct.name,
                    quantity      : material.quantity * data.production.quantity,
                    totalReserved : 0,
                });
            }
        }

        return materials;
    },
}));
