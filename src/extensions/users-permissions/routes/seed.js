module.exports = ( plugin ) => {
    plugin.routes["content-api"].routes.push({
        method  : "POST",
        path    : "/seeds",
        handler : "auth.generateSeeds",
        config  : {
            prefix : "",
        },
    });

    plugin.routes["content-api"].routes.push({
        method  : "GET",
        path    : "/seeds/assign-unity",
        handler : "auth.assignUnity",
        config  : {
            prefix : "",
        },
    });
}