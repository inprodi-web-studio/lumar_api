const { USER_MODEL } = require("../../../constants");
const findMany       = require("../../../helpers/findMany");
const findOne = require("../../../helpers/findOne");

const userFields = {
    fields   : [ "uuid", "name", "lastName", "email", "lastLogin" ],
    populate : {
        role : {
            fields : [ "name" ],
        },
    },
};

module.exports = ( plugin ) => {
    plugin.controllers.user["find"] = async ( ctx ) => {
        const filters = {
            $search : [
                "name",
                "lastName",
                "email",
            ],
        };

        const users = await findMany( USER_MODEL, userFields, filters );

        return users;
    };

    plugin.controllers.user["findOne"] = async ( ctx ) => {
        const { id : uuid } = ctx.params;

        const user = await findOne( uuid, USER_MODEL, userFields );

        return user;
    };
};