const { INVITATION_MODEL, USER_MODEL }    = require("../constants/models");
const generateInvitationsData = require("./data/invitations");

const generateUsers = async ( strapi ) => {
    console.log("generating invitations");

    const invitationsData = generateInvitationsData();

    for ( const invitation of invitationsData ) {
        const invitedBy = await strapi.query( USER_MODEL ).findOne({
            where : {
                email : "development@inprodi.com.mx",
            },
        });

        await strapi.entityService.create( INVITATION_MODEL, {
            data : {
                ...invitation,
                invitedBy : invitedBy.id,
            },
        });
    }
}

module.exports = generateUsers;