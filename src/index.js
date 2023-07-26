"use strict";

const { uuid } = require("uuidv4");

const {
  USER_MODEL,
  INVITATION_MODEL,
} = require("./constants/models");

module.exports = {
  register(/*{ strapi }*/) {
    
  },

  bootstrap({ strapi }) {
    strapi.db.lifecycles.subscribe({
      models : [
        USER_MODEL,
        INVITATION_MODEL,
      ],
      async beforeCreate( event ) {
        const { data } = event.params;

        data.uuid = uuid();
      },
    });
  },
};
