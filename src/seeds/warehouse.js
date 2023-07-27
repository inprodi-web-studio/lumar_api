const { WAREHOUSE_MODEL }   = require("../constants/models");
const generateWarehouseDate = require("./data/warehouses");

const generateWarehouses = async ( strapi ) => {
    console.log("generating warehouses");

    const warehouseData = generateWarehouseDate();

    for ( const warehouse of warehouseData ) {
        await strapi.entityService.create( WAREHOUSE_MODEL, {
            data : {
                ...warehouse,
            },
        });
    }
}

module.exports = generateWarehouses;