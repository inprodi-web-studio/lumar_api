const validators = require("../../helpers/validators");
const { yup, validateYupSchema } = validators;

const addInvitationSchema = yup.object().shape({
    name     : yup.string().required("Name is required"),
    lastName : yup.string().required("Last name is required"),
    email    : yup.string().required("Email is required"),
    role     : yup.string().oneOf(["owner", "admin", "collaborator"]).required("Role is required"),
}).noUnknown().strict();

module.exports = {
    validateAddInvitation : validateYupSchema( addInvitationSchema, { strict : true } ),
};