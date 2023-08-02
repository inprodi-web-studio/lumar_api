const { UNITY_MODEL }     = require("../constants/models");
const generateUnitiesData = require("./data/unities");

const generateUnities = async ( strapi ) => {
    console.log("generating unities");

    const unitiesData = generateUnitiesData();

    for ( const unity of unitiesData ) {
        await strapi.entityService.create( UNITY_MODEL, {
            data : {
                ...unity,
            },
        });
    }
}

module.exports = generateUnities;