"use strict";

const { AVAILABILITY_MODEL } = require("../../../constants/models");

const { createCoreService } = require("@strapi/strapi").factories;

module.exports = createCoreService( AVAILABILITY_MODEL, ({ strapi }) => ({
    async addMultipleAvailabilities( products, stocks, warehouse ) {
        let result = [];

        for ( let product of products ) {
            let productObject = {
                ...product,
                totalQuantity : 0,
                totalReserved : 0,
                totalValue    : 0,
                stocks        : [],
            };

            for ( const stock of stocks ) {
                let stockObject = {
                    id             : stock.id,
                    uuid           : stock.uuid,
                    name           : stock.name,
                    value          : 0,
                    quantity       : 0,
                    reserves       : 0,
                    availabilities : [],
                };

                const availabilities = await strapi.query( AVAILABILITY_MODEL ).findMany({
                    where : {
                        stock     : stock.id,
                        product   : product.id,
                        warehouse : warehouse.id,
                    },
                    select : ["uuid", "quantity", "price", "totalReserved"],
                    populate : {
                        batch : {
                            select : ["uuid", "name", "expirationDay"],
                        },
                        reserves : {
                            populate : {
                                productionOrder : {
                                    select : ["id", "uuid"],
                                },
                            },
                        },
                    },
                });


                for ( const availability of availabilities ) {
                    stockObject.value += availability.quantity * availability.price;
                }

                stockObject.availabilities = availabilities;
                stockObject.quantity       = availabilities.reduce( ( sum, availability ) => sum + availability.quantity, 0 );
                stockObject.reserves       = availabilities.reduce( ( sum, availability ) => sum + availability.totalReserved, 0 );

                productObject.stocks.push( stockObject );

                productObject.totalValue    += stockObject.value;
                productObject.totalQuantity += stockObject.quantity;
                productObject.totalReserved += stockObject.reserves;
            }
            
            delete productObject.purchaseInfo;
            delete productObject.saleInfo;

            result.push( productObject );
        }

        return result;
    },

    async addSingleAvailabilities( product, stock, warehouse ) {
        let stockValue = 0;

        const availabilities = await strapi.query( AVAILABILITY_MODEL ).findMany({
            where : {
                stock     : stock.id,
                product   : product.id,
                warehouse : warehouse.id,
            },
            select : ["uuid", "quantity", "price", "totalReserved"],
            populate : {
                batch : {
                    select : ["uuid", "name", "expirationDay"],
                },
                reserves : {
                    populate : {
                        productionOrder : {
                            fields : ["id"],
                        },
                    },
                },
            },
        });

        if ( product.purchaseInfo ) {
            for ( const availability of availabilities ) {
                stockValue += availability.quantity * availability.price;
            }
        }

        product.availabilities = availabilities;
        product.value          = stockValue;

        delete product.purchaseInfo;
        delete product.saleInfo;
    },
}));
