module.exports = ( plugin ) => {
    plugin.routes["content-api"].routes.push({
        method  : "POST",
        path    : "/auth/login",
        handler : "auth.login",
        config  : {
            prefix : "",
        },
    });

    plugin.routes["content-api"].routes.push({
        method  : "POST",
        path    : "/auth/forgot-password",
        handler : "auth.forgotPassword",
        config  : {
            prefix : "",
        },
    });

    plugin.routes["content-api"].routes.push({
        method  : "POST",
        path    : "/auth/validate-code/:uuid",
        handler : "auth.validateCode",
        config  : {
            prefix : "",
        },
    });

    plugin.routes["content-api"].routes.push({
        method  : "POST",
        path    : "/auth/validate-code/resend/:uuid",
        handler : "auth.resendCode",
        config  : {
            prefix : "",
        },
    });

    plugin.routes["content-api"].routes.push({
        method  : "POST",
        path    : "/auth/reset-password",
        handler : "auth.resetPassword",
        config  : {
            prefix : "",
        },
    });
}