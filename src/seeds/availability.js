const {
    STOCK_MODEL,
    PRODUCT_MODEL,
    WAREHOUSE_MODEL,
    AVAILABILITY_MODEL,
} = require("../constants/models");

const { faker } = require("@faker-js/faker");

const generateAvailabilities = async ( strapi ) => {
    console.log("generating availabilities");

    const products = await strapi.query( PRODUCT_MODEL ).findMany({
        populate : {
            batches       : true,
            inventoryInfo : true,
        },
    });

    const warehouses = await strapi.query( WAREHOUSE_MODEL ).findMany();

    const stocks = await strapi.query( STOCK_MODEL ).findMany();

    for ( const product of products ) {
        await strapi.entityService.create( AVAILABILITY_MODEL, {
            data : {
                warehouse : faker.helpers.arrayElement( warehouses ).id,
                product   : product.id,
                batch     : product.inventoryInfo.manageBatches ? product.batches[0]?.id : null,
                stock     : faker.helpers.arrayElement( stocks ).id,
                quantity  : faker.number.int({ min : 1, max : 50 }),
            },
        });
    }
}

module.exports = generateAvailabilities;