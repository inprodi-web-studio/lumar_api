const formatFilters = ( filters ) => {
    const ctx           = strapi.requestContext.get();
    const filtersToUser = {...filters};

    const formattedFilters = {
        $and : [],
        $or  : [],
    };

    if ( filters?.$search && ctx.query.search ) {
        for ( const item of filters.$search ) {
            const itemInArray = item.split(".");

            switch ( itemInArray.length ) {
                case 1:
                    formattedFilters.$or.push({
                        [itemInArray[0]] : {
                            $contains : ctx.query.search,
                        },
                    });
                    break;

                case 2:
                    formattedFilters.$or.push({
                        [itemInArray[0]] : {
                            [itemInArray[1]] : {
                                $contains : ctx.query.search
                            },
                        },
                    });
                    break;

                case 3:
                    formattedFilters.$or.push({
                        [itemInArray[0]] : {
                            [itemInArray[1]] : {
                                [itemInArray[2]] : {
                                    $contains : ctx.query.search
                                },
                            },
                        },
                    });
                    break;

                case 4:
                    formattedFilters.$or.push({
                        [itemInArray[0]] : {
                            [itemInArray[1]] : {
                                [itemInArray[2]] : {
                                    [itemInArray[3]] : {
                                        $contains : ctx.query.search
                                    },
                                },
                            },
                        },
                    });
                    break;

                case 5:
                    formattedFilters.$or.push({
                        [itemInArray[0]] : {
                            [itemInArray[1]] : {
                                [itemInArray[2]] : {
                                    [itemInArray[3]] : {
                                        [itemInArray[4]] : {
                                            $contains : ctx.query.search
                                        },
                                    },
                                },
                            },
                        },
                    });
                    break;
            
                default:
                    throw new Error( "Too much nested instances for search" );
            }
        }
    }

    delete filtersToUser.$search;

    formattedFilters.$and.push( filtersToUser );

    return formattedFilters;
};

module.exports = formatFilters;