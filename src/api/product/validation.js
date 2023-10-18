const validators = require("../../helpers/validators");
const { yup, validateYupSchema } = validators;

const addProductSchema = yup.object().shape({
    sku                 : yup.string().required("SKU is required"),
    name                : yup.string().required("Name is required"),
    image               : yup.number(),
    description         : yup.string(),
    type                : yup.string().oneOf(["mp", "sp", "pt"]).required("Type is required"),
    categories          : yup.array().of(yup.string()).min(1, "At least one category is required"),
    unity               : yup.string().required("Unity is required"),
    // productionUnity     : yup.string().required("Production unity is required"),
    // unityConversionRate: yup.number().when(['unity', 'productionUnity'], {
    //     is        : (unity, productionUnity) => unity !== productionUnity,
    //     then      : yup.number().required("UnityConversionRate is required when Unity and ProductionUnity are different"),
    //     otherwise : yup.number().oneOf([null], "UnityConversionRate is required only when Unity and ProductionUnity are different"),
    // }),
    tags     : yup.array().of(yup.string()),
    saleInfo : yup.object().shape({
        salePrice : yup.number().required("Sale price is required"),
        iva       : yup.string().oneOf(["none", "cero", "eight", "sixteen"]).required("IVA is required"),
    }).noUnknown().strict().nullable(),
    purchaseInfo: yup.object().shape({
        purchasePrice : yup.number().required("Purchase price is required"),
        iva           : yup.string().oneOf(["none","cero", "eight", "sixteen"]).required("IVA is required"),
    }).noUnknown().strict().nullable(),
    inventoryInfo : yup.object().shape({
        manageBatches  : yup.boolean().nullable(),
        expirationDays : yup.number().nullable(),
        alertQuantity  : yup.number().nullable(),
    }).noUnknown().strict(),
    materials : yup.array().of(yup.object().shape({
        product  : yup.string().required("Product is required"),
        quantity : yup.number().required("Quantity is required"),
    })),
}).noUnknown().strict();

module.exports = {
    validateAddProduct : validateYupSchema( addProductSchema ),
};