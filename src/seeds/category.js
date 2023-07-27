const { CATEGORY_MODEL }     = require("../constants/models");
const generateCategoriesData = require("./data/categories");

const generateCategories = async ( strapi ) => {
    console.log("generating categories");

    const categoriesData = generateCategoriesData();

    for ( const category of categoriesData ) {
        await strapi.entityService.create( CATEGORY_MODEL, {
            data : {
                ...category,
            },
        });
    }
}

module.exports = generateCategories;