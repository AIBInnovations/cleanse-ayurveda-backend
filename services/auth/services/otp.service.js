import { firebaseAdmin } from "@shared/config";

/**
 * OTP Service
 * Handles Firebase ID token verification
 * Note: OTP sending, verification, and rate limiting is handled by Firebase Client SDK
 */

/**
 * Verify Firebase ID token
 * @param {string} idToken - Firebase ID token from client after OTP verification
 * @returns {Promise<object>} Decoded token with user info (uid, phone_number, etc.)
 */
export const verifyFirebaseIdToken = async (idToken) => {
  try {
    const decodedToken = await firebaseAdmin.auth().verifyIdToken(idToken);
    console.log(`Firebase ID token verified for UID: ${decodedToken.uid}`);
    return decodedToken;
  } catch (error) {
    console.log(`Firebase ID token verification failed: ${error.message}`);
    throw error;
  }
};

/**
 * Get user info from Firebase by UID
 * @param {string} uid - Firebase user UID
 * @returns {Promise<object>} Firebase user record
 */
export const getFirebaseUser = async (uid) => {
  try {
    const userRecord = await firebaseAdmin.auth().getUser(uid);
    console.log(`Firebase user fetched: ${userRecord.uid}`);
    return userRecord;
  } catch (error) {
    console.log(`Failed to get Firebase user: ${error.message}`);
    throw error;
  }
};

export default {
  verifyFirebaseIdToken,
  getFirebaseUser,
};
