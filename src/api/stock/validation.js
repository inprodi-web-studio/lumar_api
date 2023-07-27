const validators = require("../../helpers/validators");
const { yup, validateYupSchema } = validators;

const addStockSchema = yup.object().shape({
    name        : yup.string().required("Name is required"),
    description : yup.string().required("Description is required"),
}).noUnknown().strict();

module.exports = {
    validateAddStock : validateYupSchema( addStockSchema ),
};