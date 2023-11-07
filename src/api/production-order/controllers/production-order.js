"use strict";

const {
    PRODUCT_MODEL,
    WAREHOUSE_MODEL,
    STOCKS_ORDER_MODEL,
    AVAILABILITY_MODEL,
    PRODUCTION_ORDER_MODEL,
} = require("../../../constants/models");

const { validateAddProductionOrder } = require("../validation");

const { BadRequestError, NotFoundError } = require("../../../helpers/errors");

const findOne  = require("../../../helpers/findOne");
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
        const stockOrder      = await strapi.query( STOCKS_ORDER_MODEL ).findOne({
            where : {
                warehouse : productionOrder.warehouse.id,
            },
            populate : {
                stocksOrder : {
                    populate : {
                        stock : true,
                    },
                },
            },
        });

        if ( !stockOrder ) {
            throw new NotFoundError( "Stock order criteria for warehouse not found", {
                key  : "stock-order.notFound",
                path : ctx.request.path,
            });
        }

        for ( const material of productionOrder.production?.materials ) {
            const mainStockReserved = material.reserves?.reduce((acc, reserve) => {
                if ( reserve.stock.uuid === stockOrder.stocksOrder[0].stock.uuid ) {
                    return acc + reserve.quantity;
                }
                return acc;
            }, 0);

            material.mainStockReserved = mainStockReserved;
        }

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

        if ( productionOrder.status === "booked" || productionOrder.status === "inProgress" || productionOrder.status === "closed" || productionOrder.status === "cancelled" ) {
            throw new BadRequestError( "Only opened and partial booked production orders can be reserved", {
                key  : "production-order.invalidStatus",
                path : ctx.request.path,
            });
        }

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

        let reservedItems  = 0;
        let completedItems = 0;

        let newData = [
            ...productionOrder.production.materials
        ];

        const currentDate = getCurrentDateFormatted();

        for (let i = 0; i < productionOrder.production?.materials.length; i++) {
            const material = productionOrder.production?.materials[i];
        
            let foundMaterial = false;
        
            const stocksOrder = stockOrder.stocksOrder;

            const materialProduct = await findOne(material.uuid, PRODUCT_MODEL);
        
            const standardQuantity = parseFloat( (material.quantity / materialProduct.unityConversionRate).toFixed(4) );

            let reserved    = material.totalReserved;
            let newReserved = 0;

            if ( reserved === material.quantity ) {
                completedItems += 1;
                continue;
            };

            let isCompleted = false;

            for (let j = 0; j < stocksOrder.length; j++) {
                const stock = stocksOrder[j];

                if ( isCompleted ) {
                    continue;
                }
                
                const availabilities = await strapi.query(AVAILABILITY_MODEL).findMany({
                    where: {
                        stock : stock.stock.id,
                        batch : {
                            $or : [
                                {
                                    expirationDay : {
                                        $gte : currentDate,
                                    },
                                },
                                {
                                    expirationDay : null,
                                },
                            ],
                        },
                        product : {
                            uuid : material.uuid,
                        },
                        warehouse : productionOrder.warehouse.id,
                    },
                    orderBy: [
                        {
                            quantity : "desc",
                        },
                        {
                            batch : {
                                expirationDay: "asc",
                            },
                        },
                    ],
                    select: ["uuid", "quantity", "totalReserved"],
                    populate: {
                        batch: {
                            select: ["id", "uuid", "name", "expirationDay"],
                        },
                        reserves: {
                            populate : {
                                productionOrder : true,
                            },
                        },
                        stock : true,
                    },
                });
        
                for (let k = 0; k < availabilities.length; k++) {
                    const availability = availabilities[k];

                    if (parseFloat( (availability.quantity - availability.totalReserved).toFixed(4) ) >= parseFloat( ((standardQuantity - (reserved / materialProduct.unityConversionRate)) - newReserved).toFixed(4) )) {
                        foundMaterial = true;

                        console.log( availability.reserves );
                        console.log( productionOrder.id );

                        const index = availability.reserves.findIndex( reserve => reserve.productionOrder.id === productionOrder.id );

                        if ( index !== -1 ) {
                            let availabilityReserves = availability.reserves;
                            const pastReservation    = availability.reserves[index];

                            pastReservation.quantity = parseFloat( (pastReservation.quantity + (standardQuantity - (reserved / materialProduct.unityConversionRate) - newReserved)).toFixed(4) );
                            
                            const newTotalReserve = parseFloat( (availability.totalReserved + (standardQuantity - (reserved / materialProduct.unityConversionRate) - newReserved)).toFixed(4) );

                            delete availabilityReserves[index];

                            availabilityReserves[index] = pastReservation;

                            await strapi.entityService.update( AVAILABILITY_MODEL, availability.id, {
                                data : {
                                    totalReserved : newTotalReserve,
                                    reserves : availabilityReserves,
                                },
                            });

                            newData[i].totalReserved = parseFloat(((material.quantity - reserved - (newReserved * materialProduct.unityConversionRate)) + newData[i].totalReserved).toFixed(4) );

                            const availabilityIndex = newData[i].reserves.findIndex( item => item.stock.uuid === availability.stock.uuid && item.warehouse.uuid === productionOrder.warehouse.uuid && item.batch?.uuid === availability.batch?.uuid );

                            newData[i].reserves[availabilityIndex].quantity = parseFloat(((material.quantity - reserved - (newReserved * materialProduct.unityConversionRate)) + newData[i].reserves[availabilityIndex].quantity).toFixed(4) );
                        } else {
                            console.log("Caso de análisis");
                            // TODO: Planchar el caso en el que se liquida la reservación con una disponibilidad que no se tiene asignada en la orden de producción (revisar newReserved, seguraemte esta mal)

                            await strapi.entityService.update( AVAILABILITY_MODEL, availability.id, {
                                data : {
                                    totalReserved : parseFloat( (availability.totalReserved + (standardQuantity - reserved - newReserved)).toFixed(4) ),
                                    reserves : [
                                        ...availability.reserves,
                                        {
                                            productionOrder : productionOrder.id,
                                            quantity        : parseFloat( (standardQuantity - reserved - newReserved).toFixed(4) ),
                                        },
                                    ],
                                },
                            });

                            newData[i].totalReserved += parseFloat( ((standardQuantity - reserved - newReserved) * materialProduct.unityConversionRate).toFixed(4) );

                            newData[i].reserves = [
                                ...newData[i].reserves,
                                {
                                    stock     : stock.stock.id,
                                    warehouse : productionOrder.warehouse.id,
                                    batch     : availability.batch?.id,
                                    quantity  : parseFloat( ((standardQuantity - reserved - newReserved) * materialProduct.unityConversionRate).toFixed(4) ),
                                },
                            ];
                        }
                        
                        newReserved += parseFloat( (standardQuantity - reserved).toFixed(4) );
                        isCompleted = true;
                        completedItems += 1;
                        break;
                    } else if ( parseFloat( (availability.quantity - availability.totalReserved).toFixed(4) ) > 0 ) {
                        foundMaterial = true;

                        const index = availability.reserves.findIndex( reserve => reserve.productionOrder.id === productionOrder.id );

                        if ( index !== -1 ) {
                            let availabilityReserves = availability.reserves;
                            const pastReservation    = availability.reserves[index];

                            pastReservation.quantity = parseFloat( ( pastReservation.quantity + (availability.quantity - availability.totalReserved)).toFixed(4) );
                            
                            const newTotalReserve = parseFloat( (availability.totalReserved + (availability.quantity - availability.totalReserved)).toFixed(4) );
                            
                            delete availabilityReserves[index];
                            
                            availabilityReserves[index] = pastReservation;

                            await strapi.entityService.update( AVAILABILITY_MODEL, availability.id, {
                                data : {
                                    totalReserved : newTotalReserve,
                                    reserves      : availabilityReserves,
                                },
                            });
                            
                            newData[i].totalReserved = parseFloat( (((availability.quantity - availability.totalReserved) * materialProduct.unityConversionRate) + newData[i].totalReserved).toFixed(4) );

                            const availabilityIndex = newData[i].reserves.findIndex( item => item.stock.uuid === availability.stock.uuid && item.warehouse.uuid === productionOrder.warehouse.uuid && item.batch?.uuid === availability.batch?.uuid );

                            newData[i].reserves[availabilityIndex].quantity = parseFloat( (((availability.quantity - availability.totalReserved) * materialProduct.unityConversionRate) + (newData[i].reserves[availabilityIndex].quantity)).toFixed(4) )
                        } else {
                            await strapi.entityService.update( AVAILABILITY_MODEL, availability.id, {
                                data : {
                                    totalReserved : parseFloat( (availability.totalReserved + (availability.quantity - availability.totalReserved)).toFixed(4) ),
                                    reserves : [
                                        ...availability.reserves,
                                        {
                                            productionOrder : productionOrder.id,
                                            quantity        : parseFloat( (availability.quantity - availability.totalReserved).toFixed(4) ),
                                        },
                                    ],
                                },
                            });

                            newData[i].totalReserved += parseFloat( ((availability.quantity - availability.totalReserved) * materialProduct.unityConversionRate).toFixed(4) );

                            newData[i].reserves = [
                                ...newData[i].reserves,
                                {
                                    stock     : stock.stock.id,
                                    warehouse : productionOrder.warehouse.id,
                                    batch     : availability.batch?.id,
                                    quantity  : parseFloat( ((availability.quantity - availability.totalReserved) * materialProduct.unityConversionRate).toFixed(4) ),
                                },
                            ];
                        }

                        newReserved += parseFloat( (availability.quantity - availability.totalReserved).toFixed(4) );

                        if ( newData[i].totalReserved === newData[i].quantity ) {
                            isCompleted = true;
                            completedItems += 1;
                            break;
                        }
                    }
                }
            }
        
            if (foundMaterial) {
                reservedItems += 1;
            }
        }

        const status = completedItems === productionOrder.production.materials.length ? "booked"
        : (reservedItems > 0 && productionOrder.status === "open") ? "partialBooked"
        : productionOrder.status === "partialBooked" ? "partialBooked"
        : "open";

        await strapi.entityService.update( PRODUCTION_ORDER_MODEL, productionOrder.id, {
            data : {
                status,
                production : {
                    ...productionOrder.production,
                    materials : newData,
                },
            },
            fields   : productionOrderFields.fields,
            populate : productionOrderFields.populate,
        });

        return {
            reservedItems,
        };
    },

    async unreserveMaterials( ctx ) {
        const { uuid } = ctx.params;

        const productionOrder = await findOne( uuid, PRODUCTION_ORDER_MODEL, productionOrderFields );

        const reservedAvailabilities = await strapi.query( AVAILABILITY_MODEL ).findMany({
            where : {
                reserves : {
                    productionOrder : productionOrder.id,
                },
            },
            populate : {
                reserves : {
                    populate : {
                        productionOrder : true,
                    },
                },
            },
        });

        for ( const reservedAvailability of reservedAvailabilities ) {
            await strapi.entityService.update( AVAILABILITY_MODEL, reservedAvailability.id, {
                data : {
                    totalReserved : reservedAvailability.totalReserved - reservedAvailability.reserves
                        .filter( availability => availability.productionOrder.id === productionOrder.id )
                        .reduce((acc, curr) => acc + curr.quantity, 0),
                    reserves : reservedAvailability.reserves.filter( availability => availability.productionOrder.id !== productionOrder.id ),
                },
            });
        }

        const updatedProductionOrder = await strapi.entityService.update( PRODUCTION_ORDER_MODEL, productionOrder.id, {
            data : {
                status     : "open",
                production : {
                    ...productionOrder.production,
                    materials : productionOrder.production.materials.map( material => ({
                        ...material,
                        totalReserved : 0,
                        reserves      : [],
                    })),
                },
            },
            fields   : productionOrderFields.fields,
            populate : productionOrderFields.populate,
        });

        return updatedProductionOrder;
    },
}));
