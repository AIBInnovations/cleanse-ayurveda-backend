import express from "express";
import cors from "cors";
import routes from "../index.route.js";
import {
  errorHandler,
  notFoundHandler,
  requestLogger,
} from "@shared/error-handler";

export default function createApp() {
  const app = express();

  // CORS
  app.use(cors());

  // Body parsing
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // Request logging
  app.use(requestLogger);

  console.log("> Middleware configured");

  // Routes
  app.use("/api", routes);
  console.log("> Routes initialized");

  // 404 handler
  app.use(notFoundHandler);

  // Global error handler
  app.use(errorHandler);

  return app;
}
