const {
    USER_MODEL,
    STOCK_MODEL,
    CATEGORY_MODEL,
    WAREHOUSE_MODEL,
    INVITATION_MODEL,
    UNITY_MODEL,
    TAG_MODEL,
    PRODUCT_MODEL,
} = require("../constants/models");

const generateUsers       = require("./user");
const generateStocks      = require("./stock");
const generateWarehouses  = require("./warehouse");
const generateInvitations = require("./invitation");
const generateCategories  = require("./category");
const generateUnities     = require("./unity");
const generatetags = require("./tag");
const generateProducts = require("./product");

const clearData = async ( strapi ) => {
    const collectionTypeUids = [
        TAG_MODEL,
        USER_MODEL,
        STOCK_MODEL,
        UNITY_MODEL,
        PRODUCT_MODEL,
        CATEGORY_MODEL,
        WAREHOUSE_MODEL,
        INVITATION_MODEL,
    ];

    for ( const collectionTypeUid of collectionTypeUids ) {
       await strapi.query( collectionTypeUid ).deleteMany({
            where  : {
                id : {
                    $notNull : true,
                },
            },
        });
    }
};

const generateSeedData = async ( strapi ) => {

    console.log("forcing seed data re-creation...");
    await clearData( strapi );
    console.log("existing data has been cleaned!");

    console.log( "generating seed data..." );

    await generateUsers( strapi );
    await generateInvitations( strapi );
    await generateWarehouses( strapi );
    await generateStocks( strapi );
    await generateCategories( strapi );
    await generateUnities( strapi );
    await generatetags( strapi );
    await generateProducts( strapi );

    console.log( "generating seed data has been finished successfully!" );

}

module.exports = generateSeedData;