module.exports = {
    routes : [
      {
        method: "GET",
        path: "/reports/availabilities",
        handler: "report.availabilities",
      },
      {
        method: "GET",
        path: "/reports/availabilities/download",
        handler: "report.downloadAvailabilities",
      },
      {
        method: "GET",
        path: "/reports/stock-movements",
        handler: "report.stockMovements",
      },
      {
        method: "GET",
        path: "/reports/stock-movements/download",
        handler: "report.downloadStockMovements",
      },
      {
        method: "GET",
        path: "/reports/production-orders",
        handler: "report.productionOrders",
      },
      {
        method: "GET",
        path: "/reports/production-orders/download",
        handler: "report.downloadProductionOrders",
      },
      {
        method: "GET",
        path: "/reports/mp-stock",
        handler: "report.mpStock",
      },
      {
        method: "GET",
        path: "/reports/mp-stock/download",
        handler: "report.downloadMpStock",
      },
      {
        method: "GET",
        path: "/reports/assortment-orders",
        handler: "report.assortmentOrders",
      },
      {
        method: "GET",
        path: "/reports/assortment-orders/download",
        handler: "report.downloadAssortmentOrders",
      },
      {
        method: "GET",
        path: "/reports/loss",
        handler: "report.loss",
      },
      {
        method: "GET",
        path: "/reports/loss/download",
        handler: "report.downloadLoss",
      },
      {
        method: "GET",
        path: "/reports/margins",
        handler: "report.margins",
      },
      {
        method: "GET",
        path: "/reports/margins/download",
        handler: "report.downloadMargins",
      },
      {
        method: "GET",
        path: "/reports/deliveries",
        handler: "report.deliveries",
      },
      {
        method: "GET",
        path: "/reports/deliveries/download",
        handler: "report.downloadDeliveries",
      },
      {
        method: "GET",
        path: "/reports/sales",
        handler: "report.sales",
      },
      {
        method: "GET",
        path: "/reports/sales/download",
        handler: "report.downloadSales",
      },
      {
        method: "GET",
        path: "/reports/traceability-pt",
        handler: "report.traceabilityPt",
      },
      {
        method: "GET",
        path: "/reports/traceability-pt/download",
        handler: "report.downloadTraceabilityPt",
      },
      {
        method: "GET",
        path: "/reports/traceability-mp",
        handler: "report.traceabilityMp",
      },
      {
        method: "GET",
        path: "/reports/traceability-mp/download",
        handler: "report.downloadTraceabilityMp",
      }
    ],
}