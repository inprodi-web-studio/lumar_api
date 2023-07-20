const { NotFoundError } = require("./errors");
const formatFields = require("./formatFields");

async function findOne( uuid, MODEL, schema ) {
    const ctx = strapi.requestContext.get();

    const individualModel = MODEL.split(".")[1];
    
    const formattedFields = formatFields( schema );

    const item = await strapi.entityService.findMany( MODEL, {
        filters : {
            uuid,
        },
        fields   : formattedFields.fields,
        populate : formattedFields.populate,
    });

    if ( item.length === 0 ) {
        throw new NotFoundError(`${ individualModel } not found`, {
            key  : `${ individualModel }.notFound`,
            path : ctx.request.path,
        });
    }

    return item[0];
}

module.exports = findOne;