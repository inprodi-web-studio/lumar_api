const validators = require("../../helpers/validators");
const { yup, validateYupSchema } = validators;

const addProductionOrderSchema = yup.object().shape({
    dueDate    : yup.string().required("Due date is required"),
    startDate  : yup.string().required("Start date is required"),
    warehouse  : yup.string().required("Warehouse is required"),
    production : yup.object().shape({
        product   : yup.string().required("Product uuid is required"),
        quantity  : yup.number().min(0, "Quantity can not be negative").required("Quantity is required"),
        materials : yup.array().min(1, "There must be at least 1 material").of( yup.object().shape({
            product   : yup.string().required("Product uuid is required"),
            quantity  : yup.number().min(0, "Quantity can not be negative").required("Quantity is required"),
        }).noUnknown().strict()),
    }).noUnknown().strict(),
}).noUnknown().strict();

const assignStockSchema = yup.object().shape({
    product  : yup.string().required("Product uuid is required"),
    batch    : yup.string(),
    quantity : yup.number().min(0, "Quantity can not be negative").required("Quantity is required"),
}).noUnknown().strict();

const returnStockSchema = yup.object().shape({
    product  : yup.string().required("Product uuid is required"),
    batch    : yup.string(),
    quantity : yup.number().min(0, "Quantity can not be negative").required("Quantity is required"),
}).noUnknown().strict();

const addDeliverSchema = yup.object().shape({
    quantity      : yup.number().min(0, "Quantity can not be negative").required("Quantity is required"),
    batch         : yup.string(),
    expirationDay : yup.string(),
}).noUnknown().strict();

module.exports = {
    validateAddProductionOrder : validateYupSchema( addProductionOrderSchema ),
    validateAssignStock        : validateYupSchema( assignStockSchema ),
    validateReturnStock        : validateYupSchema( returnStockSchema ),
    validateAddDeliver         : validateYupSchema( addDeliverSchema ),
};