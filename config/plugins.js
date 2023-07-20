module.exports = ({ env }) => ({
    email : {
        config : {
            provider        : "nodemailer",
            providerOptions : {
                host   : env("SMTP_HOST", "smtp.hostinger.com"),
                port   : env("SMTP_PORT", 465),
                auth   : {
                    user : env("SMTP_USERNAME"),
                    pass : env("SMTP_PASSWORD"),
                },
            },
            settings : {
                defaultFrom    : "Lumar <hola@inprodi.com.mx>",
                defaultReplyTo : "hola@inprodi.com.mx",
            },
        },
    },
});