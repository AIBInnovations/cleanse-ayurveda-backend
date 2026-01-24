import "@shared/env-loader";
import { database as connectDB } from "@shared/config";
import Warehouse from "../models/warehouse.model.js";
import Inventory from "../models/inventory.model.js";

async function seed() {
  try {
    console.log("> Starting seed script");

    await connectDB();

    console.log("> Clearing existing data");
    await Warehouse.deleteMany({});
    await Inventory.deleteMany({});

    console.log("> Creating warehouses");
    const warehouses = await Warehouse.insertMany([
      {
        code: "WH001",
        name: "Main Warehouse Delhi",
        address: {
          line1: "123 Industrial Area",
          line2: "Sector 15",
          city: "New Delhi",
          state: "Delhi",
          pincode: "110001",
          country: "India",
        },
        isActive: true,
        isDefault: true,
        priority: 1,
      },
      {
        code: "WH002",
        name: "Mumbai Distribution Center",
        address: {
          line1: "456 Warehouse District",
          city: "Mumbai",
          state: "Maharashtra",
          pincode: "400001",
          country: "India",
        },
        isActive: true,
        isDefault: false,
        priority: 2,
      },
      {
        code: "WH003",
        name: "Bangalore Hub",
        address: {
          line1: "789 Tech Park",
          city: "Bangalore",
          state: "Karnataka",
          pincode: "560001",
          country: "India",
        },
        isActive: true,
        isDefault: false,
        priority: 3,
      },
    ]);

    console.log(`> Created ${warehouses.length} warehouses`);

    console.log("> Creating sample inventory records");
    const sampleInventory = [
      {
        productId: "PROD001",
        variantId: "VAR001",
        sku: "SKU001-WH001",
        warehouseId: warehouses[0]._id,
        qtyOnHand: 100,
        qtyReserved: 5,
        lowStockThreshold: 10,
        allowBackorder: false,
      },
      {
        productId: "PROD001",
        variantId: "VAR001",
        sku: "SKU001-WH002",
        warehouseId: warehouses[1]._id,
        qtyOnHand: 50,
        qtyReserved: 2,
        lowStockThreshold: 10,
        allowBackorder: false,
      },
      {
        productId: "PROD002",
        variantId: "VAR002",
        sku: "SKU002-WH001",
        warehouseId: warehouses[0]._id,
        qtyOnHand: 8,
        qtyReserved: 0,
        lowStockThreshold: 10,
        allowBackorder: true,
      },
      {
        productId: "PROD003",
        variantId: "VAR003",
        sku: "SKU003-WH001",
        warehouseId: warehouses[0]._id,
        qtyOnHand: 0,
        qtyReserved: 0,
        lowStockThreshold: 5,
        allowBackorder: false,
      },
    ];

    await Inventory.insertMany(sampleInventory);

    console.log(`> Created ${sampleInventory.length} inventory records`);

    console.log("> Seed completed successfully");
    process.exit(0);
  } catch (error) {
    console.error("> Seed failed:", error);
    process.exit(1);
  }
}

seed();
