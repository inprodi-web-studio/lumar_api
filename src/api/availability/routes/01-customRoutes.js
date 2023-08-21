module.exports = {
    routes : [
      {
        method: "GET",
        path: "/availabilities/:uuid",
        handler: "availability.find",
      },
      {
        method: "GET",
        path: "/availabilities/:warehouseUuid/:productUuid",
        handler: "availability.findOne",
      },
    ],
}