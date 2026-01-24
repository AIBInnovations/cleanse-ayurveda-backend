import cron from "node-cron";
import { cartCleanupJob } from "./cart-cleanup.job.js";
import { checkoutExpiryJob } from "./checkout-expiry.job.js";
import { abandonedCartReminderJob } from "./abandoned-cart-reminder.job.js";
import { orderAutoConfirmJob } from "./order-auto-confirm.job.js";
import { paymentReconciliationJob } from "./payment-reconciliation.job.js";
import { autoInvoiceGenerationJob } from "./auto-invoice-generation.job.js";
import { cartItemValidationJob } from "./cart-item-validation.job.js";

/**
 * Job Scheduler
 * Manages all scheduled background jobs using node-cron
 */

const jobs = [];

/**
 * Initialize all scheduled jobs
 */
export function initializeJobs() {
  console.log("> Initializing background jobs...");

  // Cart Cleanup Job - Runs daily at 2:00 AM
  const cartCleanupTask = cron.schedule(
    "0 2 * * *",
    async () => {
      console.log("\n> [SCHEDULED] Starting cart cleanup job");
      const result = await cartCleanupJob();
      console.log("> [SCHEDULED] Cart cleanup job result:", result);
    },
    {
      scheduled: true,
      timezone: process.env.TZ || "Asia/Kolkata"
    }
  );
  jobs.push({ name: "cart-cleanup", task: cartCleanupTask, schedule: "Daily at 2:00 AM" });
  console.log("> Scheduled: Cart Cleanup Job - Daily at 2:00 AM");

  // Checkout Session Expiry Job - Runs every hour
  const checkoutExpiryTask = cron.schedule(
    "0 * * * *",
    async () => {
      console.log("\n> [SCHEDULED] Starting checkout session expiry job");
      const result = await checkoutExpiryJob();
      console.log("> [SCHEDULED] Checkout session expiry job result:", result);
    },
    {
      scheduled: true,
      timezone: process.env.TZ || "Asia/Kolkata"
    }
  );
  jobs.push({ name: "checkout-expiry", task: checkoutExpiryTask, schedule: "Every hour" });
  console.log("> Scheduled: Checkout Session Expiry Job - Every hour");

  // Abandoned Cart Reminder Job - Runs every 6 hours
  const abandonedCartReminderTask = cron.schedule(
    "0 */6 * * *",
    async () => {
      console.log("\n> [SCHEDULED] Starting abandoned cart reminder job");
      const result = await abandonedCartReminderJob();
      console.log("> [SCHEDULED] Abandoned cart reminder job result:", result);
    },
    {
      scheduled: true,
      timezone: process.env.TZ || "Asia/Kolkata"
    }
  );
  jobs.push({ name: "abandoned-cart-reminder", task: abandonedCartReminderTask, schedule: "Every 6 hours" });
  console.log("> Scheduled: Abandoned Cart Reminder Job - Every 6 hours");

  // Order Auto-Confirmation Job - Runs every 2 hours
  const orderAutoConfirmTask = cron.schedule(
    "0 */2 * * *",
    async () => {
      console.log("\n> [SCHEDULED] Starting order auto-confirmation job");
      const result = await orderAutoConfirmJob();
      console.log("> [SCHEDULED] Order auto-confirmation job result:", result);
    },
    {
      scheduled: true,
      timezone: process.env.TZ || "Asia/Kolkata"
    }
  );
  jobs.push({ name: "order-auto-confirm", task: orderAutoConfirmTask, schedule: "Every 2 hours" });
  console.log("> Scheduled: Order Auto-Confirmation Job - Every 2 hours");

  // Payment Reconciliation Job - Runs every 4 hours
  const paymentReconciliationTask = cron.schedule(
    "0 */4 * * *",
    async () => {
      console.log("\n> [SCHEDULED] Starting payment reconciliation job");
      const result = await paymentReconciliationJob();
      console.log("> [SCHEDULED] Payment reconciliation job result:", result);
    },
    {
      scheduled: true,
      timezone: process.env.TZ || "Asia/Kolkata"
    }
  );
  jobs.push({ name: "payment-reconciliation", task: paymentReconciliationTask, schedule: "Every 4 hours" });
  console.log("> Scheduled: Payment Reconciliation Job - Every 4 hours");

  // Auto Invoice Generation Job - Runs every 6 hours
  const autoInvoiceGenerationTask = cron.schedule(
    "0 */6 * * *",
    async () => {
      console.log("\n> [SCHEDULED] Starting auto invoice generation job");
      const result = await autoInvoiceGenerationJob();
      console.log("> [SCHEDULED] Auto invoice generation job result:", result);
    },
    {
      scheduled: true,
      timezone: process.env.TZ || "Asia/Kolkata"
    }
  );
  jobs.push({ name: "auto-invoice-generation", task: autoInvoiceGenerationTask, schedule: "Every 6 hours" });
  console.log("> Scheduled: Auto Invoice Generation Job - Every 6 hours");

  // Cart Item Validation Job - Runs every 6 hours
  const cartItemValidationTask = cron.schedule(
    "0 */6 * * *",
    async () => {
      console.log("\n> [SCHEDULED] Starting cart item validation job");
      const result = await cartItemValidationJob();
      console.log("> [SCHEDULED] Cart item validation job result:", result);
    },
    {
      scheduled: true,
      timezone: process.env.TZ || "Asia/Kolkata"
    }
  );
  jobs.push({ name: "cart-item-validation", task: cartItemValidationTask, schedule: "Every 6 hours" });
  console.log("> Scheduled: Cart Item Validation Job - Every 6 hours");

  console.log(`> Total scheduled jobs: ${jobs.length}`);
  console.log("> All background jobs initialized successfully\n");

  return jobs;
}

/**
 * Get all scheduled jobs
 */
export function getScheduledJobs() {
  return jobs.map((job) => ({
    name: job.name,
    schedule: job.schedule,
    running: job.task.running || false
  }));
}

/**
 * Stop all scheduled jobs
 */
export function stopAllJobs() {
  console.log("> Stopping all background jobs...");

  jobs.forEach((job) => {
    job.task.stop();
    console.log(`> Stopped: ${job.name}`);
  });

  console.log("> All background jobs stopped");
}

/**
 * Manually trigger a specific job (for testing/admin purposes)
 */
export async function triggerJob(jobName) {
  console.log(`> Manually triggering job: ${jobName}`);

  switch (jobName) {
    case "cart-cleanup":
      return await cartCleanupJob();
    case "checkout-expiry":
      return await checkoutExpiryJob();
    case "abandoned-cart-reminder":
      return await abandonedCartReminderJob();
    case "order-auto-confirm":
      return await orderAutoConfirmJob();
    case "payment-reconciliation":
      return await paymentReconciliationJob();
    case "auto-invoice-generation":
      return await autoInvoiceGenerationJob();
    case "cart-item-validation":
      return await cartItemValidationJob();
    default:
      throw new Error(`Unknown job: ${jobName}`);
  }
}
