const { BadRequestError } = require("./errors");

const formatFields = ( schema = {} ) => {
    const ctx = strapi.requestContext.get();

    const schemaToUse = {
        fields   : [],
        populate : {},
    };

    if ( ctx.query?.fields ) {
        const keys = Object.keys( ctx.query.fields || {} );

        for ( const key of keys ) {
            if ( schema.fields?.includes( key ) ) {
                schemaToUse.fields.push( key );
            } else if ( Object.keys( schema.populate || {} ).includes( key ) ) {
                schemaToUse.populate[ key ] = schema.populate[ key ];
            } else {
                throw new BadRequestError( `The field ${ key } dont exist` );
            }
        }
    } else 
        schemaToUse.fields   = schema.fields;
        schemaToUse.populate = schema.populate;
    

    return schemaToUse;
    
};

module.exports = formatFields;