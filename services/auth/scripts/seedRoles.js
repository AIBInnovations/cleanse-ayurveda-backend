import "dotenv/config";
import mongoose from "mongoose";
import Role from "../models/role.model.js";
import { DEFAULT_ROLES } from "../utils/constants.js";

/**
 * Standalone role seeding script
 * Seeds only default roles (idempotent)
 * Run: npm run seed:roles
 */

const connectDB = async () => {
  try {
    if (!process.env.MONGODB_URL) {
      console.log("Missing MongoDB connection string");
      process.exit(1);
    }

    await mongoose.connect(process.env.MONGODB_URL);
    console.log("MongoDB connected for role seeding");
  } catch (error) {
    console.log(`MongoDB connection error: ${error.message}`);
    process.exit(1);
  }
};

const seedRoles = async () => {
  console.log("\n--- Seeding Roles ---");

  const roleConfigs = Object.values(DEFAULT_ROLES);
  let created = 0;
  let updated = 0;
  let skipped = 0;

  for (const roleConfig of roleConfigs) {
    const existingRole = await Role.findOne({ name: roleConfig.name });

    if (existingRole) {
      // Update permissions if system role
      if (existingRole.isSystemRole) {
        const permissionsChanged =
          JSON.stringify(existingRole.permissions.sort()) !==
          JSON.stringify(roleConfig.permissions.sort());

        const descriptionChanged = existingRole.description !== roleConfig.description;
        const displayNameChanged = existingRole.displayName !== roleConfig.displayName;

        if (permissionsChanged || descriptionChanged || displayNameChanged) {
          existingRole.permissions = roleConfig.permissions;
          existingRole.description = roleConfig.description;
          existingRole.displayName = roleConfig.displayName || null;
          await existingRole.save();
          console.log(`Updated role: ${roleConfig.name}`);
          updated++;
          continue;
        }
      }

      console.log(`Role '${roleConfig.name}' already exists, skipping`);
      skipped++;
      continue;
    }

    await Role.create({
      name: roleConfig.name,
      description: roleConfig.description,
      displayName: roleConfig.displayName || null,
      isActive: roleConfig.isActive !== undefined ? roleConfig.isActive : true,
      permissions: roleConfig.permissions,
      isSystemRole: roleConfig.isSystemRole,
    });

    console.log(`Created role: ${roleConfig.name}`);
    created++;
  }

  console.log(`\nRoles seeding complete:`);
  console.log(`  Created: ${created}`);
  console.log(`  Updated: ${updated}`);
  console.log(`  Skipped: ${skipped}`);

  return { created, updated, skipped };
};

const run = async () => {
  console.log("Starting role seeding...\n");

  try {
    await connectDB();
    await seedRoles();
    console.log("\nRole seeding completed successfully!");
  } catch (error) {
    console.log(`Role seeding error: ${error.message}`);
    console.log(error.stack);
  } finally {
    await mongoose.disconnect();
    console.log("\nMongoDB disconnected");
    process.exit(0);
  }
};

run();
