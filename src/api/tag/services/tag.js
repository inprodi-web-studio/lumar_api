"use strict";

const { TAG_MODEL } = require("../../../constants/models");
const { ConflictError } = require("../../../helpers/errors");

const { createCoreService } = require("@strapi/strapi").factories;

module.exports = createCoreService( TAG_MODEL, ({ strapi }) => ({
    async checkForDuplicates( name ) {
        const ctx    = strapi.requestContext.get();
        const method = ctx.request.method;

        const conflictingUnities = await strapi.query( TAG_MODEL ).count({
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
                    message : "There is already a tag with this name",
                },
            }, { key : "tag.duplicatedName", path : ctx.request.path });
        }
    },
}));
