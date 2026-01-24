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

  app.use(cors());
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));
  app.use(requestLogger);

  console.log("> Middleware configured");

  app.use("/api", routes);

  console.log("> Routes initialized");

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
