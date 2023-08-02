const validators = require("../../helpers/validators");
const { yup, validateYupSchema } = validators;

const addTagSchema = yup.object().shape({
    name  : yup.string().required("Name is required"),
}).noUnknown().strict();

module.exports = {
    validateAddTag : validateYupSchema( addTagSchema ),
};