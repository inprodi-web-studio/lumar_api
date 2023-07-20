const generateSeedData = require("./../../../seeds");

module.exports = ( plugin ) => {
    plugin.controllers.auth["generateSeeds"] = async ( ctx ) => {
        await generateSeedData( strapi );

        return "SEEDS GENERATED SUCCESSFULLY";
    };
}