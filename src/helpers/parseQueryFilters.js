const parseQueryFilters = ( queryFilters ) => {

    if ( !queryFilters ) {
        return;
    }
    
    const stringFilters = JSON.stringify( queryFilters )?.replace( "$nin", "$notIn" );
    const parsedFilters = JSON.parse( stringFilters );

    return parsedFilters;
};

module.exports = parseQueryFilters;