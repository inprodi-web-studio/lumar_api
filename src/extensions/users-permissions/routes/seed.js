module.exports = ( plugin ) => {
    plugin.routes["content-api"].routes.push({
        method  : "POST",
        path    : "/seeds",
        handler : "auth.generateSeeds",
        config  : {
            prefix : "",
        },
    });
}