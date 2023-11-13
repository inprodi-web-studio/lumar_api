"use strict";

const {
    BadRequestError,
    UnprocessableContentError,
} = require("../../../helpers/errors");

const { STOCK_MOVEMENT_MODEL, AVAILABILITY_MODEL, BATCH_MODEL, PRODUCTION_ORDER_MODEL } = require("../../../constants/models");

const { createCoreService } = require("@strapi/strapi").factories;

const availabilityFields = {
    fields   : ["uuid", "quantity", "price"],
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
            fields : ["uuid", "name"],
        },
        reserves : {
            populate : {
                productionOrder : true,
            },
        },
    },
};

module.exports = createCoreService( STOCK_MOVEMENT_MODEL, ({ strapi }) => ({
    async validateConfiguration( data, warehouse, product, stock ) {
        const ctx      = strapi.requestContext.get();
        const movement = ctx.request.path.replace("/api/stock-movements/", "");

        if ( !stock.warehouses.find( x => x.uuid === warehouse.uuid ) ) {
            throw new BadRequestError( `Stock with the uuid ${ stock.uuid } is not assign to the warehouse with the uuid ${ warehouse.uuid }`, {
                key  : "stock-movement.notInWarehouse",
                path : ctx.request.path,
            });
        }

        if ( movement === "entrance" || ( movement === "adjust" && data.quantity > 0 ) ) {
            if ( !product.isActive ) {
                throw new BadRequestError( "You cannot make an entrance/adjustment of a inactive product", {
                    key  : "stock-movement.inactiveProduct",
                    path : ctx.request.path,
                });
            }

            if ( product.inventoryInfo?.expirationDays && !data.expirationDay && !data.batch ) {
                throw new UnprocessableContentError( ["Expiration day is required beacuse the product has being configured to manage expiration"] );
            }
    
            if ( !product.inventoryInfo?.expirationDays && data.expirationDay ) {
                throw new UnprocessableContentError( ["Expiration day is not required beacuse the product has being configured to dont manage expiration"] );
            }
        }

        if ( product.inventoryInfo?.manageBatches && !data.batch ) {
            throw new UnprocessableContentError( ["Batch is required because the product has being configured to manage batches"] );
        }

        if ( !product.inventoryInfo?.manageBatches && data.batch ) {
            throw new UnprocessableContentError( ["Batch is not required because the product has being configured to dont manage batches"] );
        }
    },

    async handleNoBatchEntranceCreation( data, warehouse, product, stock ) {
        const availability = await strapi.query( AVAILABILITY_MODEL ).findOne({
            where : {
                stock     : stock.id,
                warehouse : warehouse.id,
                product   : product.id,
            },
        });

        if ( availability ) {
            const updatedAvailability = await strapi.entityService.update( AVAILABILITY_MODEL, availability.id, {
                data : {
                    quantity : parseFloat( (availability.quantity + data.quantity).toFixed(4) ),
                },
                fields   : availabilityFields.fields,
                populate : availabilityFields.populate,
            });

            return updatedAvailability;
        } else {
            const newAvailability = await strapi.entityService.create( AVAILABILITY_MODEL, {
                data : {
                    price     : data.price,
                    stock     : stock.id,
                    warehouse : warehouse.id,
                    quantity  : data.quantity,
                    product   : product.id,
                },
                fields   : availabilityFields.fields,
                populate : availabilityFields.populate,
            });

            return newAvailability;
        }
    },

    async handleBatchEntranceCreation( data, product, warehouse, stock ) {
        const batch = await strapi.query( BATCH_MODEL ).findOne({
            where : {
                name    : data.batch,
                product : product.id,
            },
        });

        if ( batch ) {
            const availability = await strapi.query( AVAILABILITY_MODEL ).findOne({
                where : {
                    batch     : batch.id,
                    stock     : stock.id,
                    warehouse : warehouse.id,
                    product   : product.id,
                },
            });

            if ( availability ) {
                const updatedAvailability = await strapi.entityService.update( AVAILABILITY_MODEL, availability.id, {
                    data : {
                        quantity : parseFloat( (availability.quantity + data.quantity).toFixed(4) ),
                    },
                    fields   : availabilityFields.fields,
                    populate : availabilityFields.populate,
                });

                return updatedAvailability;
            } else {
                const newAvailability = await strapi.entityService.create( AVAILABILITY_MODEL, {
                    data : {
                        price     : data.price,
                        batch     : batch.id,
                        quantity  : data.quantity,
                        stock     : stock.id,
                        warehouse : warehouse.id,
                        product   : product.id,
                    },
                    fields   : availabilityFields.fields,
                    populate : availabilityFields.populate,
                });

                return newAvailability;
            }
        } else {
            if ( !data.price ) {
                throw new UnprocessableContentError( ["Price is required"] );
            }

            if ( product.inventoryInfo?.expirationDays && !data.expirationDay ) {
                throw new UnprocessableContentError( ["Expiration day is required beacuse the product has being configured to manage expiration"] );
            }

            const newBatch = await strapi.entityService.create( BATCH_MODEL, {
                data : {
                    expirationDay : data.expirationDay,
                    name          : data.batch,
                    product       : product.id,
                },
            });

            const newAvailability = await strapi.entityService.create( AVAILABILITY_MODEL, {
                data : {
                    price     : data.price,
                    stock     : stock.id,
                    warehouse : warehouse.id,
                    batch     : newBatch.id,
                    quantity  : data.quantity,
                    product   : product.id,
                },
                fields   : availabilityFields.fields,
                populate : availabilityFields.populate,
            });

            return newAvailability;
        }
    },

    async handleNoBatchExitCreation( data, warehouse, product, stock ) {
        const ctx = strapi.requestContext.get();

        const availability = await strapi.query( AVAILABILITY_MODEL ).findOne({
            where : {
                stock     : stock.id,
                warehouse : warehouse.id,
                product   : product.id,
            },
        });

        if ( !availability ) {
            throw new BadRequestError( "There is no availability for this product", {
                key  : "stock-movement.noAvailability",
                path : ctx.request.path,
            });
        }

        if ( availability.quantity < data.quantity ) {
            throw new BadRequestError( "There is not enough quantity for this product", {
                key  : "stock-movement.notEnoughQuantity",
                path : ctx.request.path,
            });
        }

        const updatedAvailability = await strapi.entityService.update( AVAILABILITY_MODEL, availability.id, {
            data : {
                quantity : parseFloat( (availability.quantity - data.quantity).toFixed(4) ),
            },
            fields   : availabilityFields.fields,
            populate : availabilityFields.populate,
        });

        if ( updatedAvailability.quantity === 0 ) {
            await strapi.entityService.delete( AVAILABILITY_MODEL, updatedAvailability.id );
        }

        return updatedAvailability;
    },

    async handleBatchExitCreation( data, warehouse, product, stock ) {
        const ctx = strapi.requestContext.get();

        const batch = await strapi.query( BATCH_MODEL ).findOne({
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

        const availability = await strapi.query( AVAILABILITY_MODEL ).findOne({
            where : {
                stock     : stock.id,
                batch     : batch.id,
                warehouse : warehouse.id,
                product   : product.id,
            },
        });

        if ( !availability ) {
            throw new BadRequestError( "There is no availability for this product", {
                key  : "stock-movement.noAvailability",
                path : ctx.request.path,
            });
        }

        if ( availability.quantity < data.quantity ) {
            throw new BadRequestError( "There is not enough quantity for this product", {
                key  : "stock-movement.notEnoughQuantity",
                path : ctx.request.path,
            });
        }

        const updatedAvailability = await strapi.entityService.update( AVAILABILITY_MODEL, availability.id, {
            data : {
                quantity : parseFloat( (availability.quantity - data.quantity).toFixed(4) ),
            },
            fields   : availabilityFields.fields,
            populate : availabilityFields.populate,
        });

        if ( updatedAvailability.quantity === 0 ) {
            await strapi.entityService.delete( AVAILABILITY_MODEL, updatedAvailability.id );
        }

        return updatedAvailability;
    },

    async handleNoBatchTransferCreation( data, warehouseOut, warehouseIn, product, stockOut, stockIn ) {
        const ctx = strapi.requestContext.get();

        const outAvailability = await strapi.query( AVAILABILITY_MODEL ).findOne({
            where : {
                stock     : stockOut.id,
                warehouse : warehouseOut.id,
                product   : product.id,
            },
            fields   : availabilityFields.fields,
            populate : availabilityFields.populate,
        });

        if ( !outAvailability ) {
            throw new BadRequestError( "There is no availability for this product in the Out Stock", {
                key  : "stock-movement.noAvailability",
                path : ctx.request.path,
            });
        }

        if ( outAvailability.quantity < data.quantity ) {
            throw new BadRequestError( "There is not enough quantity for this product in the Out Stock", {
                key  : "stock-movement.notEnoughQuantity",
                path : ctx.request.path,
            });
        }

        const inAvailability = await strapi.query( AVAILABILITY_MODEL ).findOne({
            where : {
                stock     : stockIn.id,
                warehouse : warehouseIn.id,
                product   : product.id,
            },
            fields   : availabilityFields.fields,
            populate : availabilityFields.populate,
        });

        let updatedOutAvailability;

        if ( outAvailability.reserves?.length > 0 ) {
            let transferedQuantity = 0;
            let newReserves        = [];
            let reserves           = [...outAvailability.reserves];

            for ( let i = 0; i < outAvailability.reserves.length; i++ ) {
                const reserve = outAvailability.reserves[i];

                // Hay más cantidad que se está moviendo (o igual) de la que está reservada,
                // por lo que se tiene que eliminar la reservación y pasarla a la otra disponibilidad
                if ( parseFloat((data.quantity - transferedQuantity).toFixed(4)) >= reserve.quantity ) {
                    newReserves.push({
                        quantity        : reserve.quantity,
                        productionOrder : reserve.productionOrder.id,
                    });

                    reserves.splice( i, 1 );

                    const productionOrder = await strapi.query( PRODUCTION_ORDER_MODEL ).findOne({
                        where : {
                            uuid : reserve.productionOrder.uuid,
                        },
                        populate : {
                            production : {
                                populate : {
                                    materials : {
                                        populate : {
                                            reserves : {
                                                populate : {
                                                    stock     : true,
                                                    warehouse : true,
                                                    batch     : true,
                                                },
                                            },
                                        },
                                    },
                                },
                            },
                        },
                    });

                    // Encontramos el material en la orden de producción que le corresponda al producto que se está moviendo (siempre debe de existir)
                    const materialIndex = productionOrder.production.materials.findIndex( material => material.uuid === data.product );

                    // Encontramos si hay reservaciones para el producto en el inventario de salida de la transferencia (siempre debe de existir)
                    const outStockReserveIndex = productionOrder.production.materials[materialIndex].reserves
                        .findIndex( reserve => reserve.stock.uuid === data.stockOut && reserve.warehouse.uuid === data.warehouseOut && reserve.batch?.uuid === data.batch );

                    // Encontramos si hay reservaciones para el producto en el inventario de entrada de la transferencia (no necesariamente existe)
                    const inStockReserveIndex = productionOrder.production.materials[materialIndex].reserves
                        .findIndex( reserve => reserve.stock.uuid === data.stockIn && reserve.warehouse.uuid === data.warehouseIn && reserve.batch?.uuid === data.batch )

                    // Si existe el inventario de salida, tenemos que sumar la cantidad en ese inventario, ya que previamente ya estaba registrado

                    // Si no existe una reservación en el inventario de salida, tenemos que cambiar el inventario para el de entrada
                    // podemos simplemente actualizar el inventario ya que la cantidad siendo transferida, se supone que es mayor
                    // que la cantidad total de reserva de la disponibilidad, por lo que podemos dar por hecho que vamos a mover 
                    // la totalidad de la reserva

                    if ( inStockReserveIndex !== -1 ) {
                        productionOrder.production.materials[materialIndex].reserves[inStockReserveIndex].quantity = 
                            parseFloat( (productionOrder.production.materials[materialIndex].reserves[inStockReserveIndex].quantity + ((data.quantity - transferedQuantity) * product.unityConversionRate)).toFixed(4) );

                        productionOrder.production.materials[materialIndex].reserves.splice( outStockReserveIndex, 1 );
                    } else {
                        productionOrder.production.materials[materialIndex].reserves[outStockReserveIndex].stock = stockIn.id;
                    }

                    await strapi.entityService.update( PRODUCTION_ORDER_MODEL, productionOrder.id, {
                        data : {
                            production : {
                                ...productionOrder.production,
                                materials : productionOrder.production.materials,
                            },
                        },
                    });

                    // Nos ayuda a saber del total que se necesita transferir, cuánto ya ha sido considerado de las reservaciones
                    transferedQuantity += reserve.quantity;
                } else {
                    newReserves.push({
                        quantity        : parseFloat((data.quantity - transferedQuantity).toFixed(4)),
                        productionOrder : reserve.productionOrder.id,
                    });

                    reserves[i].quantity = parseFloat((reserve.quantity - (data.quantity - transferedQuantity)).toFixed(4));

                    // TODO: Contemplar cuando se hace un split de stocks en las reservaciones de la orden de producción porque no se alcanza a liquidar la cantidad

                    transferedQuantity += parseFloat( (data.quantity - transferedQuantity).toFixed(4) );
                }
            }

            updatedOutAvailability = await strapi.entityService.update( AVAILABILITY_MODEL, outAvailability.id, {
                data : {
                    quantity : parseFloat( (outAvailability.quantity - data.quantity).toFixed(4) ),
                    reserves,
                    totalReserved : outAvailability.totalReserved - transferedQuantity,
                },
                fields   : availabilityFields.fields,
                populate : availabilityFields.populate,
            });

            if ( updatedOutAvailability.quantity === 0 ) {
                await strapi.entityService.delete( AVAILABILITY_MODEL, updatedOutAvailability.id );
            }

            if ( inAvailability ) {
                for ( let i = 0; i < newReserves.length; i++ ) {
                    const index = inAvailability.reserves?.findIndex( reserve => reserve.productionOrder.id === newReserves[i].productionOrder );

                    if ( index !== -1 ) {
                        inAvailability.reserves[index].quantity = parseFloat( (inAvailability.reserves[index].quantity + newReserves[i].quantity).toFixed(4) );
    
                        newReserves[i] = inAvailability.reserves[index];
                    }
                }

                const updatedAvailability = await strapi.entityService.update( AVAILABILITY_MODEL, inAvailability.id, {
                    data : {
                        quantity      : parseFloat( (inAvailability.quantity + data.quantity).toFixed(4) ),
                        reserves      : newReserves,
                        totalReserved : inAvailability.totalReserved + transferedQuantity,
                    },
                    fields   : availabilityFields.fields,
                    populate : availabilityFields.populate,
                });

                return {
                    out : updatedOutAvailability,
                    in  : updatedAvailability,
                };
            } else {
                const newAvailability = await strapi.entityService.create( AVAILABILITY_MODEL, {
                    data : {
                        stock         : stockIn.id,
                        warehouse     : warehouseIn.id,
                        quantity      : data.quantity,
                        reserves      : newReserves,
                        product       : product.id,
                        totalReserved : transferedQuantity,
                    },
                    fields   : availabilityFields.fields,
                    populate : availabilityFields.populate,
                });
    
                return {
                    out : updatedOutAvailability,
                    in  : newAvailability,
                };
            }

        } else {
            updatedOutAvailability = await strapi.entityService.update( AVAILABILITY_MODEL, outAvailability.id, {
                data : {
                    quantity : parseFloat( (outAvailability.quantity - data.quantity).toFixed(4) ),
                },
                fields   : availabilityFields.fields,
                populate : availabilityFields.populate,
            });

            if ( updatedOutAvailability.quantity === 0 ) {
                await strapi.entityService.delete( AVAILABILITY_MODEL, updatedOutAvailability.id );
            }

            if ( inAvailability ) {
                const updatedAvailability = await strapi.entityService.update( AVAILABILITY_MODEL, inAvailability.id, {
                    data : {
                        quantity : parseFloat( (inAvailability.quantity + data.quantity).toFixed(4) ),
                    },
                    fields   : availabilityFields.fields,
                    populate : availabilityFields.populate,
                });
    
                return {
                    out : updatedOutAvailability,
                    in  : updatedAvailability,
                };
            } else {
                const newAvailability = await strapi.entityService.create( AVAILABILITY_MODEL, {
                    data : {
                        stock     : stockIn.id,
                        warehouse : warehouseIn.id,
                        quantity  : data.quantity,
                        product   : product.id,
                    },
                    fields   : availabilityFields.fields,
                    populate : availabilityFields.populate,
                });
    
                return {
                    out : updatedOutAvailability,
                    in  : newAvailability,
                };
            }
        }
    },

    async handleBatchTransferCreation( data, warehouseOut, warehouseIn, product, stockOut, stockIn ) {
        const ctx = strapi.requestContext.get();

        const batch = await strapi.query( BATCH_MODEL ).findOne({
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

        const outAvailability = await strapi.query( AVAILABILITY_MODEL ).findOne({
            where : {
                batch     : batch.id,
                stock     : stockOut.id,
                warehouse : warehouseOut.id,
                product   : product.id,
            },
        });

        if ( !outAvailability ) {
            throw new BadRequestError( "There is no availability for this product in the Out Stock", {
                key  : "stock-movement.noAvailability",
                path : ctx.request.path,
            });
        }

        if ( outAvailability.quantity < data.quantity ) {
            throw new BadRequestError( "There is not enough quantity for this product in the Out Stock", {
                key  : "stock-movement.notEnoughQuantity",
                path : ctx.request.path,
            });
        }

        const updatedOutAvailability = await strapi.entityService.update( AVAILABILITY_MODEL, outAvailability.id, {
            data : {
                quantity : parseFloat( (outAvailability.quantity - data.quantity).toFixed(4) ),
            },
            fields   : availabilityFields.fields,
            populate : availabilityFields.populate,
        });

        if ( updatedOutAvailability.quantity === 0 ) {
            await strapi.entityService.delete( AVAILABILITY_MODEL, updatedOutAvailability.id );
        }

        const inAvailability = await strapi.query( AVAILABILITY_MODEL ).findOne({
            where : {
                batch     : batch.id,
                stock     : stockIn.id,
                warehouse : warehouseIn.id,
                product   : product.id,
            },
        });

        if ( inAvailability ) {
            const updatedAvailability = await strapi.entityService.update( AVAILABILITY_MODEL, inAvailability.id, {
                data : {
                    quantity : parseFloat( (inAvailability.quantity + data.quantity).toFixed(4) ),
                },
                fields   : availabilityFields.fields,
                populate : availabilityFields.populate,
            });

            return {
                out : updatedOutAvailability,
                in  : updatedAvailability,
            };
        } else {
            const newAvailability = await strapi.entityService.create( AVAILABILITY_MODEL, {
                data : {
                    batch     : batch.id,
                    stock     : stockIn.id,
                    warehouse : warehouseIn.id,
                    quantity  : data.quantity,
                    product   : product.id,
                },
                fields   : availabilityFields.fields,
                populate : availabilityFields.populate,
            });

            return {
                out : updatedOutAvailability,
                in  : newAvailability,
            }
        }
    },

    async handleNoBatchAdjustmentCreation( data, warehouse, product, stock ) {
        if ( data.quantity > 0 ) {
            return await strapi.service( STOCK_MOVEMENT_MODEL ).handleNoBatchEntranceCreation( data, warehouse, product, stock );
        }

        if ( data.quantity < 0 ) {
            data.quantity = -data.quantity;
            return await strapi.service( STOCK_MOVEMENT_MODEL ).handleNoBatchExitCreation( data, warehouse, product, stock );
        }
    },

    async handleBatchAdjustmentCreation( data, warehouse, product, stock ) {
        if ( data.quantity > 0 ) {
            return await strapi.service( STOCK_MOVEMENT_MODEL ).handleBatchEntranceCreation( data, product, warehouse, stock );
        }

        if ( data.quantity < 0 ) {
            data.quantity = -data.quantity;
            return await strapi.service( STOCK_MOVEMENT_MODEL ).handleBatchExitCreation( data, warehouse, product, stock );
        }
    },
}));
