const validators = require("../../helpers/validators");
const { yup, validateYupSchema } = validators;

const addEntranceSchema = yup.object().shape({
    warehouse : yup.string().required("Warehouse is required"),
    stock     : yup.string().required("Stock is required"),
    product   : yup.string().required("Product is required"),
    type      : yup.string().oneOf(["deal", "warranty", "return"]).required("Type is required"),
    price     : yup.number().min( 0, "Price can not be negative"),
    batch         : yup.string(),
    expirationDay : yup.string(),
    quantity      : yup.number().required("Quantity is required"),
}).noUnknown().strict();

const addExitSchema = yup.object().shape({
    warehouse : yup.string().required("Warehouse is required"),
    stock     : yup.string().required("Stock is required"),
    product   : yup.string().required("Product is required"),
    type      : yup.string().oneOf(["deal", "warranty", "return"]).required("Type is required"),
    price     : yup.number().min( 0, "Price can not be negative"),
    batch         : yup.string(),
    quantity      : yup.number().required("Quantity is required"),
    customer      : yup.string().nullable(),
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

const addAdjustmentSchema = yup.object().shape({
    warehouse     : yup.string().required("Warehouse is required"),
    stock         : yup.string().required("Stock is required"),
    product       : yup.string().required("Product is required"),
    batch         : yup.string(),
    motive        : yup.string().required("Motive is required"),
    quantity      : yup.number().required("Quantity is required").not([0], "Can't make an adjustment of 0"),
    expirationDay : yup.string().test( "validateAdjustmentQuantity", "Expiration date is not expected if adjustment is negative", (value, context) => {
        const quantity = context.options.from[0].value.quantity;

        if ( value && quantity < 0 ) {
            return false;
        }

        return true;
    }),
    price : yup.number().min( 0, "Price can not be negative").test( "validatePrice", "Price is not expected if adjustment is negative", (value, context) => {
        const quantity = context.options.from[0].value.quantity;

        if ( value && quantity < 0 ) {
            return false;
        }

        return true;
    }),
}).noUnknown().strict();

module.exports = {
    validateAddEntrance   : validateYupSchema( addEntranceSchema ),
    validateAddExit       : validateYupSchema( addExitSchema ),
    validateAddTransfer   : validateYupSchema( addTransferSchema ),
    validateAddAdjustment : validateYupSchema( addAdjustmentSchema ),
};