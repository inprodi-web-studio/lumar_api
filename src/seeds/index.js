const {
    USER_MODEL,
} = require("../constants");

const generateUsers = require("./user");

const clearData = async ( strapi ) => {
    const collectionTypeUids = [
        USER_MODEL,
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

    console.log( "generating seed data has been finished successfully!" );

}

module.exports = generateSeedData;