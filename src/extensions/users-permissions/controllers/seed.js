const { PRODUCT_MODEL } = require("../../../constants/models");
const findMany = require("../../../helpers/findMany");
const findOne = require("../../../helpers/findOne");
const generateSeedData = require("./../../../seeds");

module.exports = ( plugin ) => {
    plugin.controllers.auth["generateSeeds"] = async ( ctx ) => {
        await generateSeedData( strapi );

        return "SEEDS GENERATED SUCCESSFULLY";
    };

    plugin.controllers.auth["assignUnity"] = async ( ctx ) => {
        const products = await strapi.query( PRODUCT_MODEL ).findMany({
            where : {
                type : {
                    $not : "mp",
                },
            },
            populate : {
                unity : true,
            },
        });

        for ( const product of products ) {
            await strapi.entityService.update( PRODUCT_MODEL, product.id, {
               data : {
                    productionUnity     : product.unity.id,
                    unityConversionRate : 1,
               }, 
            });
            
            let materials = [ ...product.materials ];

            for ( let i = 0; i < product.materials.length; i++ ) {
                const material = product.materials[i];

                const materialProduct = await findOne( material.uuid, PRODUCT_MODEL, {
                    populate : {
                        productionUnity : true,
                    },
                });

                materials[i].unity = materialProduct.productionUnity.name;
            }

            await strapi.entityService.update( PRODUCT_MODEL, product.id, {
                data : {
                    materials,
                },
            });
        }

        return "Todo correcto";
    };
}