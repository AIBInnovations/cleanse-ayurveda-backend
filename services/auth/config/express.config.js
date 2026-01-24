import express from "express";
import cors from "cors";
import indexRoutes from "../index.route.js";
import {
  errorHandler,
  notFoundHandler,
  requestLogger,
} from "@shared/error-handler";

const createApp = () => {
  const app = express();

  // Middleware
  app.use(cors());
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // Request logging
  app.use(requestLogger);

  console.log("> Middleware configured");

  // Routes
  app.use("/api", indexRoutes);
  console.log("> Routes initialized");

  // 404 handler
  app.use(notFoundHandler);

  // Global error handler
  app.use(errorHandler);

  return app;
};

export default createApp;
