"use strict";

const { ADJUSTMENT_MOTIVE_MODEL } = require("../../../constants/models");
const { ConflictError } = require("../../../helpers/errors");

const { createCoreService } = require("@strapi/strapi").factories;

module.exports = createCoreService( ADJUSTMENT_MOTIVE_MODEL, ({ strapi }) => ({
    async checkForDuplicates( name ) {
        const ctx    = strapi.requestContext.get();
        const method = ctx.request.method;

        const conflictingUnities = await strapi.query( ADJUSTMENT_MOTIVE_MODEL ).count({
            where : {
                name,
                ...( method === "PUT" && {
                    uuid : {
                        $not : ctx.params.id,
                    }
                }),
            },
        });

        if ( conflictingUnities > 0 ) {
            throw new ConflictError({
                code : 1062,
                nameCode : "ER_DUP_ENTRY",
                description : {
                    value   : name,
                    message : "There is already a motive with this name",
                },
            }, { key : "adjustmen-motive.duplicatedName", path : ctx.request.path });
        }
    },
}));
