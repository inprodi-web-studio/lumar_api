"use strict";

const {
    PRODUCT_MODEL,
    WAREHOUSE_MODEL,
    STOCKS_ORDER_MODEL,
    AVAILABILITY_MODEL,
    PRODUCTION_ORDER_MODEL,
    BATCH_MODEL,
    STOCK_MOVEMENT_MODEL,
} = require("../../../constants/models");

const { validateAddProductionOrder, validateAssignStock, validateReturnStock, validateAddDeliver} = require("../validation");

const { BadRequestError, NotFoundError, UnprocessableContentError } = require("../../../helpers/errors");

const findOne  = require("../../../helpers/findOne");
const findMany = require("../../../helpers/findMany");
const getCurrentDateFormatted = require("../../../helpers/getCurrentDateFormatted");

const { createCoreController } = require("@strapi/strapi").factories;

const availabilityFields = {
    fields   : ["uuid", "quantity", "price", "totalReserved"],
    populate : {
        stock : {
            fields : ["uuid", "name"],
        },
        warehouse : {
            fields : ["uuid", "name"],
        },
        batch : {
            fields : ["uuid", "name", "expirationDay"],
        },
        product : {
            fields : ["uuid", "name", "unityConversionRate"],
            populate : {
                productionUnity : true,
            },
        },
        reserves : {
            populate : {
                productionOrder : true,
            },
        },
    },
};

