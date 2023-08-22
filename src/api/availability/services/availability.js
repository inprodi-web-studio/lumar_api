"use strict";

const { AVAILABILITY_MODEL } = require("../../../constants/models");

const { createCoreService } = require("@strapi/strapi").factories;

module.exports = createCoreService( AVAILABILITY_MODEL, ({ strapi }) => ({
    async addMultipleAvailabilities( products, stocks ) {
        let totalValue = 0;
        for ( const product of products ) {
            let stockValue = 0;
            for ( const stock of stocks ) {
                const availabilities = await strapi.query( AVAILABILITY_MODEL ).findMany({
                    where : {
                        stock : stock.id,
                        batch : {
                            product : product.id,
                        },
                    },
                    select : ["uuid", "quantity"],
                    populate : {
                        batch : {
                            select : ["uuid", "name", "expirationDay"],
                        },
                    },
                });

                
                if ( product.purchaseInfo ) {
                    for ( const availability of availabilities ) {
                        stockValue += availability.quantity * product.purchaseInfo.purchasePrice;
                    }
                }
                
                stock.availabilities = availabilities;
                stock.value          = stockValue;

                totalValue += stockValue;
            }

            product.stocks     = stocks;
            product.totalValue = totalValue;

            delete product.purchaseInfo;
            delete product.saleInfo;
        }
    },

    async addSingleAvailabilities( product, stock ) {
        let stockValue = 0;

        const availabilities = await strapi.query( AVAILABILITY_MODEL ).findMany({
            where : {
                stock : stock.id,
                batch : {
                    product : product.id,
                },
            },
            select : ["uuid", "quantity"],
            populate : {
                batch : {
                    select : ["uuid", "name", "expirationDay"],
                },
            },
        });

        if ( product.purchaseInfo ) {
            for ( const availability of availabilities ) {
                stockValue += availability.quantity * product.purchaseInfo.purchasePrice;
            }
        }

        product.availabilities = availabilities;
        product.value          = stockValue;

        delete product.purchaseInfo;
        delete product.saleInfo;
    },
}));
