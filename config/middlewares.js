module.exports = [
  "strapi::errors",
  "strapi::security",
  "strapi::cors",
  "strapi::logger",
  "strapi::query",
  "strapi::body",
  "strapi::session",
  "global::errors",
  {
    name   : "strapi::poweredBy",
    config : {
      poweredBy : "Inprodi Web Studio",
    },
  },
  {
    name   : "strapi::favicon",
    config : {
      path : "./public/inprodi_favicon.png",
    },
  },
  {
    name    : "strapi::public",
    config  : {
      defer        : true,
      defaultIndex : "./public/index.html",
    },
  },
];
