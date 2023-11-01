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
    ],
}