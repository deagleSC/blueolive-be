export const config = {
  nodeEnv: process.env.NODE_ENV || "development",
  port: parseInt(process.env.PORT || "8000", 10),
  mongodb: {
    uri: process.env.MONGODB_URI || "mongodb://localhost:27017/chessvine",
  },
  jwt: {
    secret: process.env.JWT_SECRET || "default-secret-change-me",
    expiresIn: process.env.JWT_EXPIRES_IN || "7d",
  },
  gcp: {
    projectId: process.env.GCP_PROJECT_ID || "",
    storageBucket: process.env.GCP_STORAGE_BUCKET || "",
  },
};
