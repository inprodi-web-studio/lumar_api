const {
    BATCH_MODEL,
    PRODUCT_MODEL,
} = require("../constants/models");

const generateBatchesData = require("./data/batches");

const generateBatches = async ( strapi ) => {
    console.log("generating batches");

    const batchesData = generateBatchesData();

    const product = await strapi.query( PRODUCT_MODEL ).findOne();

    for ( const batch of batchesData ) {
        await strapi.entityService.create( BATCH_MODEL, {
            data : {
                ...batch,
                product : product.id,
            },
        });
    }
}

module.exports = generateBatches;