const {
    USER_MODEL,
    INVITATION_MODEL,
} = require("../../../constants/models");

const {
    validateAddUser, validateUpdateUser,
} = require("../validation");

const {
    ForbiddenError,
    BadRequestError,
} = require("../../../helpers/errors");

const ROLES    = require("../../../constants/roles");
const findOne  = require("../../../helpers/findOne");
const findMany = require("../../../helpers/findMany");

const userFields = {
    fields   : ["uuid", "name", "lastName", "email", "lastLogin", "isActive"],
    populate : {
        role : {
            fields : ["name"],
        },
    },
};

module.exports = ( plugin ) => {
    plugin.controllers.user["find"] = async ( ctx ) => {
        const filters = {
            $search : [
                "name",
                "lastName",
                "email",
            ],
        };

        const users = await findMany( USER_MODEL, userFields, filters );

        for ( const user of users.data ) {
            user.role = user.role.name;
        }

        return users;
    };

    plugin.controllers.user["findOne"] = async ( ctx ) => {
        const { id : uuid } = ctx.params;

        const user = await findOne( uuid, USER_MODEL, userFields );

        user.role = user.role.name;

        return user;
    };

    plugin.controllers.user["create"] = async ( ctx ) => {
        const { invitation_uuid } = ctx.params;
        const data = ctx.request.body;

        await validateAddUser( data );

        if ( data.password !== data.passwordConfirm ) {
            throw new BadRequestError( "Passwords don't match", {
                key  : "auth.differentPasswords",
                path : ctx.request.path,
            });
        }

        const invitation = await findOne( invitation_uuid, INVITATION_MODEL, {
            populate : {
                role       : true,
                invitedBy  : true,
            },
        });

        const newUser = await strapi.entityService.create( USER_MODEL, {
            data : {
                username   : invitation.email,
                email      : invitation.email,
                password   : data.password,
                confirmed  : true,
                blocked    : false,
                role       : invitation.role.id,
                name       : data.name,
                lastName   : data.lastName,
                isActive   : true,
            },
            fields   : userFields.fields,
            populate : userFields.populate,
        });

        await strapi.entityService.delete( INVITATION_MODEL, invitation.id );

        newUser.role = newUser.role.name;

        return newUser;
    };

    plugin.controllers.user["update"] = async ( ctx ) => {
        const { id : user_uuid }  = ctx.params;
        const data           = ctx.request.body;
        const requestingUser = ctx.state.user;

        await validateUpdateUser( data );

        const user = await findOne( user_uuid, USER_MODEL, {
            populate : {
                role : true,
            },
        });

        if ( user.role.name === "owner" && requestingUser.role.name !== "owner" ) {
            throw new ForbiddenError( "Only a owner can be updated by another owner", {
                key  : "user.forbiddenUpdate",
                path : ctx.request.path,
            });
        }

        if ( user.id === requestingUser.id && user.role.name === "owner" && data.role !== "owner" ) {
            throw new ForbiddenError( "A user can't dowgnrade himself", {
                key  : "user.ownDowngrade",
                path : ctx.request.path,
            });
        }

        if ( user.id === requestingUser.id && user.role.name === "admin" && data.role === "collaborator" ) {
            throw new ForbiddenError( "A user can't dowgnrade himself", {
                key  : "user.ownDowngrade",
                path : ctx.request.path,
            });
        }

        if ( user.id === requestingUser.id && user.role.name === "admin" && data.role === "owner" ) {
            throw new ForbiddenError( "An admin can't upgrade himself", {
                key  : "user.ownUpgrade",
                path : ctx.request.path,
            });
        }

        const updatedUser = await strapi.entityService.update( USER_MODEL, user.id, {
            data     : {
                ...data,
                role : ROLES[ data.role ]
            },
            fields   : userFields.fields,
            populate : userFields.populate,
        });

        updatedUser.role = updatedUser.role.name;

        return updatedUser;
    };

    plugin.controllers.user["destroy"] = async ( ctx ) => {
        const { id : user_uuid } = ctx.params;
        const requestingUser = ctx.state.user;

        const user = await findOne( user_uuid, USER_MODEL, {
            populate : {
                role : true,
            },
        });

        if ( user.role.name === "owner" && requestingUser.role.name !== "owner" ) {
            throw new ForbiddenError( "Only a owner can be deleted by another owner", {
                key  : "user.forbiddenDelete",
                path : ctx.request.path,
            });
        }

        if ( user.id === requestingUser.id ) {
            throw new ForbiddenError( "A user can't delete himself", {
                key  : "user.ownDelete",
                path : ctx.request.path,
            });
        }

        const ownersCount = await findMany( USER_MODEL );

        if ( ownersCount.data.length <= 1 ) {
            throw new BadRequestError( "There must be at least one owner", {
                key  : "enterprise.minOwners",
                path : ctx.request.path,
            });
        }

        const deletedUser = await strapi.entityService.delete( USER_MODEL, user.id, {
            fields   : userFields.fields,
            populate : userFields.populate,
        });

        deletedUser.role = deletedUser.role.name;

        return deletedUser;
    };

    plugin.controllers.user["toggleStatus"] = async ( ctx ) => {
        const { user_uuid } = ctx.params;
        const requestingUser = ctx.state.user;

        const user = await findOne( user_uuid, USER_MODEL, {
            populate : {
                role : true,
            },
        });

        if ( user.role.name === "owner" && requestingUser.role.name !== "owner" ) {
            throw new ForbiddenError( "Only a owner can be toggled by another owner", {
                key  : "user.forbiddenToggle",
                path : ctx.request.path,
            });
        }

        if ( user.id === requestingUser.id ) {
            throw new ForbiddenError( "A user can't toggle himself", {
                key  : "user.ownToggle",
                path : ctx.request.path,
            });
        }

        if ( user.isActive === true ) {
            const ownersCount = await findMany( USER_MODEL );

            if ( ownersCount.data.length <= 1 ) {
                throw new BadRequestError( "There must be at least one owner in an enterprise", {
                    key  : "enterprise.minOwners",
                    path : ctx.request.path,
                });
            }
        }

        const updatedUser = await strapi.entityService.update( USER_MODEL, user.id, {
            data : {
                isActive : !user.isActive,
            },
            fields   : userFields.fields,
            populate : userFields.populate,
        });

        updatedUser.role = updatedUser.role.name;

        return updatedUser;
    };
};