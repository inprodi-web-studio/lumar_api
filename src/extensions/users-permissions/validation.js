const validators = require("../../helpers/validators");
const { yup, validateYupSchema } = validators;

const loginSchema = yup.object().shape({
    email    : yup.string().email("Email must be an email").required("Email is required"),
    password : yup.string().required("Password is required"), 
});

const forgotPasswordSchema = yup.object().shape({
    email : yup.string().email("Email must be an email").required("Email is required"),
});

const validateCodeSchema = yup.object().shape({
    code : yup.string().required("Code is required"),
});

const resetPasswordSchema = yup.object().shape({
    password        : yup.string().required("Password is required"),
    passwordConfirm : yup.string().required("Password confirmation is required"),
    token           : yup.string().required("Token is required"),
});

module.exports = {
    validateLogin          : validateYupSchema( loginSchema ),
    validateForgotPassword : validateYupSchema( forgotPasswordSchema ),
    validateValidateCode   : validateYupSchema( validateCodeSchema ),
    validateResetPassword  : validateYupSchema( resetPasswordSchema ),
};