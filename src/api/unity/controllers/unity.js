"use strict";

const { UNITY_MODEL } = require("../../../constants/models");

const { validateAddUnity } = require("../validation");

const findMany = require("../../../helpers/findMany");
const findOne  = require("../../../helpers/findOne");
const { BadRequestError } = require("../../../helpers/errors");

const { createCoreController } = require("@strapi/strapi").factories;

const unityFields = {
    fields : ["uuid", "name"],
    populate : {
        products : {
            count : true,
        },
    },
};

module.exports = createCoreController( UNITY_MODEL, ({ strapi }) => ({
    async find( ctx ) {
        const filters = {
            $search : ["name"],
        };

        const unities = await findMany( UNITY_MODEL, unityFields, filters );

        return unities;
    },

    async findOne( ctx ) {
        const { id : uuid } = ctx.params;

        const unity = await findOne( uuid, UNITY_MODEL, unityFields );

        return unity;
    },

    async create( ctx ) {
        const data = ctx.request.body;
        
        await validateAddUnity( data );

        await strapi.service( UNITY_MODEL ).checkForDuplicates( data.name );

        const newUnity = await strapi.entityService.create( UNITY_MODEL, {
            data     : data,
            fields   : unityFields.fields,
            populate : unityFields.populate,
        });

        return newUnity;
    },

    async update( ctx ) {
        const { id : uuid } = ctx.params;
        const data = ctx.request.body;

        await validateAddUnity( data );

        const unity = await findOne( uuid, UNITY_MODEL, unityFields );

        await strapi.service( UNITY_MODEL ).checkForDuplicates( data.name );

        const updatedUnity = await strapi.entityService.update( UNITY_MODEL, unity.id, {
            data     : data,
            fields   : unityFields.fields,
            populate : unityFields.populate,
        });

        return updatedUnity;
    },

    async delete( ctx ) {
        const { id : uuid } = ctx.params;

        const unity = await findOne( uuid, UNITY_MODEL, unityFields );

        if ( unity.products.count > 0 ) {
            throw new BadRequestError( "You can't delete a unity with products", {
                key  : "unity.withProducts",
                path : ctx.request.path,
            });
        }

        const deletedUnity = await strapi.entityService.delete( UNITY_MODEL, unity.id, {
            fields   : unityFields.fields,
            populate : unityFields.populate,
        });

        return deletedUnity;
    },
}));
