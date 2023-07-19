const createError = require("http-errors");

const statusArray = [
  400,
  401,
  403,
  404,
  409,
  422,
];

const formatError = ( error ) => {
  return {
    status : error.status,
    body : {
      statusCode : error.status,
      timeStamp  : new Date(),
      path       : error.path,
      message    : error.message,
      key        : error.key,
    },
  };
};

const formatInternalError = (error) => {
  const httpError = createError(error);

  if (httpError.expose) {
    return formatError(httpError);
  }

  return formatError( createError( httpError.status || 500 ));
};

module.exports = () => {
  return async (ctx, next) => {
    try {
      await next();

      if (!ctx.response._explicitStatus) {
        return ctx.notFound();
      }
    } catch (error) {
      if ( statusArray.includes( error.status ) ) {
        const {
          body,
          status,
        } = formatError( error );

        ctx.status = status;
        ctx.body   = body;

        return;
      }

      strapi.log.error( error );

      const { status, body } = formatInternalError(error);
      ctx.status = status;
      ctx.body   = body;
    }
  };
};