const productionOrderFields = {
    fields : ["uuid", "dueDate", "startDate", "status"],
    populate : {
        production : {
            fields : ["quantity", "stock", "delivered"],
            populate : {
                product : {
                    fields : ["uuid", "name", "sku"],
                    populate : {
                        productionUnity : {
                            fields : ["uuid", "name"],
                        },
                    },
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

        let readyMaterials = 0;

        for ( const material of productionOrder.production?.materials ) {
            const mainStockReserved = material.reserves?.reduce((acc, reserve) => {
                if ( reserve.stock.uuid === stockOrder.stocksOrder[0].stock.uuid ) {
                    return acc + reserve.quantity;
                }
                return acc;
            }, 0);

            if ( material.isReady ) {
                readyMaterials += 1;
            }

            material.mainStockReserved = mainStockReserved;
        }

        productionOrder.isReady = readyMaterials === productionOrder.production?.materials.length;

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
                    delivered : 0,
                    stock : [],
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

    async delete( ctx ) {
        const { id : uuid } = ctx.params;

        const productionOrder = await findOne( uuid, PRODUCTION_ORDER_MODEL, productionOrderFields );

        if ( productionOrder.status !== "open" ) {
            throw new BadRequestError( "Only opened production orders can be deleted", {
                key  : "production-order.notOpened",
                path : ctx.request.path,
            });
        }

        const deletedProductionOrder = await strapi.entityService.delete( PRODUCTION_ORDER_MODEL, productionOrder.id, {
            fields   : productionOrderFields.fields,
            populate : productionOrderFields.populate,
        });

        return deletedProductionOrder;
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
                            newData[i].isReady = j === 0;

                            const availabilityIndex = newData[i].reserves.findIndex( item => item.stock.uuid === availability.stock.uuid && item.warehouse.uuid === productionOrder.warehouse.uuid && item.batch?.uuid === availability.batch?.uuid );

                            newData[i].reserves[availabilityIndex].quantity = parseFloat(((material.quantity - reserved - (newReserved * materialProduct.unityConversionRate)) + newData[i].reserves[availabilityIndex].quantity).toFixed(4) );
                        } else {
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
                            newData[i].isReady = j === 0;

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
                        isReady       : false,
                        reserves      : [],
                    })),
                },
            },
            fields   : productionOrderFields.fields,
            populate : productionOrderFields.populate,
        });

        return updatedProductionOrder;
    },

    async startProduction( ctx ) {
        const { uuid } = ctx.params;

        const productionOrder = await findOne( uuid, PRODUCTION_ORDER_MODEL, productionOrderFields );

        if ( productionOrder.status !== "booked" && productionOrder.production.isReady ) {
            throw new BadRequestError( "Only booked production orders can be started and with full reserves in production stock", {
                key  : "production-order.notBooked",
                path : ctx.request.path,
            });
        }

        const reservedAvailabilities = await strapi.entityService.findMany(AVAILABILITY_MODEL, {
            filters : {
                reserves : {
                    productionOrder : productionOrder.id,
                },
            },
            ...availabilityFields,
        });

        let assignedStock = [];

        for ( let i = 0; i < reservedAvailabilities.length; i++ ) {
            const availability   = reservedAvailabilities[i];
            const batch          = availability.batch;
            const conversionRate = availability.product.unityConversionRate;
            
            const orderReserveIndex = availability.reserves.findIndex( reserve => reserve.productionOrder.uuid === productionOrder.uuid );
            
            const orderReserve      = availability.reserves[orderReserveIndex];
            const quantity          = orderReserve.quantity;
            const convertedQuantity = quantity * conversionRate;

            assignedStock.push({
                productUuid : availability.product.uuid,
                product : availability.product.name,
                unity : availability.product.productionUnity.name,
                quantity : convertedQuantity,
                ...( batch && {
                    batch : availability.batch.name,
                    batchUuid : availability.batch.uuid,
                })
            });

            await strapi.entityService.create(STOCK_MOVEMENT_MODEL, {
                data : {
                    movementType : "assignation",
                    warehouse    : availability.warehouse.id,
                    stock        : availability.stock.id,
                    product      : availability.product.id,
                    batch        : availability.batch?.id,
                    quantity     : quantity,
                },
            });

            reservedAvailabilities[i].reserves.splice(orderReserveIndex, 1);
            reservedAvailabilities[i].totalReserved = parseFloat( (reservedAvailabilities[i].totalReserved - quantity).toFixed(4) );
            reservedAvailabilities[i].quantity      = parseFloat( (reservedAvailabilities[i].quantity - quantity).toFixed(4) );

            if ( reservedAvailabilities[i].quantity === 0 && reservedAvailabilities[i].totalReserved === 0 ) {
                await strapi.entityService.delete(AVAILABILITY_MODEL, availability.id);
            } else {
                await strapi.entityService.update(AVAILABILITY_MODEL, availability.id, {
                    data : {
                        reserves : reservedAvailabilities[i].reserves,
                        totalReserved : reservedAvailabilities[i].totalReserved,
                        quantity : reservedAvailabilities[i].quantity,
                    },
                });
            }
        }

        const updatedProductionOrder = await strapi.entityService.update( PRODUCTION_ORDER_MODEL, productionOrder.id, {
            data : {
                status     : "inProgress",
                production : {
                    ...productionOrder.production,
                    stock : assignedStock,
                },
            },
            fields   : productionOrderFields.fields,
            populate : productionOrderFields.populate,
        });

        return updatedProductionOrder;
    },

    async assignStock( ctx ) {
        const data     = ctx.request.body;
        const { uuid } = ctx.params;

        await validateAssignStock( data );

        const productionOrder = await findOne( uuid, PRODUCTION_ORDER_MODEL, productionOrderFields );

        if ( productionOrder.status !== "inProgress" ) {
            throw new BadRequestError( "Only in progress production orders can be assigned stock", {
                key  : "production-order.notInProgress",
                path : ctx.request.path,
            });
        }

        const stockOrer = await strapi.query( STOCKS_ORDER_MODEL ).findOne({
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

        const product = await findOne( data.product, PRODUCT_MODEL, {
            fields   : ["name", "isActive", "unityConversionRate"],
            populate : {
                inventoryInfo : true,
                productionUnity : true,
            },
        });

        if ( !product.isActive ) {
            throw new BadRequestError( "You cannot make an entrance/adjustment of a inactive product", {
                key  : "stock-movement.inactiveProduct",
                path : ctx.request.path,
            });
        }

        if ( product.inventoryInfo?.manageBatches && !data.batch ) {
            throw new UnprocessableContentError( ["Batch is required because the product has being configured to manage batches"] );
        }

        if ( !product.inventoryInfo?.manageBatches && data.batch ) {
            throw new UnprocessableContentError( ["Batch is not required because the product has being configured to dont manage batches"] );
        }

        let batch;

        if ( product.inventoryInfo?.manageBatches ) {
            batch = await strapi.query( BATCH_MODEL ).findOne({
                where : {
                    uuid    : data.batch,
                    product : product.id,
                },
            });
    
            if ( !batch ) {
                throw new BadRequestError( `Batch with uuid ${ data.batch } not found`, {
                    key  : "stock-movement.batchNotFound",
                    path : ctx.request.path,
                });
            }
        }

        const availability = await strapi.query( AVAILABILITY_MODEL ).findOne({
            where : {
                stock     : stockOrer.stocksOrder[0].stock.id,
                product   : product.id,
                warehouse : productionOrder.warehouse.id,
                ...( batch && { batch : batch.id } ),
            },
            populate : {
                batch     : true,
                warehouse : true,
                stock     : true,
                product   : true,
                reserves  : {
                    populate : {
                        productionOrder : true,
                    },
                },
            },
        });

        if ( !availability ) {
            throw new NotFoundError( "There is no availability for this product in the Production Stock", {
                key  : "availability.notFoundInProduction",
                path : ctx.request.path,
            });
        }

        if ( (availability.quantity * product.unityConversionRate) < data.quantity ) {
            throw new BadRequestError( "There is not enough quantity for this product in the Production Stock", {
                key  : "stock-movement.notEnoughQuantity",
                path : ctx.request.path,
            });
        }

        const productReservesInAvailabilityIndex = availability.reserves?.findIndex( reserve => reserve.productionOrder.uuid === productionOrder.uuid );

        if ( productReservesInAvailabilityIndex !== -1 ) {
            let transferedQuantity = 0;
            const reservedQuantity = availability.reserves[productReservesInAvailabilityIndex].quantity;

            // Se va a liquidar porque la cantidad siendo movida es mayor a lo de la reserva,
            // pero tenemos que revisar si lo restante alcanza para lo disponible
            // en caso de que si alcance, tenemos que eliminar la reserva por que ya se pasó a la orden
            if ( (reservedQuantity * product.unityConversionRate) < data.quantity ) {

                transferedQuantity = (reservedQuantity * product.unityConversionRate);

                if ( (data.quantity - transferedQuantity) > (availability.quantity - availability.totalReserved) * product.unityConversionRate ) {
                    throw new BadRequestError( "There is not enough quantity for this product in the Production Stock", {
                        key  : "stock-movement.notEnoughQuantity",
                        path : ctx.request.path,
                    });
                }

                availability.reserves.splice( productReservesInAvailabilityIndex, 1 );

                const updatedOutAvailability = await strapi.entityService.update( AVAILABILITY_MODEL, availability.id, {
                    data : {
                        quantity : parseFloat( (availability.quantity - (data.quantity / product.unityConversionRate)).toFixed(4) ),
                        reserves : availability.reserves,
                        totalReserved : availability.totalReserved - (transferedQuantity / product.unityConversionRate),
                    },
                    fields   : availabilityFields.fields,
                    populate : availabilityFields.populate,
                });

                await strapi.entityService.create(STOCK_MOVEMENT_MODEL, {
                    data : {
                        movementType : "assignation",
                        warehouse    : availability.warehouse.id,
                        stock        : availability.stock.id,
                        product      : availability.product.id,
                        batch        : availability.batch?.id,
                        quantity     : parseFloat((data.quantity / product.unityConversionRate).toFixed(4)),
                    },
                });

                if ( updatedOutAvailability.quantity === 0 ) {
                    await strapi.entityService.delete( AVAILABILITY_MODEL, updatedOutAvailability.id );
                }

                const productionOrderStockIndex = productionOrder.production?.stock?.findIndex( stock => stock.productUuid === data.product && stock.batchUuid === data.batch );

                if ( productionOrderStockIndex !== -1 ) {
                    const newQuantity = parseFloat( ( productionOrder.production.stock[productionOrderStockIndex].quantity + data.quantity ).toFixed(4) );
    
                    productionOrder.production.stock[productionOrderStockIndex].quantity = newQuantity;
                } else {
                    productionOrder.production.stock.push({
                        product     : product.name,
                        productUuid : data.product,
                        unity       : product.productionUnity.name,
                        quantity    : data.quantity,
                        ...( data.batch && {
                            batch     : batch.name,
                            batchUuid : data.batch,
                        }),
                    });
                }

                const updatedInProuctionStock = await strapi.entityService.update( PRODUCTION_ORDER_MODEL, productionOrder.id, {
                    data : {
                        production : {
                            ...productionOrder.production,
                            stock : productionOrder.production.stock,
                        },
                    },
                    fields   : productionOrderFields.fields,
                    populate : productionOrderFields.populate,
                });
    
                return {
                    out : updatedOutAvailability,
                    in  : updatedInProuctionStock.production.stock,
                };

            // no se alcana a liquidar lo reservado, entonces no tenemos que validar lo que no está reservado
            } else {
                availability.reserves[productReservesInAvailabilityIndex].quantity = parseFloat( (reservedQuantity - (data.quantity / product.unityConversionRate)).toFixed(4) );

                if ( availability.reserves[productReservesInAvailabilityIndex].quantity === 0 ) availability.reserves.splice( productReservesInAvailabilityIndex, 1 );

                const updatedOutAvailability = await strapi.entityService.update( AVAILABILITY_MODEL, availability.id, {
                    data : {
                        quantity : parseFloat( (availability.quantity - (data.quantity / product.unityConversionRate)).toFixed(4) ),
                        reserves : availability.reserves,
                        totalReserved : availability.totalReserved - (data.quantity / product.unityConversionRate),
                    },
                    fields   : availabilityFields.fields,
                    populate : availabilityFields.populate,
                });

                await strapi.entityService.create(STOCK_MOVEMENT_MODEL, {
                    data : {
                        movementType : "assignation",
                        warehouse    : availability.warehouse.id,
                        stock        : availability.stock.id,
                        product      : availability.product.id,
                        batch        : availability.batch?.id,
                        quantity     : parseFloat((data.quantity / product.unityConversionRate).toFixed(4)),
                    },
                });

                if ( updatedOutAvailability.quantity === 0 ) {
                    await strapi.entityService.delete( AVAILABILITY_MODEL, updatedOutAvailability.id );
                }

                const productionOrderStockIndex = productionOrder.production?.stock?.findIndex( stock => stock.productUuid === data.product && stock.batchUuid === data.batch );

                if ( productionOrderStockIndex !== -1 ) {
                    const newQuantity = parseFloat( ( productionOrder.production.stock[productionOrderStockIndex].quantity + data.quantity ).toFixed(4) );
    
                    productionOrder.production.stock[productionOrderStockIndex].quantity = newQuantity;
                } else {
                    productionOrder.production.stock.push({
                        product     : product.name,
                        productUuid : data.product,
                        unity       : product.productionUnity.name,
                        quantity    : data.quantity,
                        ...( data.batch && {
                            batch     : batch.name,
                            batchUuid : data.batch,
                        }),
                    });
                }

                const updatedInProuctionStock = await strapi.entityService.update( PRODUCTION_ORDER_MODEL, productionOrder.id, {
                    data : {
                        production : {
                            ...productionOrder.production,
                            stock : productionOrder.production.stock,
                        },
                    },
                    fields   : productionOrderFields.fields,
                    populate : productionOrderFields.populate,
                });
    
                return {
                    out : updatedOutAvailability,
                    in  : updatedInProuctionStock.production.stock,
                };
            }
        } else {
            const updatedOutAvailability = await strapi.entityService.update( AVAILABILITY_MODEL, availability.id, {
                data : {
                    quantity : parseFloat( (availability.quantity - (data.quantity / product.unityConversionRate)).toFixed(4) ),
                },
                fields   : availabilityFields.fields,
                populate : availabilityFields.populate,
            });

            await strapi.entityService.create(STOCK_MOVEMENT_MODEL, {
                data : {
                    movementType : "assignation",
                    warehouse    : availability.warehouse.id,
                    stock        : availability.stock.id,
                    product      : availability.product.id,
                    batch        : availability.batch?.id,
                    quantity     : parseFloat((data.quantity / product.unityConversionRate).toFixed(4)),
                },
            });
    
            if ( updatedOutAvailability.quantity === 0 ) {
                await strapi.entityService.delete( AVAILABILITY_MODEL, updatedOutAvailability.id );
            }

            const productionOrderStockIndex = productionOrder.production?.stock?.findIndex( stock => stock.productUuid === data.product && stock.batchUuid === data.batch );

            if ( productionOrderStockIndex !== -1 ) {
                const newQuantity = parseFloat( ( productionOrder.production.stock[productionOrderStockIndex].quantity + data.quantity ).toFixed(4) );

                productionOrder.production.stock[productionOrderStockIndex].quantity = newQuantity;
            } else {
                productionOrder.production.stock.push({
                    product     : product.name,
                    productUuid : data.product,
                    unity       : product.productionUnity.name,
                    quantity    : data.quantity,
                    ...( data.batch && {
                        batch     : batch.name,
                        batchUuid : data.batch,
                    }),
                });
            }

            const updatedInProuctionStock = await strapi.entityService.update( PRODUCTION_ORDER_MODEL, productionOrder.id, {
                data : {
                    production : {
                        ...productionOrder.production,
                        stock : productionOrder.production.stock,
                    },
                },
                fields   : productionOrderFields.fields,
                populate : productionOrderFields.populate,
            });

            return {
                out : updatedOutAvailability,
                in  : updatedInProuctionStock.production.stock,
            };
        }
    },

    async returnStock( ctx ) {
        const data = ctx.request.body;
        const { uuid } = ctx.params;

        await validateReturnStock( data );

        const productionOrder = await findOne( uuid, PRODUCTION_ORDER_MODEL, productionOrderFields );

        if ( productionOrder.status !== "inProgress" ) {
            throw new BadRequestError( "Only in progress production orders can return stock", {
                key  : "production-order.notInProgress",
                path : ctx.request.path,
            });
        }

        const stockOrer = await strapi.query( STOCKS_ORDER_MODEL ).findOne({
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

        const product = await findOne( data.product, PRODUCT_MODEL, {
            fields   : ["name", "isActive", "unityConversionRate"],
            populate : {
                inventoryInfo : true,
                productionUnity : true,
            },
        });

        if ( !product.isActive ) {
            throw new BadRequestError( "You cannot make an entrance/adjustment of a inactive product", {
                key  : "stock-movement.inactiveProduct",
                path : ctx.request.path,
            });
        }

        if ( product.inventoryInfo?.manageBatches && !data.batch ) {
            throw new UnprocessableContentError( ["Batch is required because the product has being configured to manage batches"] );
        }

        if ( !product.inventoryInfo?.manageBatches && data.batch ) {
            throw new UnprocessableContentError( ["Batch is not required because the product has being configured to dont manage batches"] );
        }

        let batch;

        if ( product.inventoryInfo?.manageBatches ) {
            batch = await strapi.query( BATCH_MODEL ).findOne({
                where : {
                    uuid    : data.batch,
                    product : product.id,
                },
            });
    
            if ( !batch ) {
                throw new BadRequestError( `Batch with uuid ${ data.batch } not found`, {
                    key  : "stock-movement.batchNotFound",
                    path : ctx.request.path,
                });
            }
        }

        const stockIndex = productionOrder.production?.stock?.findIndex( stock => stock.productUuid === data.product && stock.batchUuid === data.batch );

        if ( stockIndex === -1 ) {
            throw new BadRequestError( "Stock not found in production order", {
                key  : "producion-order.stockNotFound",
                path : ctx.request.path,
            });
        }

        if ( data.quantity > productionOrder.production.stock[stockIndex].quantity ) {
            throw new BadRequestError( "The quantity to return is greater than the quantity in stock", {
                key  : "production-order.noEnoughQuantity",
                path : ctx.request.path,
            });
        }

        const inAvailability = await strapi.query( AVAILABILITY_MODEL ).findOne({
            where : {
                stock     : stockOrer.stocksOrder[0].stock.id,
                warehouse : productionOrder.warehouse.id,
                product   : product.id,
            },
            fields   : availabilityFields.fields,
            populate : availabilityFields.populate,
        });

        productionOrder.production.stock[stockIndex].quantity = parseFloat( ( productionOrder.production.stock[stockIndex].quantity - data.quantity ).toFixed(4) );

        if ( productionOrder.production.stock[stockIndex].quantity === 0 ) {
            productionOrder.production.stock.splice( stockIndex, 1 );
        }

        const updatedProductionOrder = await strapi.entityService.update( PRODUCTION_ORDER_MODEL, productionOrder.id, {
            data : {
                production : {
                    ...productionOrder.production,
                    stock : productionOrder.production.stock,
                },
            },
            fields   : productionOrderFields.fields,
            populate : productionOrderFields.populate,
        });

        if ( inAvailability ) {
            const updatedAvailability = await strapi.entityService.update( AVAILABILITY_MODEL, inAvailability.id, {
                data : {
                    quantity : parseFloat( (inAvailability.quantity + (data.quantity / product.unityConversionRate)).toFixed(4) ),
                },
                fields   : availabilityFields.fields,
                populate : availabilityFields.populate,
            });

            await strapi.entityService.create(STOCK_MOVEMENT_MODEL, {
                data : {
                    movementType : "desassignation",
                    warehouse    : inAvailability.warehouse.id,
                    stock        : inAvailability.stock.id,
                    product      : inAvailability.product.id,
                    batch        : inAvailability.batch?.id,
                    quantity     : parseFloat((data.quantity / product.unityConversionRate).toFixed(4)),
                },
            });

            return {
                out : updatedProductionOrder,
                in  : updatedAvailability,
            };
        } else {
            const newAvailability = await strapi.entityService.create( AVAILABILITY_MODEL, {
                data : {
                    stock     : stockOrer.stocksOrder[0].stock.id,
                    warehouse : productionOrder.warehouse.id,
                    quantity  : parseFloat( (data.quantity / product.unityConversionRate).toFixed(4) ),
                    product   : product.id,
                },
                fields   : availabilityFields.fields,
                populate : availabilityFields.populate,
            });

            await strapi.entityService.create(STOCK_MOVEMENT_MODEL, {
                data : {
                    movementType : "desassignation",
                    warehouse    : inAvailability.warehouse.id,
                    stock        : inAvailability.stock.id,
                    product      : inAvailability.product.id,
                    batch        : inAvailability.batch?.id,
                    quantity     : parseFloat((data.quantity / product.unityConversionRate).toFixed(4)),
                },
            });

            return {
                out : updatedProductionOrder,
                in  : newAvailability,
            };
        }
    },

    async addDeliver( ctx ) {
        const data     = ctx.request.body;
        const { uuid } = ctx.params;
        const user     = ctx.state.user;

        await validateAddDeliver( data );

        const productionOrder = await findOne( uuid, PRODUCTION_ORDER_MODEL, productionOrderFields );

        const product = await strapi.query( PRODUCT_MODEL ).findOne({
            where : {
                id : productionOrder.production.product.id,
            },
            fields   : ["name", "isActive", "unityConversionRate"],
            populate : {
                inventoryInfo : true,
                productionUnity : true,
            },
        });

        if ( !product.inventoryInfo?.manageBatches && data.batch ) {
            throw new UnprocessableContentError( ["Batch is not required because the product has being configured to dont manage batches"] );
        }

        if ( productionOrder.status !== "inProgress" ) {
            throw new BadRequestError( "Only in progress production orders can register deliveries", {
                key  : "production-order.notInProgress",
                path : ctx.request.path,
            });
        }

        if ( (productionOrder.production?.quantity - productionOrder.production.delivered) < data.quantity ) {
            throw new BadRequestError( "The quantity to deliver is greater than the quantity needed to be produced", {
                key  : "production-order.exceedNeededQuantity",
                path : ctx.request.path,
            });
        }

        productionOrder.production.delivered = parseFloat( ( productionOrder.production.delivered + data.quantity ).toFixed(4) );
        
        if ( product.inventoryInfo?.manageBatches ) {
            const batch = await strapi.query( BATCH_MODEL ).findOne({
                where : {
                    product : product.id,
                    name    : data.batch,
                },
            });

            if ( !batch ) {
                const newBatch = await strapi.entityService.create( BATCH_MODEL, {
                   data : {
                       product       : product.id,
                       name          : data.batch,
                       expirationDay : data.expirationDay,
                   },
                });

                const newAvailability = await strapi.entityService.create( AVAILABILITY_MODEL, {
                    data : {
                        stock     : process.env.NODE_ENV === "production" ? 115 : 103,
                        warehouse : productionOrder.warehouse.id,
                        quantity  : parseFloat( (data.quantity).toFixed(4) ),
                        product   : product.id,
                        batch     : newBatch.id,
                    },
                    fields   : availabilityFields.fields,
                    populate : availabilityFields.populate,
                });

                await strapi.entityService.create(STOCK_MOVEMENT_MODEL, {
                    data : {
                        movementType    : "deliver",
                        warehouse       : newAvailability.warehouse.id,
                        stock           : newAvailability.stock.id,
                        product         : newAvailability.product.id,
                        batch           : newAvailability.batch?.id,
                        quantity        : parseFloat((data.quantity).toFixed(4)),
                        productionOrder : productionOrder.id,
                        user            : user.id,
                    },
                });

                await strapi.entityService.update( PRODUCTION_ORDER_MODEL, productionOrder.id, {
                    data : {
                        production : productionOrder.production,
                    },
                    fields   : productionOrderFields.fields,
                    populate : productionOrderFields.populate,
                });

                return newAvailability;

            } else {
                const inAvailability = await strapi.query( AVAILABILITY_MODEL ).findOne({
                    where : {
                        batch     : batch.id,
                        warehouse : productionOrder.warehouse.id,
                        product   : product.id,
                        stock     : process.env.NODE_ENV === "production" ? 115 : 103,
                    },
                    fields   : availabilityFields.fields,
                    populate : availabilityFields.populate,
                });

                if ( inAvailability ) {
                    const updatedAvailability = await strapi.entityService.update( AVAILABILITY_MODEL, inAvailability.id, {
                        data : {
                            quantity : parseFloat( (inAvailability.quantity + (data.quantity)).toFixed(4) ),
                        },
                        fields   : availabilityFields.fields,
                        populate : availabilityFields.populate,
                    });

                    await strapi.entityService.create(STOCK_MOVEMENT_MODEL, {
                        data : {
                            movementType    : "deliver",
                            warehouse       : inAvailability.warehouse.id,
                            stock           : inAvailability.stock.id,
                            product         : inAvailability.product.id,
                            batch           : inAvailability.batch?.id,
                            quantity        : parseFloat((data.quantity).toFixed(4)),
                            productionOrder : productionOrder.id,
                            user            : user.id,
                        },
                    });

                    await strapi.entityService.update( PRODUCTION_ORDER_MODEL, productionOrder.id, {
                        data : {
                            production : productionOrder.production,
                        },
                        fields   : productionOrderFields.fields,
                        populate : productionOrderFields.populate,
                    });

                    return updatedAvailability;
                } else {
                    const newAvailability = await strapi.entityService.create( AVAILABILITY_MODEL, {
                        data : {
                            stock     : process.env.NODE_ENV === "production" ? 115 : 103,
                            warehouse : productionOrder.warehouse.id,
                            quantity  : parseFloat( (data.quantity).toFixed(4) ),
                            product   : product.id,
                            batch     : batch.id,
                        },
                        fields   : availabilityFields.fields,
                        populate : availabilityFields.populate,
                    });

                    

                    await strapi.entityService.update( PRODUCTION_ORDER_MODEL, productionOrder.id, {
                        data : {
                            production : productionOrder.production,
                        },
                        fields   : productionOrderFields.fields,
                        populate : productionOrderFields.populate,
                    });

                    return newAvailability;
                }
            }
        } else {
            const inAvailability = await strapi.query( AVAILABILITY_MODEL ).findOne({
                where : {
                    warehouse : productionOrder.warehouse.id,
                    product   : product.id,
                },
                fields   : availabilityFields.fields,
                populate : availabilityFields.populate,
            });

            if ( inAvailability ) {
                const updatedAvailability = await strapi.entityService.update( AVAILABILITY_MODEL, inAvailability.id, {
                    data : {
                        quantity : parseFloat( (inAvailability.quantity + (data.quantity)).toFixed(4) ),
                    },
                    fields   : availabilityFields.fields,
                    populate : availabilityFields.populate,
                });

                await strapi.entityService.create(STOCK_MOVEMENT_MODEL, {
                    data : {
                        movementType    : "deliver",
                        warehouse       : inAvailability.warehouse.id,
                        stock           : inAvailability.stock.id,
                        product         : inAvailability.product.id,
                        batch           : inAvailability.batch?.id,
                        quantity        : parseFloat((data.quantity).toFixed(4)),
                        productionOrder : productionOrder.id,
                        user            : user.id,
                    },
                });

                await strapi.entityService.update( PRODUCTION_ORDER_MODEL, productionOrder.id, {
                    data : {
                        production : productionOrder.production,
                    },
                    fields   : productionOrderFields.fields,
                    populate : productionOrderFields.populate,
                });

                return updatedAvailability;
            } else {
                const newAvailability = await strapi.entityService.create( AVAILABILITY_MODEL, {
                    data : {
                        stock     : process.env.NODE_ENV === "production" ? 115 : 103,
                        warehouse : productionOrder.warehouse.id,
                        quantity  : parseFloat( (data.quantity).toFixed(4) ),
                        product   : product.id,
                    },
                    fields   : availabilityFields.fields,
                    populate : availabilityFields.populate,
                });

                await strapi.entityService.create(STOCK_MOVEMENT_MODEL, {
                    data : {
                        movementType    : "deliver",
                        warehouse       : newAvailability.warehouse.id,
                        stock           : newAvailability.stock.id,
                        product         : newAvailability.product.id,
                        batch           : newAvailability.batch?.id,
                        quantity        : parseFloat((data.quantity).toFixed(4)),
                        productionOrder : productionOrder.id,
                        user            : user.id,
                    },
                });

                await strapi.entityService.update( PRODUCTION_ORDER_MODEL, productionOrder.id, {
                    data : {
                        production : productionOrder.production,
                    },
                    fields   : productionOrderFields.fields,
                    populate : productionOrderFields.populate,
                });

                return newAvailability;
            }
        }
    },

    async completeOrder( ctx ) {
        const { uuid } = ctx.params;

        const productionOrder = await findOne( uuid, PRODUCTION_ORDER_MODEL, productionOrderFields );

        if ( productionOrder.status !== "inProgress" ) {
            throw new BadRequestError( "Only in progress production orders can be completed", {
                key  : "production-order.notInProgress",
                path : ctx.request.path,
            });
        }

        let productionLoss = [];

        for ( let i = 0; i < productionOrder.production.materials.length; i++ ) {
            const material = productionOrder.production.materials[i];

            const productStock    = productionOrder.production.stock.filter( stock => stock.productUuid === material.uuid );
            const productQuantity = productStock.reduce( ( accumulator, currentValue ) => accumulator + currentValue.quantity, 0 );
            const lossQuantity    = parseFloat( (productQuantity - material.quantity).toFixed(4) );

            if ( lossQuantity === 0 ) {
                continue;
            }

            // ? Cómo se va a calcular el costo de la merma?
            // ? Hay que convertir unidades?

            // const materialObject = await findOne( material.uuid, PRODUCT_MODEL, { populate : { purchaseInfo : true } });

            productionLoss.push({
                productUuid : material.uuid,
                product     : material.name,
                quantity    : parseFloat( (productQuantity - material.quantity).toFixed(4) ),
                unity       : material.unity,
                // cost        : parseFloat( (materialObject.purchaseInfo.purchasePrice * lossQuantity).toFixed(4) ),
            });
        }

        const updatedProductionOrder = await strapi.entityService.update( PRODUCTION_ORDER_MODEL, productionOrder.id, {
            data : {
                status : "closed",
                // loss   : productionLoss,
            },
            fields   : productionOrderFields.fields,
            populate : productionOrderFields.populate,
        });

        return updatedProductionOrder;
    },
}));