const validators = require("../../helpers/validators");
const { yup, validateYupSchema } = validators;

const addEntranceSchema = yup.object().shape({
    warehouse : yup.string().required("Warehouse is required"),
    stock     : yup.string().required("Stock is required"),
    product   : yup.string().required("Product is required"),
    type      : yup.string().oneOf(["deal", "warranty", "return"]).required("Type is required"),
    price     : yup.number().when( "type", {
        is        : "deal",
        then      : yup.number().required("Price is required"),
        otherwise : yup.number().oneOf([null], "Price is not required if type is 'deal' or 'warranty'"),
    }),
    batch         : yup.string(),
    expirationDay : yup.string(),
    quantity      : yup.number().required("Quantity is required"),
}).noUnknown().strict();

const addExitSchema = yup.object().shape({
    warehouse : yup.string().required("Warehouse is required"),
    stock     : yup.string().required("Stock is required"),
    product   : yup.string().required("Product is required"),
    type      : yup.string().oneOf(["deal", "warranty", "return"]).required("Type is required"),
    price     : yup.number().when( "type", {
        is        : "deal",
        then      : yup.number().required("Price is required"),
        otherwise : yup.number().oneOf([null], "Price is not required if type is 'deal' or 'warranty'"),
    }),
    batch         : yup.string(),
    quantity      : yup.number().required("Quantity is required"),
}).noUnknown().strict();

const addTransferSchema = yup.object().shape({
    warehouseOut : yup.string().required("Warehouse Out is required"),
    stockOut     : yup.string().required("Stock Out is required"),
    warehouseIn  : yup.string().required("Warehouse In is required"),
    stockIn      : yup.string().required("Stock In is required"),
    product      : yup.string().required("Product is required"),
    batch         : yup.string(),
    quantity      : yup.number().required("Quantity is required"),
}).noUnknown().strict();

module.exports = {
    validateAddEntrance : validateYupSchema( addEntranceSchema ),
    validateAddExit     : validateYupSchema( addExitSchema ),
    validateAddTransfer : validateYupSchema( addTransferSchema ),
};