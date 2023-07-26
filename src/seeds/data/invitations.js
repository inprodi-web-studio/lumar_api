const { faker } = require("@faker-js/faker");

const generateInvitationsData = () => {
    let users = [
        {
            name     : faker.person.firstName(),
            lastName : faker.person.lastName(),
            email    : faker.internet.email().toLowerCase(),
            role     : 1,
        },
    ];

    return users;
}

module.exports = generateInvitationsData;