const {
    TAG_MODEL,
    UNITY_MODEL,
    PRODUCT_MODEL,
    CATEGORY_MODEL,
} = require("../constants/models");

const generateProductsData = require("./data/products");

const generateProducts = async ( strapi ) => {
    console.log("generating products");

    const productsData = generateProductsData();

    const category = await strapi.query( CATEGORY_MODEL ).findOne();
    const unity    = await strapi.query( UNITY_MODEL ).findOne();
    const tags     = await strapi.query( TAG_MODEL ).findMany();

    for ( const product of productsData ) {
        await strapi.entityService.create( PRODUCT_MODEL, {
            data : {
                ...product,
                categories : [ category.id ],
                unity      : unity.id,
                tags       : tags,
            },
        });
    }
}

module.exports = generateProducts;