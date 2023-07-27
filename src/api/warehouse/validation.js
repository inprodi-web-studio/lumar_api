const validators = require("../../helpers/validators");
const { yup, validateYupSchema } = validators;

const addWarehouseSchema = yup.object().shape({
    name    : yup.string().required("Name is required"),
    address : yup.object().shape({
        street : yup.string().required("Street is required"),
        extNo  : yup.string().required("Ext. No. is required"),
        intNo  : yup.string().notRequired(),
        suburb : yup.string().required("Suburb is required"),
        cp     : yup.string().required("CP is required"),
        state  : yup.string().required("State is required"),
        city   : yup.string().required("City is required"),
    }).noUnknown().strict(),
}).noUnknown().strict();

module.exports = {
    validateAddWarehouse : validateYupSchema( addWarehouseSchema ),
};