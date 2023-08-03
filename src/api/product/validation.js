const validators = require("../../helpers/validators");
const { yup, validateYupSchema } = validators;

const addProductSchema = yup.object().shape({
    sku         : yup.string().required("SKU is required"),
    name        : yup.string().required("Name is required"),
    description : yup.string(),
    type        : yup.string().oneOf(["mp", "sp", "pt"]).required("Type is required"),
    categories  : yup.array().of(yup.string()).min(1, "At least one category is required"),
    unity       : yup.string().required("Unity is required"),
    tags        : yup.array().of(yup.string()),
    saleInfo    : yup.object().shape({
        salePrice : yup.number().required("Sale price is required"),
        iva       : yup.string().oneOf(["cero", "eight", "sixteen"]).required("IVA is required"),
    }).noUnknown().strict().nullable(),
    purchaseInfo: yup.object().shape({
        purchasePrice : yup.number().required("Purchase price is required"),
        iva           : yup.string().oneOf(["cero", "eight", "sixteen"]).required("IVA is required"),
    }).noUnknown().strict().nullable(),
    inventoryInfo : yup.object().shape({
        manageBatches  : yup.boolean().required("Manage batches is required"),
        expirationDays : yup.number().nullable(),
        alertQuantity  : yup.number().nullable(),
    }).noUnknown().strict(),
}).noUnknown().strict();

module.exports = {
    validateAddProduct : validateYupSchema( addProductSchema ),
};