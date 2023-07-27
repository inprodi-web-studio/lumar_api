"use strict";

const {
    CATEGORY_MODEL,
} = require("../../../constants/models");

const { validateAddCategory } = require("../validation");

const findMany = require("../../../helpers/findMany");
const findOne  = require("../../../helpers/findOne");
const { BadRequestError } = require("../../../helpers/errors");

const { createCoreController } = require("@strapi/strapi").factories;

const categoryFields = {
    fields : ["uuid", "name", "color"],
    populate : {
        products : {
            count : true,
        },
    },
};

module.exports = createCoreController( CATEGORY_MODEL, ({ strapi }) => ({
    async find( ctx ) {
        const filters = {
            $search : ["name"],
        };

        const categories = await findMany( CATEGORY_MODEL, categoryFields, filters );

        return categories;
    },

    async findOne( ctx ) {
        const { id : uuid } = ctx.params;

        const category = await findOne( uuid, CATEGORY_MODEL, categoryFields );

        return category;
    },

    async create( ctx ) {
        const data = ctx.request.body;
        
        await validateAddCategory( data );

        await strapi.service( CATEGORY_MODEL ).checkForDuplicates( data.name );

        const newCategory = await strapi.entityService.create( CATEGORY_MODEL, {
            data     : data,
            fields   : categoryFields.fields,
            populate : categoryFields.populate,
        });

        return newCategory;
    },

    async update( ctx ) {
        const { id : uuid } = ctx.params;
        const data = ctx.request.body;

        await validateAddCategory( data );

        const category = await findOne( uuid, CATEGORY_MODEL, categoryFields );

        await strapi.service( CATEGORY_MODEL ).checkForDuplicates( data.name );

        const updatedCategory = await strapi.entityService.update( CATEGORY_MODEL, category.id, {
            data     : data,
            fields   : categoryFields.fields,
            populate : categoryFields.populate,
        });

        return updatedCategory;
    },

    async delete( ctx ) {
        const { id : uuid } = ctx.params;

        const category = await findOne( uuid, CATEGORY_MODEL, categoryFields );

        if ( category.products.count > 0 ) {
            throw new BadRequestError( "You can't delete a category with products", {
                key  : "category.withProducts",
                path : ctx.request.path,
            });
        }

        const deletedCategory = await strapi.entityService.delete( CATEGORY_MODEL, category.id, {
            fields   : categoryFields.fields,
            populate : categoryFields.populate,
        });

        return deletedCategory;
    },
}));
