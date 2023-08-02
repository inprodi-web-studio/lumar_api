"use strict";

const { TAG_MODEL } = require("../../../constants/models");
const { BadRequestError } = require("../../../helpers/errors");
const findMany = require("../../../helpers/findMany");
const findOne = require("../../../helpers/findOne");
const { validateAddTag } = require("../validation");

const { createCoreController } = require("@strapi/strapi").factories;

const tagFields = {
    fields : ["uuid", "name"],
    populate : {
        products : {
            count : true,
        },
    },
};

module.exports = createCoreController( TAG_MODEL, ({ strapi }) => ({
    async find( ctx ) {
        const filters = {
            $search : ["name"],
        };

        const tags = await findMany( TAG_MODEL, tagFields, filters );

        return tags;
    },

    async findOne( ctx ) {
        const { id : uuid } = ctx.params;

        const tag = await findOne( uuid, TAG_MODEL, tagFields );

        return tag;
    },

    async create( ctx ) {
        const data = ctx.request.body;
        
        await validateAddTag( data );

        await strapi.service( TAG_MODEL ).checkForDuplicates( data.name );

        const newTag = await strapi.entityService.create( TAG_MODEL, {
            data     : data,
            fields   : tagFields.fields,
            populate : tagFields.populate,
        });

        return newTag;
    },

    async update( ctx ) {
        const { id : uuid } = ctx.params;
        const data = ctx.request.body;

        await validateAddTag( data );

        const tag = await findOne( uuid, TAG_MODEL, tagFields );

        await strapi.service( TAG_MODEL ).checkForDuplicates( data.name );

        const updatedTag = await strapi.entityService.update( TAG_MODEL, tag.id, {
            data     : data,
            fields   : tagFields.fields,
            populate : tagFields.populate,
        });

        return updatedTag;
    },

    async delete( ctx ) {
        const { id : uuid } = ctx.params;

        const tag = await findOne( uuid, TAG_MODEL, tagFields );

        const deletedTag = await strapi.entityService.delete( TAG_MODEL, tag.id, {
            fields   : tagFields.fields,
            populate : tagFields.populate,
        });

        return deletedTag;
    },
}));
