const { USER_MODEL }    = require("../constants");
const generateUsersData = require("./data/users");

const generateUsers = async ( strapi ) => {
    console.log("generating users");

    const usersData = generateUsersData();

    for ( const user of usersData ) {
        await strapi.entityService.create( USER_MODEL, {
            data : {
                ...user,
            },
        });
    }
}

module.exports = generateUsers;