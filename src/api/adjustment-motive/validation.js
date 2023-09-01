const validators = require("../../helpers/validators");
const { yup, validateYupSchema } = validators;

const addMotiveSchema = yup.object().shape({
    name  : yup.string().required("Name is required"),
}).noUnknown().strict();

module.exports = {
    validateAddMotive : validateYupSchema( addMotiveSchema ),
};