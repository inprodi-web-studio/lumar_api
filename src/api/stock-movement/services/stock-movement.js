"use strict";

const {
    BadRequestError,
    UnprocessableContentError,
} = require("../../../helpers/errors");

const { STOCK_MOVEMENT_MODEL, AVAILABILITY_MODEL, BATCH_MODEL } = require("../../../constants/models");

const { createCoreService } = require("@strapi/strapi").factories;

const availabilityFields = {
    fields   : ["uuid", "quantity"],
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
    },
};

module.exports = createCoreService( STOCK_MOVEMENT_MODEL, ({ strapi }) => ({
    async validateConfiguration( data, warehouse, product, stock ) {
        const ctx = strapi.requestContext.get();

        if ( !stock.warehouses.find( x => x.uuid === warehouse.uuid ) ) {
            throw new BadRequestError( `Stock with the uuid ${ stock.uuid } is not assign to the warehouse with the uuid ${ warehouse.uuid }`, {
                key  : "stock-movement.notInWarehouse",
                path : ctx.request.path,
            });
        }

        if ( !product.isActive ) {
            throw new BadRequestError( "You cannot make an entrance of a inactive product", {
                key  : "stock-movement.inactiveProduct",
                path : ctx.request.path,
            });
        }

        if ( product.inventoryInfo.manageBatches && !data.batch ) {
            throw new UnprocessableContentError( ["Batch is required because the product has being configured to manage batches"] );
        }

        if ( !product.inventoryInfo.manageBatches && data.batch ) {
            throw new UnprocessableContentError( ["Batch is not required because the product has being configured to dont manage batches"] );
        }

        if ( product.inventoryInfo.expirationDays && !data.expirationDay ) {
            throw new UnprocessableContentError( ["Expiration day is required beacuse the product has being configured to manage expiration"] );
        }

        if ( !product.inventoryInfo.expirationDays && data.expirationDay ) {
            throw new UnprocessableContentError( ["Expiration day is not required beacuse the product has being configured to dont manage expiration"] );
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
                    quantity : availability.quantity + data.quantity,
                },
                fields   : availabilityFields.fields,
                populate : availabilityFields.populate,
            });

            return updatedAvailability;
        } else {
            const newAvailability = await strapi.entityService.create( AVAILABILITY_MODEL, {
                data : {
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
                        quantity : availability.quantity + data.quantity,
                    },
                    fields   : availabilityFields.fields,
                    populate : availabilityFields.populate,
                });

                return updatedAvailability;
            } else {
                const newAvailability = await strapi.entityService.create( AVAILABILITY_MODEL, {
                    data : {
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
            const newBatch = await strapi.entityService.create( BATCH_MODEL, {
                data : {
                    expirationDay : data.expirationDay,
                    name          : data.batch,
                    product       : product.id,
                },
            });

            const newAvailability = await strapi.entityService.create( AVAILABILITY_MODEL, {
                data : {
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
}));