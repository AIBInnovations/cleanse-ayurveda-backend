import express from "express";

// Import module routes
import pageRoutes from "./pages/page.route.js";
import blogCategoryRoutes from "./blog-categories/blog-category.route.js";
import blogRoutes from "./blogs/blog.route.js";
import bannerRoutes from "./banners/banner.route.js";
import popupRoutes from "./popups/popup.route.js";
import navigationRoutes from "./navigation/navigation.route.js";
import faqRoutes from "./faqs/faq.route.js";
import mediaRoutes from "./media/media.route.js";
import testimonialRoutes from "./testimonials/testimonial.route.js";
import reelRoutes from "./reels/reel.route.js";
import homepageSectionRoutes from "./homepage-sections/homepage-section.route.js";
import homepageLayoutRoutes from "./homepage-layout/homepage-layout.route.js";
import newsletterRoutes from "./newsletters/newsletter-subscriber.route.js";

const consumerRouter = express.Router();
const adminRouter = express.Router();

// ============================================================
// CONSUMER ROUTES (Public)
// ============================================================

// Pages - /pages
consumerRouter.use("/pages", pageRoutes.consumer);

// Blog Categories - /blog-categories
consumerRouter.use("/blog-categories", blogCategoryRoutes.consumer);

// Blogs - /blogs
consumerRouter.use("/blogs", blogRoutes.consumer);

// Banners - /banners
consumerRouter.use("/banners", bannerRoutes.consumer);

// Popups - /popups
consumerRouter.use("/popups", popupRoutes.consumer);

// Navigation - /navigation
consumerRouter.use("/navigation", navigationRoutes.consumer);

// FAQs - /faqs
consumerRouter.use("/faqs", faqRoutes.consumer);

// Testimonials - /testimonials
consumerRouter.use("/testimonials", testimonialRoutes.consumer);

// Reels - /reels
consumerRouter.use("/reels", reelRoutes.consumer);

// Homepage Sections - /homepage-sections
consumerRouter.use("/homepage-sections", homepageSectionRoutes.consumer);

// Homepage Layout - /homepage-layout
consumerRouter.use("/homepage-layout", homepageLayoutRoutes.consumer);

// Newsletters - /newsletters
consumerRouter.use("/newsletters", newsletterRoutes.consumer);

// ============================================================
// ADMIN ROUTES (Protected)
// ============================================================

// Pages - /admin/pages
adminRouter.use("/pages", pageRoutes.admin);

// Blog Categories - /admin/blog-categories
adminRouter.use("/blog-categories", blogCategoryRoutes.admin);

// Blogs - /admin/blogs
adminRouter.use("/blogs", blogRoutes.admin);

// Banners - /admin/banners
adminRouter.use("/banners", bannerRoutes.admin);

// Popups - /admin/popups
adminRouter.use("/popups", popupRoutes.admin);

// Navigation - /admin/navigation
adminRouter.use("/navigation", navigationRoutes.admin);

// FAQs - /admin/faqs
adminRouter.use("/faqs", faqRoutes.admin);

// Media - /admin/media (admin-only)
adminRouter.use("/media", mediaRoutes.admin);

// Testimonials - /admin/testimonials
adminRouter.use("/testimonials", testimonialRoutes.admin);

// Reels - /admin/reels
adminRouter.use("/reels", reelRoutes.admin);

// Homepage Sections - /admin/homepage-sections
adminRouter.use("/homepage-sections", homepageSectionRoutes.admin);

// Homepage Layout - /admin/homepage-layout
adminRouter.use("/homepage-layout", homepageLayoutRoutes.admin);

// Newsletters - /admin/newsletters
adminRouter.use("/newsletters", newsletterRoutes.admin);

export default {
  consumer: consumerRouter,
  admin: adminRouter,
};
