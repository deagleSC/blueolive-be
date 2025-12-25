import { Application } from "express";
import swaggerJsdoc from "swagger-jsdoc";
import swaggerUi from "swagger-ui-express";
import path from "path";
import { logger } from "../shared/utils/logger";
import fs from "fs";

// Get server URLs
const getServers = () => {
  const servers = [];

  // Production server
  if (process.env.GCP_CLOUD_RUN_URL) {
    servers.push({
      url: process.env.GCP_CLOUD_RUN_URL,
      description: "Production server",
    });
  }

  // Development server (only in dev mode)
  if (process.env.NODE_ENV !== "production") {
    servers.push({
      url: `http://localhost:${process.env.PORT || 8000}`,
      description: "Development server",
    });
  }

  // Default to production URL if no servers added
  if (servers.length === 0) {
    servers.push({
      url: "https://chessvine-api-881017844394.asia-south1.run.app",
      description: "Production server",
    });
  }

  return servers;
};

// Determine API file paths based on environment
const getApiPaths = (): string[] => {
  // Use process.cwd() to get the app root directory
  // In production: /app (where src/ and dist/ are located)
  // In development: project root (where src/ is located)
  const appRoot = process.cwd();
  const srcPath = path.join(appRoot, "src");

  const paths = [
    path.join(srcPath, "index.ts"),
    path.join(srcPath, "modules/**/routes/*.ts"),
    path.join(srcPath, "modules/**/controllers/*.ts"),
  ];

  // Log paths for debugging (only in development)
  if (process.env.NODE_ENV !== "production") {
    logger.info("Swagger API paths:", paths);
    paths.forEach((p) => {
      if (fs.existsSync(p.replace(/\*\*/g, "").split("*")[0])) {
        logger.debug(`Swagger path exists: ${p}`);
      } else {
        logger.warn(`Swagger path may not exist: ${p}`);
      }
    });
  }

  return paths;
};

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "Chessvine API",
      version: "1.0.0",
      description: "Chess analysis and preparation API",
    },
    servers: getServers(),
    components: {
      securitySchemes: {
        bearerAuth: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "JWT",
        },
      },
    },
  },
  apis: getApiPaths(),
};

let specs: any;
try {
  specs = swaggerJsdoc(options);

  // Log spec info for debugging
  if (process.env.NODE_ENV !== "production") {
    const pathsCount = Object.keys(specs.paths || {}).length;
    logger.info(`Swagger spec generated with ${pathsCount} paths`);
  }
} catch (error) {
  logger.error("Failed to generate Swagger spec:", error);
  // Create minimal spec to prevent crash
  specs = {
    openapi: "3.0.0",
    info: {
      title: "Chessvine API",
      version: "1.0.0",
      description: "Chess analysis and preparation API",
    },
    paths: {},
  };
}

export const setupSwagger = (app: Application): void => {
  app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(specs));
};
