import "@shared/env-loader";
import { database as connectDB } from "@shared/config";
import { cleanupExpiredReservations } from "../src/reservations/reservations.controller.js";

async function runCleanup() {
  try {
    console.log("> Starting reservation cleanup job");

    await connectDB();

    await cleanupExpiredReservations();

    console.log("> Cleanup job completed successfully");
    process.exit(0);
  } catch (error) {
    console.error("> Cleanup job failed:", error);
    process.exit(1);
  }
}

runCleanup();
