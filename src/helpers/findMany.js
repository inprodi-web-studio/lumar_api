const pagination        = require("./pagination");
const formatFields      = require("./formatFields");
const formatFilters     = require("./formatFilters");
const parseQueryFilters = require("./parseQueryFilters");

async function findMany( MODEL, schema, filters ) {
    const ctx          = strapi.requestContext.get();
    const queryFilters = ctx.query.filters;

    const meta = await pagination( MODEL, filters );

    const formattedFilters = filters ? formatFilters( filters ) : {};
    const formattedFields  = formatFields( schema );

    const items = await strapi.entityService.findMany( MODEL, {
        start    : meta.start,
        limit    : meta.pageSize,
        fields   : formattedFields.fields,
        populate : formattedFields.populate,
        filters  : {
            ...parseQueryFilters( queryFilters ),
            ...formattedFilters
        },
        ...( ctx.query.sort && ({
            sort : ctx.query.sort,
        }))
    });

    return {
        data : items,
        meta : {
            totalDocs  : meta.total,
            limit      : meta.pageSize,
            page       : meta.page,
            totalPages : meta.pageCount,
        },
    };
}

module.exports = findMany;