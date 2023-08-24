"use strict";

const { uuid } = require("uuidv4");

const {
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
  ADJUSTMENT_MOTIVE_MODEL,
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
        ADJUSTMENT_MOTIVE_MODEL,
      ],
      async beforeCreate( event ) {
        const { data } = event.params;

        data.uuid = uuid();
      },
    });
  },
};
