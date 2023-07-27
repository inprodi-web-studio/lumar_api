const { STOCK_MODEL, WAREHOUSE_MODEL }    = require("../constants/models");
const generateStocksData = require("./data/stocks");

const generateStocks = async ( strapi ) => {
    console.log("generating stocks");

    const warehouse = await strapi.query( WAREHOUSE_MODEL ).findOne();

    const stocksData = generateStocksData();

    for ( const stock of stocksData ) {
        await strapi.entityService.create( STOCK_MODEL, {
            data : {
                ...stock,
                warehouses : warehouse.id,
            },
        });
    }
}

module.exports = generateStocks;