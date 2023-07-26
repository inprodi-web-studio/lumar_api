"use strict";

const {
    USER_MODEL,
    INVITATION_MODEL,
} = require("../../../constants/models");

const { ConflictError } = require("../../../helpers/errors");

const { createCoreService } = require("@strapi/strapi").factories;

module.exports = createCoreService( INVITATION_MODEL, ({ strapi }) => ({
    async checkForDuplicates( email ) {
        const ctx = strapi.requestContext.get();

        const conflictingUsers = await strapi.query( USER_MODEL ).count({
            where : {
                email,
            },
        });

        if ( conflictingUsers > 0 ) {
            throw new ConflictError({
                code : 1062,
                nameCode : "ER_DUP_ENTRY",
                description : {
                    value   : email,
                    message : "Email is already taken by an user",
                },
            }, { key : "invitations.conflictUser", path : ctx.request.path });
        }

        const conflictingInvitations = await strapi.query( INVITATION_MODEL ).count({
            where : {
                email,
            },
        });

        if ( conflictingInvitations > 0 ) {
            throw new ConflictError({
                code : 1062,
                nameCode : "ER_DUP_ENTRY",
                description : {
                    value   : email,
                    message : "Email is already taken by an invitation",
                },
            }, { key : "invitations.conflictInvitation", path : ctx.request.path });
        }
    },
}));
