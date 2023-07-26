module.exports = ( plugin ) => {
    plugin.routes["content-api"].routes.push({
        method  : "POST",
        path    : "/users/:invitation_uuid",
        handler : "user.create",
        config  : {
            prefix : "",
        },
    });

    plugin.routes["content-api"].routes.push({
        method  : "PUT",
        path    : "/users/toggle-status/:user_uuid",
        handler : "user.toggleStatus",
        config  : {
            prefix : "",
        },
    });
}