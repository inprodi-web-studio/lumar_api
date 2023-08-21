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

module.exports = {
    validateAddEntrance : validateYupSchema( addEntranceSchema ),
};