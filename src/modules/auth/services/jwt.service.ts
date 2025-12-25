import jwt, { TokenExpiredError, JsonWebTokenError } from "jsonwebtoken";
import { TokenPayload, AuthTokens } from "../types";

const ACCESS_TOKEN_EXPIRY = "15m";
const REFRESH_TOKEN_EXPIRY = "7d";

function getSecrets() {
  const jwtSecret = process.env.JWT_SECRET;
  if (!jwtSecret) {
    throw new Error("JWT_SECRET environment variable is not set");
  }
  return {
    accessSecret: jwtSecret,
    refreshSecret: `${jwtSecret}_refresh`,
  };
}

export function generateTokens(payload: TokenPayload): AuthTokens {
  const { accessSecret, refreshSecret } = getSecrets();

  const accessToken = jwt.sign(payload, accessSecret, {
    expiresIn: ACCESS_TOKEN_EXPIRY,
  });

  const refreshToken = jwt.sign(payload, refreshSecret, {
    expiresIn: REFRESH_TOKEN_EXPIRY,
  });

  return { accessToken, refreshToken };
}

export function verifyAccessToken(token: string): TokenPayload {
  const { accessSecret } = getSecrets();

  try {
    // jwt.verify() automatically checks the 'exp' claim if present
    // and throws TokenExpiredError if the token has expired
    const decoded = jwt.verify(token, accessSecret);
    return decoded as TokenPayload;
  } catch (error) {
    if (error instanceof TokenExpiredError) {
      throw new Error("Token expired");
    }
    if (error instanceof JsonWebTokenError) {
      throw new Error("Invalid token");
    }
    throw error;
  }
}

export function verifyRefreshToken(token: string): TokenPayload {
  const { refreshSecret } = getSecrets();

  try {
    // jwt.verify() automatically checks the 'exp' claim if present
    // and throws TokenExpiredError if the token has expired
    const decoded = jwt.verify(token, refreshSecret);
    return decoded as TokenPayload;
  } catch (error) {
    if (error instanceof TokenExpiredError) {
      throw new Error("Refresh token expired");
    }
    if (error instanceof JsonWebTokenError) {
      throw new Error("Invalid refresh token");
    }
    throw error;
  }
}

export const jwtService = {
  generateTokens,
  verifyAccessToken,
  verifyRefreshToken,
};
