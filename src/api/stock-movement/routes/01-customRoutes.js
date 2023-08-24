module.exports = {
    routes : [
      {
        method: "POST",
        path: "/stock-movements/entrance",
        handler: "stock-movement.entrance",
      },
      {
        method: "POST",
        path: "/stock-movements/exit",
        handler: "stock-movement.exit",
      },
      {
        method: "POST",
        path: "/stock-movements/transfer",
        handler: "stock-movement.transfer",
      },
      {
        method: "POST",
        path: "/stock-movements/adjust",
        handler: "stock-movement.adjust",
      },
    ],
}