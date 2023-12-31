const {
    TAG_MODEL,
    USER_MODEL,
    UNITY_MODEL,
    STOCK_MODEL,
    PRODUCT_MODEL,
    CATEGORY_MODEL,
    WAREHOUSE_MODEL,
    INVITATION_MODEL,
    AVAILABILITY_MODEL,
    BATCH_MODEL,
    ADJUSTMENT_MOTIVE_MODEL,
} = require("../constants/models");

const generateUsers          = require("./user");
const generateStocks         = require("./stock");
const generateWarehouses     = require("./warehouse");
const generateInvitations    = require("./invitation");
const generateCategories     = require("./category");
const generateUnities        = require("./unity");
const generatetags           = require("./tag");
const generateProducts       = require("./product");
const generateBatches        = require("./batch");
const generateMotives        = require("./motive");
const generateAvailabilities = require("./availability");

const clearData = async ( strapi ) => {
    const collectionTypeUids = [
        TAG_MODEL,
        USER_MODEL,
        UNITY_MODEL,
        BATCH_MODEL,
        STOCK_MODEL,
        PRODUCT_MODEL,
        CATEGORY_MODEL,
        WAREHOUSE_MODEL,
        INVITATION_MODEL,
        AVAILABILITY_MODEL,
        ADJUSTMENT_MOTIVE_MODEL,
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
    await generateMotives( strapi );
    await generatetags( strapi );
    await generateProducts( strapi );
    await generateBatches( strapi );
    await generateAvailabilities( strapi );

    console.log( "generating seed data has been finished successfully!" );

}

module.exports = generateSeedData;