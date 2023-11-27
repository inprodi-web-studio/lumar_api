module.exports = {
    routes : [
      {
        method: "PATCH",
        path: "/production-orders/reserve/:uuid",
        handler: "production-order.reserveMaterials",
      },
      {
        method: "PATCH",
        path: "/production-orders/unreserve/:uuid",
        handler: "production-order.unreserveMaterials",
      },
      {
        method: "PUT",
        path: "/production-orders/:uuid/start-production",
        handler: "production-order.startProduction",
      },
      {
        method: "PATCH",
        path: "/production-orders/:uuid/assign-stock",
        handler: "production-order.assignStock",
      },
      {
        method: "PATCH",
        path: "/production-orders/:uuid/return-stock",
        handler: "production-order.returnStock",
      },
      {
        method: "PATCH",
        path: "/production-orders/:uuid/add-deliver",
        handler: "production-order.addDeliver",
      },
      {
        method: "PUT",
        path: "/production-orders/:uuid/complete-order",
        handler: "production-order.completeOrder",
      },
    ],
}