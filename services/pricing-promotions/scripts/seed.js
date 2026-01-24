import "@shared/env-loader";
import { database as connectDB } from "@shared/config";
import mongoose from "mongoose";
import Coupon from "../models/coupon.model.js";
import AutomaticDiscount from "../models/automaticDiscount.model.js";
import TierDiscount from "../models/tierDiscount.model.js";
import FreeGiftRule from "../models/freeGiftRule.model.js";

const ADMIN_ID = "60d5ecb54f8c2c001f8e4b1a";

async function seedDatabase() {
  try {
    console.log("> Connecting to database...");
    await connectDB();

    console.log("> Clearing existing data...");
    await Promise.all([
      Coupon.deleteMany({}),
      AutomaticDiscount.deleteMany({}),
      TierDiscount.deleteMany({}),
      FreeGiftRule.deleteMany({}),
    ]);

    console.log("> Seeding coupons...");
    const coupons = await Coupon.insertMany([
      {
        code: "WELCOME10",
        name: "Welcome Discount",
        description: "10% off for new customers",
        type: "percentage",
        value: 10,
        maxDiscount: 500,
        minOrderValue: 0,
        usageLimitTotal: null,
        usageLimitPerUser: 1,
        appliesTo: "all",
        applicableIds: [],
        excludedIds: [],
        customerEligibility: "first_order",
        eligibleSegmentIds: [],
        isStackable: false,
        isAutoApply: false,
        isActive: true,
        startsAt: null,
        endsAt: null,
        createdById: ADMIN_ID,
      },
      {
        code: "SAVE500",
        name: "Flat 500 Off",
        description: "Flat 500 off on orders above 2000",
        type: "fixed_amount",
        value: 500,
        maxDiscount: null,
        minOrderValue: 2000,
        usageLimitTotal: 100,
        usageLimitPerUser: 1,
        appliesTo: "all",
        applicableIds: [],
        excludedIds: [],
        customerEligibility: "all",
        eligibleSegmentIds: [],
        isStackable: false,
        isAutoApply: false,
        isActive: true,
        startsAt: null,
        endsAt: new Date("2026-12-31"),
        createdById: ADMIN_ID,
      },
      {
        code: "FREESHIP",
        name: "Free Shipping",
        description: "Free shipping on all orders",
        type: "free_shipping",
        value: 0,
        maxDiscount: null,
        minOrderValue: 999,
        usageLimitTotal: null,
        usageLimitPerUser: null,
        appliesTo: "all",
        applicableIds: [],
        excludedIds: [],
        customerEligibility: "all",
        eligibleSegmentIds: [],
        isStackable: true,
        isAutoApply: false,
        isActive: true,
        startsAt: null,
        endsAt: null,
        createdById: ADMIN_ID,
      },
    ]);
    console.log(`> Created ${coupons.length} coupons`);

    console.log("> Seeding automatic discounts...");
    const automaticDiscounts = await AutomaticDiscount.insertMany([
      {
        name: "Cart Value Discount 5%",
        description: "5% off on orders above 1500",
        type: "percentage",
        value: 5,
        maxDiscount: 300,
        minOrderValue: 1500,
        appliesTo: "cart",
        applicableIds: [],
        priority: 1,
        isStackable: false,
        isActive: true,
        startsAt: null,
        endsAt: null,
        createdById: ADMIN_ID,
      },
      {
        name: "Flat 100 Off",
        description: "Flat 100 off on orders above 1000",
        type: "fixed_amount",
        value: 100,
        maxDiscount: null,
        minOrderValue: 1000,
        appliesTo: "cart",
        applicableIds: [],
        priority: 2,
        isStackable: true,
        isActive: true,
        startsAt: null,
        endsAt: null,
        createdById: ADMIN_ID,
      },
    ]);
    console.log(`> Created ${automaticDiscounts.length} automatic discounts`);

    console.log("> Seeding tier discounts...");
    const tierDiscounts = await TierDiscount.insertMany([
      {
        name: "Bulk Purchase Discount",
        description: "Discount based on cart value tiers",
        type: "cart_value",
        levels: [
          {
            min: 2000,
            max: 4999,
            discountType: "percentage",
            discountValue: 5,
            badge: "Save 5%",
          },
          {
            min: 5000,
            max: 9999,
            discountType: "percentage",
            discountValue: 10,
            badge: "Save 10%",
          },
          {
            min: 10000,
            max: null,
            discountType: "percentage",
            discountValue: 15,
            badge: "Save 15%",
          },
        ],
        isActive: true,
        startsAt: null,
        endsAt: null,
        createdById: ADMIN_ID,
      },
      {
        name: "Quantity Based Discount",
        description: "Discount based on quantity purchased",
        type: "cart_quantity",
        levels: [
          {
            min: 3,
            max: 5,
            discountType: "fixed_amount",
            discountValue: 200,
            badge: "Buy 3+ save 200",
          },
          {
            min: 6,
            max: null,
            discountType: "fixed_amount",
            discountValue: 500,
            badge: "Buy 6+ save 500",
          },
        ],
        isActive: true,
        startsAt: null,
        endsAt: null,
        createdById: ADMIN_ID,
      },
    ]);
    console.log(`> Created ${tierDiscounts.length} tier discounts`);

    console.log("> Seeding free gift rules...");
    const freeGiftRules = await FreeGiftRule.insertMany([
      {
        name: "Free Sample on 1500+",
        description: "Get a free sample product on orders above 1500",
        triggerType: "cart_value",
        triggerValue: 1500,
        triggerProductIds: [],
        giftProductId: "sample-product-id-001",
        giftVariantId: null,
        giftQuantity: 1,
        isActive: true,
        startsAt: null,
        endsAt: null,
        createdById: ADMIN_ID,
      },
      {
        name: "Buy Product Get Gift",
        description: "Buy specific product and get a free gift",
        triggerType: "product_purchase",
        triggerValue: null,
        triggerProductIds: ["product-id-001", "product-id-002"],
        giftProductId: "gift-product-id-001",
        giftVariantId: "gift-variant-id-001",
        giftQuantity: 1,
        isActive: true,
        startsAt: null,
        endsAt: null,
        createdById: ADMIN_ID,
      },
    ]);
    console.log(`> Created ${freeGiftRules.length} free gift rules`);

    console.log("> Seed completed successfully");
    console.log(`> Summary:`);
    console.log(`  - Coupons: ${coupons.length}`);
    console.log(`  - Automatic Discounts: ${automaticDiscounts.length}`);
    console.log(`  - Tier Discounts: ${tierDiscounts.length}`);
    console.log(`  - Free Gift Rules: ${freeGiftRules.length}`);

    await mongoose.connection.close();
    console.log("> Database connection closed");
    process.exit(0);
  } catch (error) {
    console.log(`> Error seeding database: ${error.message}`);
    console.log(`> Stack: ${error.stack}`);
    process.exit(1);
  }
}

seedDatabase();
