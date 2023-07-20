const authRoutes      = require("./routes/auth");
const seedRoutes      = require("./routes/seed");
const authControllers = require("./controllers/auth");
const seedControllers = require("./controllers/seed");
const userControllers = require("./controllers/user");

module.exports = ( plugin ) => {
    seedRoutes( plugin );
    authRoutes( plugin );

    seedControllers( plugin );
    authControllers( plugin );
    userControllers( plugin );

    return plugin;
};