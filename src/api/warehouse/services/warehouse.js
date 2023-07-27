"use strict";

const {
    WAREHOUSE_MODEL,
} = require("../../../constants/models");
const { ConflictError } = require("../../../helpers/errors");

const { createCoreService } = require("@strapi/strapi").factories;

module.exports = createCoreService( WAREHOUSE_MODEL, ({ strapi }) => ({
    async checkForDuplicates( name ) {
        const ctx    = strapi.requestContext.get();
        const method = ctx.request.method;

        const conflictingWarehouses = await strapi.query( WAREHOUSE_MODEL ).count({
            where : {
                name,
                ...( method === "PUT" && {
                    uuid : {
                        $not : ctx.params.id,
                    }
                }),
            },
        });

        if ( conflictingWarehouses > 0 ) {
            throw new ConflictError({
                code : 1062,
                nameCode : "ER_DUP_ENTRY",
                description : {
                    value   : name,
                    message : "There is already a warehouse with this name",
                },
            }, { key : "warehouse.duplicatedName", path : ctx.request.path });
        }
    },
}));
