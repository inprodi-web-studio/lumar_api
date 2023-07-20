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

// yup.setLocale({
//     mixed: {
//       notType({ path, type, value, originalValue }) {
//         const isCast = originalValue != null && originalValue !== value;
//         const msg =
//           `${path} must be a \`${type}\` type, ` +
//           `but the final value was: \`${printValue(value, true)}\`${
//             isCast ? ` (cast from the value \`${printValue(originalValue, true)}\`).` : '.'
//           }`;
  
//         /* Remove comment that is not supposed to be seen by the enduser
//         if (value === null) {
//           msg += `\n If "null" is intended as an empty value be sure to mark the schema as \`.nullable()\``;
//         }
//         */
//         return msg;
//       },
//     },
// });

module.exports = {
    yup,
    validateYupSchema,
};