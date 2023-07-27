"use strict";

const { STOCK_MODEL }   = require("../../../constants/models");
const { ConflictError } = require("../../../helpers/errors");

const { createCoreService } = require("@strapi/strapi").factories;

module.exports = createCoreService( STOCK_MODEL, ({ strapi }) => ({
    async checkForDuplicates( name ) {
        const ctx    = strapi.requestContext.get();
        const method = ctx.request.method;

        const conflictingStocks = await strapi.query( STOCK_MODEL ).count({
            where : {
                name,
                ...( method === "PUT" && {
                    uuid : {
                        $not : ctx.params.id,
                    }
                }),
            },
        });

        if ( conflictingStocks > 0 ) {
            throw new ConflictError({
                code : 1062,
                nameCode : "ER_DUP_ENTRY",
                description : {
                    value   : name,
                    message : "There is already a stock with this name",
                },
            }, { key : "stock.duplicatedName", path : ctx.request.path });
        }
    }
}));
