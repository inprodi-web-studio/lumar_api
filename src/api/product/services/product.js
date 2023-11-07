"use strict";

const {
    TAG_MODEL,
    PRODUCT_MODEL,
    CATEGORY_MODEL,
} = require("../../../constants/models");

const { ConflictError, BadRequestError, NotFoundError } = require("../../../helpers/errors");

const { getService } = require("@strapi/plugin-upload/server/utils");

const findOne = require("../../../helpers/findOne");

const { createCoreService } = require("@strapi/strapi").factories;

module.exports = createCoreService( PRODUCT_MODEL, ({ strapi }) => ({
    async checkForDuplicates( sku, name ) {
        const ctx    = strapi.requestContext.get();
        const method = ctx.request.method;

        const conflictingProducts = await strapi.query( PRODUCT_MODEL ).findMany({
           where : {
               $or : [
                {
                    name,
                },
                {
                    sku,
                },
               ],
               ...( method === "PUT" && {
                   uuid : {
                       $not : ctx.params.id,
                   }
               }),
           }, 
        });

        if ( conflictingProducts.length > 0 ) {
            if ( conflictingProducts[0].sku === sku ) {
                throw new ConflictError({
                    code : 1062,
                    nameCode : "ER_DUP_ENTRY",
                    description : {
                        value   : name,
                        message : "There is already a product with this sku",
                    },
                });
            }

            if ( conflictingProducts[0].name === name ) {
                throw new ConflictError({
                    code : 1062,
                    nameCode : "ER_DUP_ENTRY",
                    description : {
                        value   : name,
                        message : "There is already a product with this name",
                    },
                });
            }
        }
    },

    async validateImage( imageId ) {
        const ctx  = strapi.requestContext.get();
        const file = await getService("upload").findOne( imageId );

        if ( !file ) {
            throw new NotFoundError( "Image not found", {
                key  : "upload.imageNotFound",
                path : ctx.request.url,
            });
        }

        return file;
    },

    async validateCategories( categories = [] ) {
        let categoriesIds = [];

        for ( const category of categories ) {
            const categoryObject = await findOne( category, CATEGORY_MODEL );

            categoriesIds.push( categoryObject.id );
        }

        return categoriesIds;
    },

    async validateTags( tags = [] ) {
        let tagsIds = [];

        for ( const tag of tags ) {
            const tagObject = await findOne( tag, TAG_MODEL );

            tagsIds.push( tagObject.id );
        }

        return tagsIds;
    },

    async validateMaterials( products = [] ) {
        const ctx    = strapi.requestContext.get();
        const method = ctx.request.method;

        let materials = [];

        for ( const { product, quantity } of products ) {
            const productObject = await findOne( product, PRODUCT_MODEL, {
                populate : {
                    productionUnity : true,
                },
            });
            const hasDuplicates = products.filter( p => p.product === product ).length > 1;

            if ( hasDuplicates ) {
                throw new ConflictError({
                    code : 1062,
                    nameCode : "ER_DUP_ENTRY",
                    description : {
                        value   : product,
                        message : "There can not be the same product in the material list",
                    },
                });
            }

            if ( !productObject.isActive ) {
                throw new BadRequestError( "An inactive product can't be part of a list of materials", {
                    key  : "product.inactiveInBom",
                    path : ctx.request.path,
                });
            }

            if ( method === "PUT" && product === ctx.params.id ) {
                throw new BadRequestError( "A product can't be part of his own list of materials", {
                    key  : "product.selfInBom",
                    path : ctx.request.path,
                });
            }

            materials.push({
                uuid     : product,
                name     : productObject.name,
                quantity : quantity,
                unity    : productObject.productionUnity.name,
            });
        }

        return materials;
    },
    
    async generateBom( productUuid ) {
        let materials = [];

        const product = await findOne( productUuid, PRODUCT_MODEL, {
            fields : "*",
        });

        if ( product.materials?.length > 0 ) {
            for ( const material of product.materials ) {
                materials.push({
                    uuid      : material.uuid,
                    name      : material.name,
                    quantity  : material.quantity,
                    materials : await strapi.service( PRODUCT_MODEL ).generateBom( material.uuid ),
                });
            }

            return materials;
        }
    },
}));
