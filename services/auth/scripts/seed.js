import "@shared/env-loader";
import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import Role from "../models/role.model.js";
import Admin from "../models/admin.model.js";
import { DEFAULT_ROLES } from "../utils/constants.js";

/**
 * Database seeding script
 * Seeds default roles and initial super admin user
 * Run: npm run seed
 */

const connectDB = async () => {
  try {
    if (!process.env.MONGODB_URL) {
      console.log("Missing MongoDB connection string");
      process.exit(1);
    }

    await mongoose.connect(process.env.MONGODB_URL);
    console.log("MongoDB connected for seeding");
  } catch (error) {
    console.log(`MongoDB connection error: ${error.message}`);
    process.exit(1);
  }
};

const seedRoles = async () => {
  console.log("\n--- Seeding Roles ---");

  const roleConfigs = Object.values(DEFAULT_ROLES);
  let created = 0;
  let skipped = 0;

  for (const roleConfig of roleConfigs) {
    const existingRole = await Role.findOne({ name: roleConfig.name });

    if (existingRole) {
      console.log(`Role '${roleConfig.name}' already exists, skipping`);
      skipped++;
      continue;
    }

    await Role.create({
      name: roleConfig.name,
      description: roleConfig.description,
      permissions: roleConfig.permissions,
      isSystemRole: roleConfig.isSystemRole,
    });

    console.log(`Created role: ${roleConfig.name}`);
    created++;
  }

  console.log(`Roles seeding complete: ${created} created, ${skipped} skipped`);
  return { created, skipped };
};

const seedSuperAdmin = async () => {
  console.log("\n--- Seeding Super Admin ---");

  const email = process.env.INITIAL_ADMIN_EMAIL || "admin@cleanse.com";
  const password = process.env.INITIAL_ADMIN_PASSWORD || "ChangeMe123!";

  const existingAdmin = await Admin.findOne({ email });

  if (existingAdmin) {
    console.log(`Super admin '${email}' already exists, skipping`);
    return { created: false };
  }

  const superAdminRole = await Role.findOne({ name: "super_admin" });

  if (!superAdminRole) {
    console.log("Super admin role not found. Please seed roles first.");
    return { created: false, error: "Role not found" };
  }

  const passwordHash = await bcrypt.hash(password, 12);

  await Admin.create({
    email,
    passwordHash,
    firstName: "Super",
    lastName: "Admin",
    roleId: superAdminRole._id,
    status: "active",
    forcePasswordChange: true,
  });

  console.log(`Created super admin: ${email}`);
  console.log(`Initial password: ${password}`);
  console.log("IMPORTANT: Change this password after first login!");

  return { created: true };
};

const seed = async () => {
  console.log("Starting database seeding...\n");

  try {
    await connectDB();

    const rolesResult = await seedRoles();
    const adminResult = await seedSuperAdmin();

    console.log("\n--- Seeding Summary ---");
    console.log(`Roles: ${rolesResult.created} created, ${rolesResult.skipped} skipped`);
    console.log(`Super Admin: ${adminResult.created ? "created" : "skipped"}`);
    console.log("\nSeeding completed successfully!");
  } catch (error) {
    console.log(`Seeding error: ${error.message}`);
    console.log(error.stack);
  } finally {
    await mongoose.disconnect();
    console.log("\nMongoDB disconnected");
    process.exit(0);
  }
};

seed();
