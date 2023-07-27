const validators = require("../../helpers/validators");
const { yup, validateYupSchema } = validators;

const addCategorySchema = yup.object().shape({
    name  : yup.string().required("Name is required"),
    color : yup.string().required("Color is required"),
}).noUnknown().strict();

module.exports = {
    validateAddCategory : validateYupSchema( addCategorySchema ),
};