'use strict';

const { CUSTOMER } = require('../../../constants/models');
const findMany = require('../../../helpers/findMany');

const { createCoreController } = require('@strapi/strapi').factories;

const customerFields = {
    fields : ["uuid", "name"],
};

module.exports = createCoreController('api::customer.customer', ({ strapi }) => ({
    async find(ctx) {
        const filters = {
            $search : ["name"],
        };

        const customers = await findMany( CUSTOMER, customerFields, filters );

        return customers;
    },

    async create( ctx ) {
        const data = ctx.request.body;

        const newCustomer = await strapi.entityService.create( CUSTOMER, {
            data : {
                name : data.name,
            },
        });

        return newCustomer;
    },
}));
