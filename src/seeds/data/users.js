const { faker } = require("@faker-js/faker");

const generateUsersData = () => {
    let users = [
        {
            username : "development@inprodi.com.mx",
            email    : "development@inprodi.com.mx",
            password : "test123",
            confirmed: true,
            blocked  : false,
            role     : 1,
            name     : "Andrés",
            lastName : "Murillo",
            isActive : true,
        },
        {
            username  : faker.internet.email().toLowerCase(),
            email     : faker.internet.email().toLowerCase(),
            password  : "test123",
            confirmed : faker.datatype.boolean(0.75),
            blocked   : false,
            role      : 1,
            name      : faker.person.firstName(),
            lastName  : faker.person.lastName(),
            isActive  : faker.datatype.boolean(0.8),
        },
    ];

    return users;
}

module.exports = generateUsersData;