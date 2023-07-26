const validators = require("../../helpers/validators");
const { yup, validateYupSchema } = validators;

const loginSchema = yup.object().shape({
    email    : yup.string().email("Email must be an email").required("Email is required"),
    password : yup.string().required("Password is required"), 
}).noUnknown().strict();

const forgotPasswordSchema = yup.object().shape({
    email : yup.string().email("Email must be an email").required("Email is required"),
}).noUnknown().strict();

const validateCodeSchema = yup.object().shape({
    code : yup.string().required("Code is required"),
}).noUnknown().strict();

const resetPasswordSchema = yup.object().shape({
    password        : yup.string().required("Password is required"),
    passwordConfirm : yup.string().required("Password confirmation is required"),
    token           : yup.string().required("Token is required"),
}).noUnknown().strict();

const addUserSchema = yup.object().shape({
    name            : yup.string().required("Name is required"),
    lastName        : yup.string().required("Last name is required"),
    password        : yup.string().required("Password is required"),
    passwordConfirm : yup.string().required("Password confirmation is required"),
}).noUnknown().strict();

const updateUserSchema = yup.object().shape({
    name            : yup.string().required("Name is required"),
    lastName        : yup.string().required("Last name is required"),
    role            : yup.string().required("Password is required"),
}).noUnknown().strict();

module.exports = {
    validateLogin          : validateYupSchema( loginSchema ),
    validateForgotPassword : validateYupSchema( forgotPasswordSchema ),
    validateValidateCode   : validateYupSchema( validateCodeSchema ),
    validateResetPassword  : validateYupSchema( resetPasswordSchema ),
    validateAddUser        : validateYupSchema( addUserSchema ),
    validateUpdateUser     : validateYupSchema( updateUserSchema ),
};