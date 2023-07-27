module.exports = {
    routes : [
      {
        method: "PUT",
        path: "/warehouses/:warehouse_uuid/assign-stock/:stock_uuid",
        handler: "warehouse.assignStock",
      },
      {
        method: "PUT",
        path: "/warehouses/:warehouse_uuid/unassign-stock/:stock_uuid",
        handler: "warehouse.unassignStock",
      },
    ],
}