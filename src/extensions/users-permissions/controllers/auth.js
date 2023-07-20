const { getService } = require("@strapi/plugin-users-permissions/server/utils");
const jwt            = require("jsonwebtoken");

const {
    validateLogin,
    validateValidateCode,
    validateResetPassword,
    validateForgotPassword,
}   = require("../validation");

const {
    NotFoundError,
    BadRequestError,
    UnauthorizedError,
} = require("../../../helpers/errors");

const { USER_MODEL }         = require("../../../constants");
const generateRandomCode     = require("../../../helpers/generateRandomCode");
const forgotPasswordTemplate = require("../../../templates/forgotPassword");

module.exports = ( plugin ) => {
    plugin.controllers.auth["login"] = async ( ctx ) => {
        const data = ctx.request.body;

        await validateLogin( data );

        const user = await strapi.query( USER_MODEL ).findOne({
            where : {
                email : data.email.toLowerCase(),
            },
            populate : {
                enterprise : true,
                role       : true,
            },
        });

        if ( !user ) {
            throw new BadRequestError( "Email / Password dont match", {
                key  : "auth.wrongCredentials",
                path : ctx.request.path, 
            });
        }

        const isValidPassword = await getService("user").validatePassword(
            data.password,
            user.password,
        );

        if ( !isValidPassword ) {
            throw new BadRequestError( "Email / Password dont match", {
                key  : "auth.wrongCredentials",
                path : ctx.request.path, 
            });
        }

        if ( !user.isActive ) {
            throw new BadRequestError( "The user is inactive", {
                key  : "auth.inactiveUser",
                path : ctx.request.path, 
            });
        }

        await strapi.entityService.update( USER_MODEL, user.id, {
            data : {
                lastLogin : new Date(),
            },
        });

        return {
            token    : getService("jwt").issue({ id : user.id }),
            id       : user.id,
            uuid     : user.uuid, 
            name     : user.name,
            lastName : user.lastName,
            email    : user.email,
            role     : user.role.name,
        };
    };

    plugin.controllers.auth["forgotPassword"] = async ( ctx ) => {
        const data = ctx.request.body;

        await validateForgotPassword( data );

        const user = await strapi.query( USER_MODEL ).findOne({
            where : {
                email : data.email.toLowerCase(),
            },
        });

        if ( !user ) {
            throw new NotFoundError( "Email do not match", { key : "users.not-found", path : ctx.request.url });
        }

        const code = generateRandomCode(4);

        const updatedUser = await strapi.entityService.update( USER_MODEL, user.id, {
            data : {
                resetPasswordToken : code,
            },
        });

        const emailConfig = {
            subject : "Restablecer Contraseña",
            text    : "",
            html    : forgotPasswordTemplate,
        };

        await strapi.plugins["email"].services.email.sendTemplatedEmail(
            {
                to   : data.email,
            },
            emailConfig,
            {
                code,
            },
        );

        return {
            uuid  : updatedUser.uuid,
            email : updatedUser.email,
        };
    };

    plugin.controllers.auth["validateCode"] = async ( ctx ) => {
        const data     = ctx.request.body;
        const { uuid } = ctx.params;

        await validateValidateCode( data );

        const user = await strapi.db.query( USER_MODEL ).findOne({
            where : { uuid },
        });

        if ( !user ) {
            throw new NotFoundError( "User with uuid not found", { key : "users.not-found", path : ctx.request.url });
        }

        const currentCode = user.resetPasswordToken;

        if ( currentCode !== data.code ) {
            throw new BadRequestError("Wrong code", { key : "auth.wrongCode", path : ctx.request.url });
        }

        return {
            token : getService("jwt").issue({ id : user.id }),
        };
    };

    plugin.controllers.auth["resendCode"] = async ( ctx ) => {
        const { uuid } = ctx.request.params;

        const user = await strapi.db.query( USER_MODEL ).findOne({
            where : { uuid },
        });

        if ( !user ) {
            throw new NotFoundError( "User with uuid not found", { key : "users.not-found", path : ctx.request.url });
        }

        const emailConfig = {
            subject : "Restablecer Contraseña",
            text    : "",
            html    : forgotPasswordTemplate,
        };

        await strapi.plugins["email"].services.email.sendTemplatedEmail(
            {
                to   : user.email,
            },
            emailConfig,
            {
                code : user.resetPasswordToken,
            },
        );

        return "Email Sent";
    };

    plugin.controllers.auth["resetPassword"] = async ( ctx ) => {
        const data = ctx.request.body;

        await validateResetPassword( data );

        const secret = strapi.config.get("plugin.users-permissions.jwtSecret");
        const token  = jwt.verify( data.token, secret, ( error, decoded ) => {
            if ( error ) {
                throw new UnauthorizedError( "Invalid token provided", { key : "auth.invalidToken" , path : ctx.request.url });
            } else {
                return {
                    id : decoded.id,
                };
            }
        });

        if ( data.password !== data.passwordConfirm ) {
            throw new BadRequestError( "Passwords dont match", { key : "auth.unmatchingPasswords" , path : ctx.request.url } );
        }

        const updatedUser = await strapi.entityService.update( USER_MODEL, token.id, {
            data : {
                password           : data.password,
                resetPasswordToken : null,
            },
        });

        return {
            uuid  : updatedUser.uuid,
            email : updatedUser.email,
        };
    };
};