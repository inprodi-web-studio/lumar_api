module.exports = {
    routes : [
      {
        method: "GET",
        path: "/reports/stock-movements",
        handler: "report.stockMovements",
      },
      {
        method: "GET",
        path: "/reports/production-orders",
        handler: "report.productionOrders",
      },
      {
        method: "GET",
        path: "/reports/mp-stock",
        handler: "report.mpStock",
      },
      {
        method: "GET",
        path: "/reports/assortment-orders",
        handler: "report.assortmentOrders",
      },
      {
        method: "GET",
        path: "/reports/loss",
        handler: "report.loss",
      },
      {
        method: "GET",
        path: "/reports/margins",
        handler: "report.margins",
      },
    ],
}