"use strict";

const { PRODUCT_MODEL, UNITY_MODEL } = require("../../../constants/models");

const { validateAddProduct } = require("../validation");

const findMany = require("../../../helpers/findMany");
const findOne  = require("../../../helpers/findOne");

const { createCoreController } = require("@strapi/strapi").factories;

const productFields = {
    fields : ["uuid", "sku", "name", "description", "type", "isActive"],
    populate : {
        saleInfo : {
            fields : ["salePrice", "iva"],
        },
        purchaseInfo : {
            fields : ["purchasePrice", "iva"],
        },
        unity : {
            fields : ["uuid", "name"],
        },
        categories : {
            fields : ["uuid", "name"],
        },
        image : {
            fields : ["name", "url", "formats"],
        },
        tags : {
            fields : ["uuid", "name"],
        },
    },
};

module.exports = createCoreController( PRODUCT_MODEL, ({ strapi }) => ({
    async find( ctx ) {
        const filters = {
            $search : ["name", "sku"],
        };

        const products = await findMany( PRODUCT_MODEL, productFields, filters );

        return products;
    },

    async findOne( ctx ) {
        const { id : uuid } = ctx.params;

        const product = await findOne( uuid, PRODUCT_MODEL, productFields );

        return product;
    },

    async create( ctx ) {
        const data = ctx.request.body;

        await validateAddProduct( data );

        const categories = await strapi.service( PRODUCT_MODEL ).validateCategories( data.categories );
        const unity      = await findOne( data.unity, UNITY_MODEL );
        const tags      = await strapi.service( PRODUCT_MODEL ).validateTags( data.tags );

        await strapi.service( PRODUCT_MODEL ).checkForDuplicates( data.sku, data.name );

        const newProduct = await strapi.entityService.create( PRODUCT_MODEL, {
            data     : {
                ...data,
                tags,
                categories,
                unity    : unity.id,
                isActive : true,
            },
            fields   : productFields.fields,
            populate : productFields.populate,
        });

        return newProduct;
    },

    async update( ctx ) {
        const { id : uuid } = ctx.params;
        const data = ctx.request.body;

        await validateAddProduct( data );

        const product = await findOne( uuid, PRODUCT_MODEL, productFields );

        const categories = await strapi.service( PRODUCT_MODEL ).validateCategories( data.categories );
        const unity      = await findOne( data.unity, UNITY_MODEL );
        const tags      = await strapi.service( PRODUCT_MODEL ).validateTags( data.tags );

        await strapi.service( PRODUCT_MODEL ).checkForDuplicates( data.sku, data.name );

        const updatedProduct = await strapi.entityService.update( PRODUCT_MODEL, product.id, {
            data     : {
                ...data,
                tags,
                categories,
                unity    : unity.id,
                isActive : true,
            },
            fields   : productFields.fields,
            populate : productFields.populate,
        });

        return updatedProduct;
    },

    async delete( ctx ) {
        const { id : uuid } = ctx.params;

        // TODO: Verificar si el producto se va a poder eliminar teniendo órdenes de producción, ventas, etc...

        const product = await findOne( uuid, PRODUCT_MODEL, productFields );

        const deletedProduct = await strapi.entityService.delete( PRODUCT_MODEL, product.id, {
            fields   : productFields.fields,
            populate : productFields.populate,
        });

        return deletedProduct;
    },
}));
