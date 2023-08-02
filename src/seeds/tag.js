const { TAG_MODEL }    = require("../constants/models");
const generateTagsData = require("./data/tags");

const generatetags = async ( strapi ) => {
    console.log("generating tags");

    const tagsData = generateTagsData();

    for ( const tag of tagsData ) {
        await strapi.entityService.create( TAG_MODEL, {
            data : {
                ...tag,
            },
        });
    }
}

module.exports = generatetags;