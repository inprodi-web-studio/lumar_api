module.exports = {
    routes : [
      {
        method: "PUT",
        path: "/stocks/order/:uuid",
        handler: "stock.updateOrder",
      },
    ],
}