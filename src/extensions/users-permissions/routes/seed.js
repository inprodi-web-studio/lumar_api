module.exports = ( plugin ) => {
    plugin.routes["content-api"].routes.push({
        method  : "GET",
        path    : "/seeds",
        handler : "auth.generateSeeds",
        config  : {
            prefix : "",
        },
    });
}