module.exports = {
    routes : [
      {
        method: "POST",
        path: "/products/upload/image",
        handler: "product.uploadImage",
      },
      {
        method: "DELETE",
        path: "/products/upload/image/:id",
        handler: "product.deleteImage",
      },
      {
        method: "GET",
        path: "/products/bom/:uuid",
        handler: "product.getBom",
      },
    ],
}