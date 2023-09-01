"use strict";

const { ADJUSTMENT_MOTIVE_MODEL } = require("../../../constants/models");
const findMany = require("../../../helpers/findMany");
const findOne = require("../../../helpers/findOne");
const { validateAddMotive } = require("../validation");

const { createCoreController } = require("@strapi/strapi").factories;

const motiveFields = {
    fields : ["uuid", "name"],
};

module.exports = createCoreController( ADJUSTMENT_MOTIVE_MODEL, ({ strapi }) => ({
    async find( ctx ) {
        const filters = {
            $search : ["name"],
        };

        const motives = await findMany( ADJUSTMENT_MOTIVE_MODEL, motiveFields, filters );

        return motives;
    },

    async findOne( ctx ) {
        const { id : uuid } = ctx.params;

        const motive = await findOne( uuid, ADJUSTMENT_MOTIVE_MODEL, motiveFields );

        return motive;
    },

    async create( ctx ) {
        const data = ctx.request.body;

        await validateAddMotive( data );

        await strapi.service( ADJUSTMENT_MOTIVE_MODEL ).checkForDuplicates( data.name );

        const newMotive = await strapi.entityService.create( ADJUSTMENT_MOTIVE_MODEL, {
            data     : data,
            fields   : motiveFields.fields,
            populate : motiveFields.populate,
        });

        return newMotive;
    },

    async update( ctx ) {
        const { id : uuid } = ctx.params;
        const data = ctx.request.body;

        await validateAddMotive( data );

        const motive = await findOne( uuid, ADJUSTMENT_MOTIVE_MODEL, motiveFields );

        await strapi.service( ADJUSTMENT_MOTIVE_MODEL ).checkForDuplicates( data.name );

        const updatedMotive = await strapi.entityService.update( ADJUSTMENT_MOTIVE_MODEL, motive.id, {
            data     : data,
            fields   : motiveFields.fields,
            populate : motiveFields.populate,
        });

        return updatedMotive;
    },

    async delete( ctx ) {
        const { id : uuid } = ctx.params;

        const motive = await findOne( uuid, ADJUSTMENT_MOTIVE_MODEL, motiveFields );

        const deletedMotive = await strapi.entityService.delete( ADJUSTMENT_MOTIVE_MODEL, motive.id, {
            fields   : motiveFields.fields,
            populate : motiveFields.populate,
        });

        return deletedMotive;
    },
}));
