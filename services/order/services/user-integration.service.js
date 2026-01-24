import { createHttpClient, handleServiceError, TimeoutConfig } from "./http-client.service.js";

const AUTH_SERVICE_URL = process.env.AUTH_SERVICE_URL || "http://localhost:3001";

// Create HTTP client for auth service
const httpClient = createHttpClient(AUTH_SERVICE_URL, TimeoutConfig.STANDARD, "auth");

/**
 * Get user by ID from auth service
 */
export async function getUserById(userId) {
  try {
    const response = await httpClient.get(`/api/profile/${userId}`);

    if (response.success && response.data) {
      return response.data;
    }

    return null;
  } catch (error) {
    console.error(`> Error fetching user ${userId}:`, error.message);
    return null;
  }
}

/**
 * Get user profile with email by ID
 */
export async function getUserProfile(userId) {
  return getUserById(userId);
}
