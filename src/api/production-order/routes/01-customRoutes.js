module.exports = {
    routes : [
      {
        method: "PATCH",
        path: "/production-orders/reserve/:uuid",
        handler: "production-order.reserveMaterials",
      },
    ],
}