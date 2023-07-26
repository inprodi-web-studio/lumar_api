const {
    USER_MODEL,
    INVITATION_MODEL,
} = require("../constants/models");

const generateUsers = require("./user");
const generateInvitations = require("./invitation");

const clearData = async ( strapi ) => {
    const collectionTypeUids = [
        USER_MODEL,
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

    console.log( "generating seed data has been finished successfully!" );

}

module.exports = generateSeedData;