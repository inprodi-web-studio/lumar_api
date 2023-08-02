const validators = require("../../helpers/validators");
const { yup, validateYupSchema } = validators;

const addUnitySchema = yup.object().shape({
    name  : yup.string().required("Name is required"),
}).noUnknown().strict();

module.exports = {
    validateAddUnity : validateYupSchema( addUnitySchema ),
};