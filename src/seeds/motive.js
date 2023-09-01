const { UNITY_MODEL, ADJUSTMENT_MOTIVE_MODEL }     = require("../constants/models");
const generateMotivesData = require("./data/motives");

const generateMotives = async ( strapi ) => {
    console.log("generating motives");

    const motivesData = generateMotivesData();

    for ( const motive of motivesData ) {
        await strapi.entityService.create( ADJUSTMENT_MOTIVE_MODEL, {
            data : {
                ...motive,
            },
        });
    }
}

module.exports = generateMotives;