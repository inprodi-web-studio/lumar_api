const validators = require("../../helpers/validators");
const { yup, validateYupSchema } = validators;

const addStockSchema = yup.object().shape({
    name        : yup.string().required("Name is required"),
    description : yup.string().required("Description is required"),
}).noUnknown().strict();

const updateOrderSchema = yup.object().shape({
   order : yup.array().of(yup.string()).required("Order is required"), 
});

module.exports = {
    validateAddStock    : validateYupSchema( addStockSchema ),
    validateUpdateOrder : validateYupSchema( updateOrderSchema ),
};