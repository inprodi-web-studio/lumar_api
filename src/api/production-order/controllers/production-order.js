"use strict";

const {
    PRODUCT_MODEL,
    PRODUCTION_ORDER_MODEL,
    WAREHOUSE_MODEL,
    STOCK_MODEL,
    STOCKS_ORDER_MODEL,
    AVAILABILITY_MODEL,
} = require("../../../constants/models");

const { validateAddProductionOrder } = require("../validation");

const { BadRequestError, NotFoundError } = require("../../../helpers/errors");

const findOne = require("../../../helpers/findOne");
const findMany = require("../../../helpers/findMany");
const getCurrentDateFormatted = require("../../../helpers/getCurrentDateFormatted");

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
    async find( ctx ) {
        const filters = {
            $search : ["id"],
        };

        const productionOrders = await findMany( PRODUCTION_ORDER_MODEL, productionOrderFields, filters );

        return productionOrders;
    },

    async findOne( ctx ) {
        const { id : uuid } = ctx.params;

        const productionOrder = await findOne( uuid, PRODUCTION_ORDER_MODEL, productionOrderFields );

        return productionOrder;
    },

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

    async reserveMaterials( ctx ) {
        const { uuid } = ctx.params;

        const productionOrder = await findOne( uuid, PRODUCTION_ORDER_MODEL, productionOrderFields );

        const stockOrder = await strapi.query( STOCKS_ORDER_MODEL ).findOne({
            where : {
                warehouse : productionOrder.warehouse.id,
            },
            populate : {
                stocksOrder : {
                    populate : {
                        stock : true,
                    },
                },
            }
        });

        if ( !stockOrder ) {
            throw new NotFoundError( "Stock order criteria for warehouse not found", {
                key  : "stock-order.notFound",
                path : ctx.request.path,
            });
        }

        let reservedItems = 0;
        let newData = [
            ...productionOrder.production.materials
        ];

        const currentDate = getCurrentDateFormatted();

        for (let i = 0; i < productionOrder.production?.materials.length; i++) {
            const material = productionOrder.production?.materials[i];

            if (material.quantity === material.totalReserved) break;
        
            let foundMaterial = false;
        
            const stocksOrder = stockOrder.stocksOrder;
        
            for (let j = 0; j < stocksOrder.length; j++) {
                const stock = stocksOrder[j];

                const availabilities = await strapi.query(AVAILABILITY_MODEL).findMany({
                    where: {
                        stock: stock.stock.id,
                        batch: {
                            $or: [
                                {
                                    expirationDay: {
                                        $gte: currentDate,
                                    },
                                },
                                {
                                    expirationDay: null,
                                },
                            ],
                        },
                        product: {
                            uuid: material.uuid,
                        },
                        warehouse: productionOrder.warehouse.id,
                    },
                    orderBy: {
                        batch: {
                            expirationDay: "asc",
                        },
                    },
                    select: ["uuid", "quantity", "totalReserved"],
                    populate: {
                        batch: {
                            select: ["id", "uuid", "name", "expirationDay"],
                        },
                        reserves: true,
                    },
                });
        
                if (availabilities.length > 0) {
                    foundMaterial = true;
        
                    const materialProduct = await findOne(material.uuid, PRODUCT_MODEL);
        
                    const standardQuantity = material.quantity / materialProduct.unityConversionRate;
        
                    let reserved = material.totalReserved;
        
                    for (let k = 0; k < availabilities.length; k++) {
                        const availability = availabilities[k];

                        if ((availability.quantity - availability.totalReserved) >= (standardQuantity - reserved)) {
                            // await strapi.entityService.update(AVAILABILITY_MODEL, availability.id, {
                            //     data : {
                            //         totalReserved : availability.totalReserved + standardQuantity - reserved,
                            //         reserves : [
                            //             ...availability.reserves,
                            //             {
                            //                 productionOrder: productionOrder.id,
                            //                 quantity: standardQuantity - reserved,
                            //             },
                            //         ],
                            //     },
                            // });
        
                            newData[i].reserves = [
                                ...newData[i].reserves,
                                {
                                    stock     : stock.stock.id,
                                    warehouse : productionOrder.warehouse.id,
                                    batch     : availability.batch?.id,
                                    quantity  : standardQuantity - reserved,
                                },
                            ];
        
                            break;
                        } else {
                            // Realiza acciones adicionales si es necesario
                        }
                    }
                }
            }
        
            if (foundMaterial) {
                reservedItems += 1;
            }
        }

        return {
            reservedItems,
            newData,
        };
    },
}));
