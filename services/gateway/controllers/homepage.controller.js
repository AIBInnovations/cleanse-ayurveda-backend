import { sendResponse } from "@shared/utils";
import { HTTP_STATUS } from "../utils/constants.js";
import { fetchHomepageData } from "../services/homepage-aggregation.service.js";

/**
 * GET /api/homepage
 * Aggregates homepage data from CMS and Catalog services
 */
export const getHomepage = async (req, res) => {
  console.log(
    JSON.stringify({
      timestamp: new Date().toISOString(),
      correlationId: req.correlationId,
      event: "HOMEPAGE_REQUEST",
      method: req.method,
      path: req.path,
    })
  );

  try {
    const startTime = Date.now();

    // Fetch aggregated homepage data
    const homepageData = await fetchHomepageData();

    const duration = Date.now() - startTime;

    console.log(
      JSON.stringify({
        timestamp: new Date().toISOString(),
        correlationId: req.correlationId,
        event: "HOMEPAGE_RESPONSE",
        duration: `${duration}ms`,
        sectionsCount: homepageData.sections?.length || 0,
        hasError: !!homepageData.error,
      })
    );

    // Return data even if there's a partial error
    return sendResponse(
      res,
      HTTP_STATUS.OK,
      "Homepage data fetched successfully",
      homepageData,
      homepageData.error || null
    );
  } catch (error) {
    console.log(
      JSON.stringify({
        timestamp: new Date().toISOString(),
        correlationId: req.correlationId,
        event: "HOMEPAGE_ERROR",
        error: error.message,
        stack: error.stack,
      })
    );

    return sendResponse(
      res,
      HTTP_STATUS.INTERNAL_SERVER_ERROR,
      "Failed to fetch homepage data",
      null,
      error.message
    );
  }
};

export default {
  getHomepage,
};
