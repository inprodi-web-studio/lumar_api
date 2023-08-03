const generateProductsData = () => {
    let products = [
        {
            sku          : "1234567890",
            name         : "Caja de Cartón 20cm x 50cm",
            description  : "Caja de cartón para empacar productos",
            saleInfo     : null,
            type         : "mp",
            purchaseInfo : {
                purchasePrice : 19,
                iva           : "sixteen",
            },
            inventoryInfo : {
                manageBatches  : false,
                expirationDays : null,
                alertQuantity  : 4,
            },
        },
        {
            sku          : "0987654321",
            name         : "Masa de Maíz",
            description  : "Masa base utilizada para la producción de tostadas",
            saleInfo     : {
                salePrice : 40,
                iva       : "eight",
            },
            type         : "mp",
            purchaseInfo : {
                purchasePrice : 20,
                iva           : "sixteen",
            },
            inventoryInfo : {
                manageBatches  : true,
                expirationDays : 22,
                alertQuantity  : 8,
            },
        },
    ];

    return products;
}

module.exports = generateProductsData;