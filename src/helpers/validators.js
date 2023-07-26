const yup         = require('yup');
const { defaults } = require('lodash/fp');

const { UnprocessableContentError } = require("../helpers/errors");

const defaultValidationParam = { strict: true, abortEarly: false };

const validateYupSchema = ( schema, options = {} ) => async ( body, errorMessage ) => {
    try {
        const optionsWithDefaults = defaults( defaultValidationParam, options );
        return await schema.validate( body, optionsWithDefaults );
    } catch ( error ) {
        throw new UnprocessableContentError( error.errors );
    }
};

module.exports = {
    yup,
    validateYupSchema,
};