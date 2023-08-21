"use strict";

const { uuid } = require("uuidv4");

const {
  USER_MODEL,
  STOCK_MODEL,
  PRODUCT_MODEL,
  CATEGORY_MODEL,
  WAREHOUSE_MODEL,
  INVITATION_MODEL,
  UNITY_MODEL,
  TAG_MODEL,
  AVAILABILITY_MODEL,
  BATCH_MODEL,
} = require("./constants/models");

module.exports = {
  register(/*{ strapi }*/) {
    
  },

  bootstrap({ strapi }) {
    strapi.db.lifecycles.subscribe({
      models : [
        TAG_MODEL,
        USER_MODEL,
        STOCK_MODEL,
        UNITY_MODEL,
        BATCH_MODEL,
        PRODUCT_MODEL,
        CATEGORY_MODEL,
        WAREHOUSE_MODEL,
        INVITATION_MODEL,
        AVAILABILITY_MODEL,
      ],
      async beforeCreate( event ) {
        const { data } = event.params;

        data.uuid = uuid();
      },
    });
  },
};
