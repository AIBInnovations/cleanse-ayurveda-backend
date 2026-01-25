/**
 * Database Cleanup Utility
 * Cleans safe collections for fresh testing
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
dotenv.config({ path: join(__dirname, '../../.env') });

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/cleanse-ayurveda';

// Collections to clean (SAFE to delete)
const SAFE_COLLECTIONS = [
  'products',
  'productvariants',
  'categories',
  'bundles',
  'bundleitems',
  'blogs',
  'blogcategories',
  'testimonials',
  'banners',
  'reels',
  'popups',
  'pages',
  'navigationmenus',
  'reviews',
  'carts',
  'cartitems',
  'orders',
  'orderitems',
  'inventory',
  'pricinghistories',
  'coupons',
  'invoices',
  'payments',
  'refunds',
  'returns'
];

// Collections to PRESERVE (DO NOT DELETE)
const PRESERVE_COLLECTIONS = [
  'users',
  'admins',
  'sessions',
  'refreshtokens',
  'otps'
];

async function cleanDatabase() {
  try {
    console.log('🗑️  Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✓ Connected to MongoDB\n');

    const db = mongoose.connection.db;
    const collections = await db.listCollections().toArray();

    console.log('📋 Available collections:');
    collections.forEach(col => {
      const isPreserved = PRESERVE_COLLECTIONS.includes(col.name);
      const status = isPreserved ? '🔒 PRESERVED' : '🗑️  Will clean';
      console.log(`   ${status}: ${col.name}`);
    });

    console.log('\n🧹 Cleaning safe collections...\n');

    let cleanedCount = 0;
    let totalDocsDeleted = 0;

    for (const collectionName of SAFE_COLLECTIONS) {
      try {
        const collection = db.collection(collectionName);
        const count = await collection.countDocuments();

        if (count > 0) {
          await collection.deleteMany({});
          console.log(`  ✓ Cleaned ${collectionName}: ${count} documents deleted`);
          cleanedCount++;
          totalDocsDeleted += count;
        } else {
          console.log(`  ○ ${collectionName}: already empty`);
        }
      } catch (error) {
        // Collection doesn't exist, skip
        console.log(`  ○ ${collectionName}: doesn't exist`);
      }
    }

    console.log(`\n✅ Database cleanup complete!`);
    console.log(`   Collections cleaned: ${cleanedCount}`);
    console.log(`   Total documents deleted: ${totalDocsDeleted}`);
    console.log(`   Preserved collections: ${PRESERVE_COLLECTIONS.join(', ')}\n`);

  } catch (error) {
    console.error('❌ Error cleaning database:', error.message);
    throw error;
  } finally {
    await mongoose.disconnect();
    console.log('✓ Disconnected from MongoDB\n');
  }
}

// Run cleanup
cleanDatabase()
  .then(() => {
    console.log('🎉 Database ready for fresh testing!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Failed to clean database:', error);
    process.exit(1);
  });
