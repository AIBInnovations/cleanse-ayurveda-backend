import cron from "node-cron";
import { reservationExpiryJob } from "./reservation-expiry.job.js";

/**
 * Initialize all scheduled jobs for the inventory service
 */
export function initializeJobs() {
  console.log("> Initializing scheduled jobs...");

  // Reservation Expiry Job - Runs every 5 minutes
  const reservationExpiryTask = cron.schedule(
    "*/5 * * * *",
    async () => {
      const result = await reservationExpiryJob();
      console.log("> [SCHEDULED] Reservation expiry job result:", result);
    },
    {
      scheduled: true,
      timezone: process.env.TZ || "Asia/Kolkata"
    }
  );

  console.log("> Scheduled jobs initialized successfully");
  console.log("> - Reservation Expiry Job: Every 5 minutes");

  return {
    reservationExpiryTask
  };
}

/**
 * Stop all scheduled jobs
 */
export function stopJobs(jobs) {
  console.log("> Stopping scheduled jobs...");
  if (jobs.reservationExpiryTask) {
    jobs.reservationExpiryTask.stop();
  }
  console.log("> All scheduled jobs stopped");
}
