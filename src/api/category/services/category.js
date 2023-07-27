"use strict";

const { CATEGORY_MODEL } = require("../../../constants/models");
const { ConflictError }  = require("../../../helpers/errors");

const { createCoreService } = require("@strapi/strapi").factories;

module.exports = createCoreService( CATEGORY_MODEL, ({ strapi }) => ({
    async checkForDuplicates( name ) {
        const ctx    = strapi.requestContext.get();
        const method = ctx.request.method;

        const conflictingCategories = await strapi.query( CATEGORY_MODEL ).count({
            where : {
                name,
                ...( method === "PUT" && {
                    uuid : {
                        $not : ctx.params.id,
                    }
                }),
            },
        });

        if ( conflictingCategories > 0 ) {
            throw new ConflictError({
                code : 1062,
                nameCode : "ER_DUP_ENTRY",
                description : {
                    value   : name,
                    message : "There is already a category with this name",
                },
            }, { key : "category.duplicatedName", path : ctx.request.path });
        }
    },
}));
