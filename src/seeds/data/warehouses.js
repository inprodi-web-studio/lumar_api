const { faker } = require("@faker-js/faker");

const generateWarehouseData = () => {
    let warehouses = [
        {
            name    : "Providencia",
            address : {
                street : faker.location.street(),
                extNo  : faker.location.buildingNumber(),
                intNo  : faker.location.secondaryAddress(),
                suburb : faker.location.street(),
                cp     : faker.location.zipCode(),
                state  : faker.location.state(),
                city   : faker.location.city(),
            },
        },
        {
            name    : "Colomos",
            address : {
                street : faker.location.street(),
                extNo  : faker.location.buildingNumber(),
                intNo  : faker.location.secondaryAddress(),
                suburb : faker.location.street(),
                cp     : faker.location.zipCode(),
                state  : faker.location.state(),
                city   : faker.location.city(),
            },
        },
    ];

    return warehouses;
}

module.exports = generateWarehouseData;