"use strict";

const ROLES                     = require("../../../constants/roles");
const findOne                   = require("../../../helpers/findOne");
const findMany                  = require("../../../helpers/findMany");
const invitationTemplate        = require("../../../templates/invitation");
const { INVITATION_MODEL }      = require("../../../constants/models");
const { validateAddInvitation } = require("../validation");

const { createCoreController } = require("@strapi/strapi").factories;

const invitationFields = {
    fields : ["uuid", "name", "lastName", "email"],
    populate : {
        role : {
            fields : ["name"],
        },
        invitedBy : {
            fields : ["uuid", "name", "lastName", "email"],
        },
    },
};

module.exports = createCoreController( INVITATION_MODEL, ({ strapi }) => ({
    async find( ctx ) {
        const filters = {
            $search : [
                "name",
                "lastName",
                "email",
            ],
        };

        const invitations = await findMany( INVITATION_MODEL, invitationFields, filters );

        return invitations;
    },

    async findOne( ctx ) {
        const { id : uuid } = ctx.params;

        const user = findOne( uuid, INVITATION_MODEL, invitationFields );

        return user;
    },

    async create( ctx ) {
        const data           = ctx.request.body;
        const requestingUser = ctx.state.user;

        await validateAddInvitation( data );

        await strapi.service( INVITATION_MODEL ).checkForDuplicates( data.email );

        const newInvitation = await strapi.entityService.create( INVITATION_MODEL, {
            data     : {
                ...data,
                role      : ROLES[ data.role ],
                invitedBy : requestingUser.id,
            },
            fields   : invitationFields.fields,
            populate : invitationFields.populate,
        });

        const emailConfig = {
            subject : "Aceptar Invitación",
            text    : "",
            html    : invitationTemplate,
        };

        await strapi.plugins["email"].services.email.sendTemplatedEmail(
            {
                to   : data.email,
            },
            emailConfig,
            {
                invitedBy      : `${ requestingUser.name } ${ requestingUser.lastName }`,
                invitationUuid : newInvitation.uuid,
            },
        );

        return newInvitation;
    },

    async resend( ctx ) {
        const { uuid } = ctx.params;

        const invitation = await findOne( uuid, INVITATION_MODEL, invitationFields );

        const emailConfig = {
            subject : "Aceptar Invitación",
            text    : "",
            html    : invitationTemplate,
        };

        await strapi.plugins["email"].services.email.sendTemplatedEmail(
            {
                to   : invitation.email,
            },
            emailConfig,
            {
                invitedBy      : `${ invitation.invitedBy.name } ${ invitation.invitedBy.lastName }`,
                invitationUuid : invitation.uuid,
            },
        );

        return invitation;
    },

    async delete( ctx ) {
        const { id : uuid } = ctx.params;

        const invitation = await findOne( uuid, INVITATION_MODEL, invitationFields );

        const deletedInvitation = await strapi.entityService.delete( INVITATION_MODEL, invitation.id, {
            fields   : invitationFields.fields,
            populate : invitationFields.populate,
        });

        return deletedInvitation;
    },
}));
