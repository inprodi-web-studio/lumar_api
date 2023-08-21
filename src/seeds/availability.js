const {
    STOCK_MODEL,
    PRODUCT_MODEL,
    AVAILABILITY_MODEL,
} = require("../constants/models");

const { faker } = require("@faker-js/faker");

const generateAvailabilities = async ( strapi ) => {
    console.log("generating availabilities");

    const products = await strapi.query( PRODUCT_MODEL ).findMany({
        populate : {
            batches : true,
        },
    });
    const stocks = await strapi.query( STOCK_MODEL ).findMany();

    for ( const product of products ) {
        await strapi.entityService.create( AVAILABILITY_MODEL, {
            data : {
                product  : product.id,
                batch    : product.batches[0]?.id, 
                stock    : faker.helpers.arrayElement( stocks ).id,
                quantity : faker.number.int({ min : 0, max : 50 }),
            },
        });
    }
}

module.exports = generateAvailabilities;