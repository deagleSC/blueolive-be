import { OAuth2Client } from "google-auth-library";
import { User, IUserDocument } from "../models/user.model";
import { jwtService } from "./jwt.service";
import { AuthResponse, SignupRequest, LoginRequest } from "../types";
import { logger } from "../../../shared/utils/logger";

let googleClient: OAuth2Client;

function getGoogleClient(): OAuth2Client {
  if (!googleClient) {
    const clientId = process.env.GOOGLE_CLIENT_ID;
    if (!clientId) {
      throw new Error("GOOGLE_CLIENT_ID environment variable is not set");
    }
    googleClient = new OAuth2Client(clientId);
  }
  return googleClient;
}

function formatAuthResponse(user: IUserDocument): AuthResponse {
  const tokens = jwtService.generateTokens({
    userId: user._id!.toString(),
    email: user.email,
  });

  return {
    user: {
      id: user._id!.toString(),
      email: user.email,
      name: user.name,
      picture: user.picture,
    },
    tokens,
  };
}

export async function signup(data: SignupRequest): Promise<AuthResponse> {
  const { email, password, name } = data;

  // Check if user exists
  const existingUser = await User.findOne({ email });
  if (existingUser) {
    throw new Error("User with this email already exists");
  }

  // Create user
  const user = await User.create({
    email,
    password,
    name,
    provider: "email",
  });

  logger.info(`User signed up: ${email}`);
  return formatAuthResponse(user);
}

export async function login(data: LoginRequest): Promise<AuthResponse> {
  const { email, password } = data;

  // Find user with password
  const user = await User.findOne({ email }).select("+password");
  if (!user) {
    throw new Error("Invalid email or password");
  }

  if (user.provider !== "email") {
    throw new Error(`Please sign in with ${user.provider}`);
  }

  // Check password
  const isMatch = await user.comparePassword(password);
  if (!isMatch) {
    throw new Error("Invalid email or password");
  }

  logger.info(`User logged in: ${email}`);
  return formatAuthResponse(user);
}

export async function googleAuth(credential: string): Promise<AuthResponse> {
  const client = getGoogleClient();

  // Verify Google token
  const ticket = await client.verifyIdToken({
    idToken: credential,
    audience: process.env.GOOGLE_CLIENT_ID,
  });

  const payload = ticket.getPayload();
  if (!payload || !payload.email) {
    throw new Error("Invalid Google token");
  }

  const { email, name, picture, sub: googleId } = payload;

  // Find or create user
  let user = await User.findOne({ email });

  if (user) {
    // Update Google info if needed
    if (user.provider === "email") {
      // User exists with email provider, link Google account
      user.provider_id = googleId;
      user.picture = picture;
      await user.save();
    }
  } else {
    // Create new user
    user = await User.create({
      email,
      name: name || email.split("@")[0],
      picture,
      provider: "google",
      provider_id: googleId,
    });
    logger.info(`New Google user created: ${email}`);
  }

  logger.info(`Google auth successful: ${email}`);
  return formatAuthResponse(user);
}

export async function refreshTokens(
  refreshToken: string,
): Promise<AuthResponse> {
  const payload = jwtService.verifyRefreshToken(refreshToken);

  const user = await User.findById(payload.userId);
  if (!user) {
    throw new Error("User not found");
  }

  return formatAuthResponse(user);
}

export async function getUserById(
  userId: string,
): Promise<IUserDocument | null> {
  return User.findById(userId);
}

export async function updateProfile(
  userId: string,
  data: { name?: string; picture?: string },
): Promise<IUserDocument> {
  const user = await User.findById(userId);
  if (!user) {
    throw new Error("User not found");
  }

  // Update only allowed fields (name and picture)
  if (data.name !== undefined) {
    user.name = data.name.trim();
  }
  if (data.picture !== undefined) {
    // Allow clearing picture by setting empty string
    user.picture = data.picture === "" ? undefined : data.picture;
  }

  await user.save();
  logger.info(`User profile updated: ${user.email}`);
  return user;
}

export const authService = {
  signup,
  login,
  googleAuth,
  refreshTokens,
  getUserById,
  updateProfile,
};
