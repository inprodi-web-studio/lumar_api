const formatFilters     = require("./formatFilters");
const parseQueryFilters = require("./parseQueryFilters");

const pagination = async ( model, filters ) => {
    const ctx          = strapi.requestContext.get();
    const queryFilters = ctx.query.filters;
    const page         = ctx.query.page || 1;
    const pageSize     = ctx.query.limit || 30;

    const formattedFilters = formatFilters( filters );

    const total = await strapi.db.query( model ).count({
        where : {
            ...parseQueryFilters( queryFilters ),
            ...formattedFilters,
        },
    });
    const pageCount = Math.ceil(total / pageSize);

    const start = ((page - 1) * pageSize);

    return ({
        page,
        pageSize,
        total,
        pageCount,
        start,
    });
};

module.exports = pagination;