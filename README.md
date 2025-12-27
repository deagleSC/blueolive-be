# Chessvine API

A modular monolith backend for chess game analysis and preparation. Built with Node.js, Express, TypeScript, MongoDB, and Google Cloud Platform. Uses Gemini AI for intelligent chess game analysis with player-specific recommendations.

## 🎯 Overview

Chessvine API provides a complete backend for analyzing chess games in PGN format. It supports:

- **Bulk PGN Analysis**: Upload multiple games and get AI-powered insights
- **Player-Specific Recommendations**: Analysis tailored to the player's perspective (white/black)
- **Chess Puzzles**: Automatically generated practice puzzles from game analyses
- **Profile Management**: Update profile information and upload profile pictures
- **Asynchronous Processing**: Cloud Tasks + Cloud Run for scalable job processing
- **Authentication**: JWT-based auth with email/password and Google OAuth
- **Guest Support**: Optional authentication for analysis endpoints

## 🏗️ Architecture

```
┌─────────┐     ┌─────────────┐     ┌─────────────────┐     ┌─────────────────┐
│ Client  │────▶│ Express API │────▶│ Cloud Tasks     │────▶│ Cloud Run       │
│         │     │ (chessvine) │     │ (Job Queue)     │     │ (Worker)        │
└─────────┘     └──────┬──────┘     └─────────────────┘     └────────┬────────┘
                       │                                             │
                       ▼                                             ▼
                 ┌──────────┐                                  ┌──────────┐
                 │ MongoDB  │◀─────────────────────────────────│ MongoDB  │
                 │ (write)  │                                  │ (update) │
                 └──────────┘                                  └──────────┘
```

### Flow

1. Client uploads PGN files → Stored in Google Cloud Storage
2. Client submits analysis request → Jobs enqueued in Cloud Tasks
3. Cloud Tasks triggers Cloud Run worker → Processes analysis with Gemini AI
4. Gemini generates analysis + 2 puzzles → Puzzles saved to Puzzle collection
5. Analysis result stored with puzzle references → Client polls for completion
6. Puzzles available via `/api/v1/puzzles` endpoint

## 🛠️ Tech Stack

- **Runtime**: Node.js 18+ with TypeScript
- **Framework**: Express.js
- **Database**: MongoDB (Mongoose ODM)
- **Authentication**: JWT (access + refresh tokens) + Google OAuth
- **Cloud Platform**: Google Cloud Platform
  - **Cloud Storage**: File uploads (PGN files, profile pictures)
  - **Cloud Tasks**: Asynchronous job queue
  - **Cloud Run**: Serverless worker execution
- **AI**: Vercel AI SDK with Gemini 2.0 Flash
- **Validation**: Zod schemas
- **Documentation**: Swagger/OpenAPI

## 📁 Project Structure

```
chessvine-be/
├── src/
│   ├── index.ts                 # Application entry point
│   ├── config/
│   │   ├── index.ts             # Environment configuration
│   │   ├── database.ts          # MongoDB connection
│   │   └── swagger.ts           # Swagger/OpenAPI setup
│   ├── modules/                 # Feature modules (modular monolith)
│   │   ├── auth/                # Authentication module
│   │   │   ├── controllers/    # Auth route handlers
│   │   │   ├── services/       # JWT, auth logic
│   │   │   ├── models/         # User model
│   │   │   ├── routes/         # Auth routes
│   │   │   ├── middleware/    # requireAuth, optionalAuth
│   │   │   └── validators/     # Request validation
│   │   └── analysis/           # Analysis module
│   │       ├── controllers/    # Analysis & puzzle route handlers
│   │       ├── services/       # PGN parsing, Gemini AI, GCS, puzzle service
│   │       ├── models/         # Analysis & Puzzle models
│   │       ├── routes/         # Analysis & puzzle routes
│   │       └── validators/     # Request validation
│   └── shared/
│       ├── middleware/
│       │   ├── validate.ts     # Request validation middleware
│       │   ├── errorHandler.ts # Global error handler
│       │   └── notFoundHandler.ts
│       ├── types/              # Shared TypeScript types
│       └── utils/
│           └── logger.ts       # Winston logger
├── package.json
├── tsconfig.json
├── Dockerfile                  # Cloud Run deployment
├── .env.example               # Environment variables template
└── env.yaml                   # GCP deployment env vars
```

## 🚀 Getting Started

### Prerequisites

- Node.js >= 18
- MongoDB (local or Atlas)
- Google Cloud Platform account
- Google OAuth credentials (for Google sign-in)

### Installation

```bash
# Clone and navigate
cd chessvine-be

# Install dependencies
npm install

# Create environment file
cp .env.example .env
# Edit .env with your values

# Set up GCP service account credentials
mkdir -p credentials
cp credentials/gcp-service-account.json.example credentials/gcp-service-account.json
# Download your service account JSON from GCP Console and replace the example file
```

### GCP Service Account Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Navigate to **IAM & Admin** > **Service Accounts**
3. Create a new service account or use an existing one
4. Download the JSON key file
5. Save it as `credentials/gcp-service-account.json`
6. Ensure the service account has the following roles:
   - **Storage Admin** (for GCS file uploads)
   - **Cloud Tasks Enqueuer** (for job queue)
   - **Service Account User** (for Cloud Run)

> **⚠️ Important**: Never commit `credentials/gcp-service-account.json` to version control. It's already in `.gitignore`.

### Running the Server

```bash
# Development (with hot reload)
npm run dev

# Production build
npm run build
npm start
```

### Available Scripts

| Script          | Description                      |
| --------------- | -------------------------------- |
| `npm run dev`   | Start dev server with hot reload |
| `npm run build` | Compile TypeScript to dist/      |
| `npm start`     | Run compiled production build    |
| `npm run lint`  | Run ESLint                       |
| `npm test`      | Run Jest tests                   |

## 📚 API Documentation

Swagger UI is available at `http://localhost:8000/api-docs` when the server is running.

### Authentication Endpoints

#### POST /api/v1/auth/signup

Register a new user with email and password.

**Request:**

```json
{
  "email": "user@example.com",
  "password": "Password123",
  "name": "John Doe"
}
```

**Response (201):**

```json
{
  "success": true,
  "data": {
    "user": {
      "id": "user_id",
      "email": "user@example.com",
      "name": "John Doe"
    },
    "tokens": {
      "accessToken": "jwt_access_token",
      "refreshToken": "jwt_refresh_token"
    }
  }
}
```

#### POST /api/v1/auth/login

Login with email and password.

**Request:**

```json
{
  "email": "user@example.com",
  "password": "Password123"
}
```

**Response (200):** Same as signup

#### POST /api/v1/auth/google

Authenticate with Google OAuth ID token.

**Request:**

```json
{
  "credential": "google_id_token"
}
```

**Response (200):** Same as signup (includes `picture` field)

#### POST /api/v1/auth/refresh

Refresh access token using refresh token.

**Request:**

```json
{
  "refreshToken": "jwt_refresh_token"
}
```

**Response (200):** New access and refresh tokens

#### GET /api/v1/auth/me

Get current user profile. **Requires authentication.**

**Headers:**

```
Authorization: Bearer <access_token>
```

**Response (200):**

```json
{
  "success": true,
  "data": {
    "id": "user_id",
    "email": "user@example.com",
    "name": "John Doe",
    "picture": "https://storage.googleapis.com/...",
    "provider": "email"
  }
}
```

> **Note:** Profile pictures are stored in GCS and returned as signed URLs for secure access.

#### PUT /api/v1/auth/profile

Update user profile (name and/or profile picture). **Requires authentication.**

**Headers:**

```
Authorization: Bearer <access_token>
```

**Request:**

```json
{
  "name": "John Doe Updated",
  "picture": "gs://bucket-name/profile-pictures/user123/abc.jpg"
}
```

**Response (200):**

```json
{
  "success": true,
  "data": {
    "id": "user_id",
    "email": "user@example.com",
    "name": "John Doe Updated",
    "picture": "https://storage.googleapis.com/...",
    "provider": "email"
  }
}
```

> **Note:** Email and password cannot be updated through this endpoint. Picture should be a GCS URL from the profile picture upload endpoint.

#### POST /api/v1/auth/profile-picture

Upload profile picture image file. **Requires authentication.**

**Headers:**

```
Authorization: Bearer <access_token>
```

**Request:** `multipart/form-data`

- `file`: Image file (max 5MB, supported formats: jpg, jpeg, png, gif, webp)

**Response (200):**

```json
{
  "success": true,
  "data": {
    "url": "gs://bucket-name/profile-pictures/user123/abc.jpg"
  }
}
```

> **Note:** Returns a GCS URL that should be used in the profile update endpoint. Files are stored with signed URLs for secure access.

### Profile Endpoints

#### PUT /api/v1/auth/profile

Update user profile (name and/or profile picture). Email and password cannot be changed.

#### POST /api/v1/auth/profile-picture

Upload profile picture image file. Returns GCS URL to use in profile update.

### Analysis Endpoints

All analysis endpoints support **optional authentication**. Guest users can use them without signing in.

#### POST /api/v1/upload

Upload PGN files to Google Cloud Storage.

**Request:** `multipart/form-data`

- `files`: Array of PGN files (max 20 files, 10MB each)

**Response (200):**

```json
{
  "success": true,
  "data": {
    "urls": [
      "gs://bucket-name/uploads/user123/file1.pgn",
      "gs://bucket-name/uploads/user123/file2.pgn"
    ]
  }
}
```

#### POST /api/v1/analysis/bulk

Submit GCS URLs for bulk PGN analysis.

**Request:**

```json
{
  "urls": ["gs://bucket-name/uploads/user123/file1.pgn"],
  "playerName": "Magnus Carlsen"
}
```

**Response (202):**

```json
{
  "success": true,
  "data": {
    "batch_id": "batch_abc123",
    "analysis_ids": ["ana_1", "ana_2", "ana_3"],
    "total_games": 3,
    "skipped_games": [
      {
        "white": "Player A",
        "black": "Player B",
        "reason": "Player \"Magnus Carlsen\" not found in this game"
      }
    ]
  }
}
```

> **Note:** Games where `playerName` doesn't match White or Black are skipped and reported in `skipped_games`.

#### GET /api/v1/analysis/status?ids=ana_1,ana_2

Check status of multiple analyses.

**Response (200):**

```json
{
  "success": true,
  "data": {
    "ana_1": { "status": "COMPLETED" },
    "ana_2": { "status": "PROCESSING" },
    "ana_3": { "status": "PENDING" }
  }
}
```

#### GET /api/v1/analysis/:id

Get single analysis result.

**Response (200):**

```json
{
  "success": true,
  "data": {
    "analysis_id": "ana_1",
    "status": "COMPLETED",
    "player_name": "Magnus Carlsen",
    "player_color": "white",
    "metadata": {
      "white": "Magnus Carlsen",
      "black": "Hikaru Nakamura",
      "result": "1-0"
    },
    "result": {
      "summary": "...",
      "phases": [...],
      "key_moments": [...],
      "recommendations": [...],
      "puzzles": ["puz_abc123", "puz_def456"]
    }
  }
}
```

> **Note:** `player_color` indicates which side the user played. Recommendations are personalized for this player. `puzzles` contains puzzle IDs (references to Puzzle collection) - use `/api/v1/puzzles` to get full puzzle details.

#### GET /api/v1/analysis/user

List all analyses for authenticated user (paginated). **Requires authentication.**

**Headers:**

```
Authorization: Bearer <access_token>
```

**Query Parameters:**

- `page` (optional, default: 1) - Page number
- `limit` (optional, default: 20) - Items per page

**Response (200):**

```json
{
  "success": true,
  "data": [
    {
      "analysis_id": "ana_1",
      "status": "COMPLETED",
      "player_name": "Magnus Carlsen",
      "player_color": "white",
      "metadata": { ... },
      "created_at": "2025-01-01T00:00:00Z"
    }
  ],
  "meta": {
    "page": 1,
    "limit": 20,
    "total": 45
  }
}
```

### Puzzle Endpoints

#### GET /api/v1/puzzles

Get all puzzles for the authenticated user. Puzzles are automatically generated from completed game analyses.

### System Endpoints

#### GET /health

Health check endpoint.

**Response (200):**

```json
{
  "status": "ok",
  "timestamp": "2025-01-01T00:00:00Z"
}
```

## 🔐 Authentication

The API supports both authenticated and guest users:

- **Authenticated users**: Provide JWT access token in `Authorization: Bearer <token>` header
- **Guest users**: Can use analysis endpoints without authentication (data stored with `user_id: "guest"`)

### Frontend Integration

The frontend implements intelligent route protection:
- Root path (`/`) redirects authenticated users to `/dashboard` and unauthenticated users to `/login`
- Auth pages (`/login`, `/signup`) are accessible to unauthenticated users
- Protected routes require authentication and redirect to login if needed
- Google OAuth integration with custom-styled button matching app design

### Token Structure

- **Access Token**: Short-lived (15 minutes), used for API requests
- **Refresh Token**: Long-lived (7 days), used to obtain new access tokens
- **Token Format**: JWT with `userId` and `email` in payload

### Guest User Support

Analysis endpoints (`/upload`, `/analysis/bulk`, `/analysis/status`, `/analysis/:id`) support optional authentication:

- If authenticated: User's analyses are stored with their user ID
- If not authenticated: User's analyses are stored with `user_id: "guest"`

The `/analysis/user` endpoint requires authentication and only returns analyses for the authenticated user.

### Puzzle Endpoints

#### GET /api/v1/puzzles

Get all puzzles for the authenticated user. **Requires authentication.**

**Headers:**

```
Authorization: Bearer <access_token>
```

**Response (200):**

```json
{
  "success": true,
  "data": [
    {
      "puzzle_id": "puz_abc123",
      "title": "Knight Fork Tactics",
      "description": "Practice identifying knight forks in similar positions",
      "fen": "rnbqkb1r/pppp1ppp/5n2/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R w KQkq - 4 4",
      "solution": "Nxe5",
      "hint": "Look for a fork opportunity",
      "difficulty": "medium",
      "theme": "Fork",
      "analysis_id": "ana_123",
      "created_at": "2025-01-01T00:00:00Z"
    }
  ]
}
```

> **Note:** Puzzles are automatically generated from completed game analyses. Each analysis generates 2 puzzles based on key moments and learning opportunities from the game.

### Google OAuth Setup

1. Create OAuth 2.0 credentials in [Google Cloud Console](https://console.cloud.google.com/apis/credentials)
2. Add authorized redirect URIs:
   - `http://localhost:3000/auth/callback` (development)
   - `https://your-frontend-domain.com/auth/callback` (production)
3. Set `GOOGLE_CLIENT_ID` in environment variables
4. Frontend sends Google ID token to `/api/v1/auth/google` endpoint

## 📊 Data Models

### User Model

```typescript
{
  _id: ObjectId,
  email: string,              // Unique, lowercase
  password?: string,           // Hashed with bcrypt (email provider only)
  name: string,
  picture?: string,            // Google OAuth profile picture
  provider: "email" | "google",
  provider_id?: string,        // Google user ID
  created_at: Date,
  updated_at: Date,
}
```

### Analysis Model

```typescript
{
  _id: ObjectId,
  analysis_id: string,         // UUID for client reference
  user_id: ObjectId | string,  // Owner (ObjectId for users, "guest" for guests)
  batch_id?: string,           // Batch identifier for bulk uploads
  status: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED',
  pgn: string,                 // Raw PGN data
  gcs_url?: string,            // Source GCS URL
  player_name: string,         // Name of player being analyzed
  player_color: 'white' | 'black', // Which side the player played
  metadata: {
    white: string,
    black: string,
    result: string,
    event?: string,
    date?: string,
    eco?: string,
    opening?: string,
  },
  result?: {                   // Gemini analysis output (player-specific)
    summary: string,
    phases: [...],
    key_moments: [...],
    recommendations: [...],   // Personalized for player_color
    puzzles: string[],        // Array of puzzle_ids (references to Puzzle collection)
  },
  error?: string,              // Error message if FAILED
  created_at: Date,
  updated_at: Date,
  completed_at?: Date,
}
```

### Puzzle Model

```typescript
{
  _id: ObjectId,
  puzzle_id: string,          // UUID for client reference
  user_id: ObjectId,          // Owner (authenticated users only)
  analysis_id?: string,       // Link to the analysis that generated this puzzle
  title: string,
  description: string,
  fen: string,                // FEN position string
  solution: string,            // Best move or sequence
  hint?: string,               // Optional hint
  difficulty: "easy" | "medium" | "hard",
  theme: string,               // Tactical theme (e.g., "Fork", "Pin", "Endgame Technique")
  created_at: Date,
  updated_at: Date,
}
```

> **Note:** Puzzles are automatically generated when an analysis completes. Each analysis generates 2 puzzles based on key moments and learning opportunities. Puzzles are only saved for authenticated users (not guest users).

## ⚙️ Environment Variables

| Variable                       | Description                  | Default          |
| ------------------------------ | ---------------------------- | ---------------- |
| `NODE_ENV`                     | Environment mode             | `development`    |
| `PORT`                         | Server port                  | `8000`           |
| `MONGODB_URI`                  | MongoDB connection string    | -                |
| `JWT_SECRET`                   | Secret for signing JWTs      | -                |
| `GOOGLE_CLIENT_ID`             | Google OAuth client ID       | -                |
| `GCP_PROJECT_ID`               | Google Cloud project ID      | -                |
| `GCP_STORAGE_BUCKET`           | GCS bucket name              | -                |
| `GCP_TASKS_QUEUE`              | Cloud Tasks queue name       | `analysis-queue` |
| `GCP_TASKS_LOCATION`           | Cloud Tasks location         | `asia-south1`    |
| `GCP_CLOUD_RUN_URL`            | Cloud Run worker service URL | -                |
| `GOOGLE_GENERATIVE_AI_API_KEY` | Gemini API key               | -                |
| `USE_MOCK_QUEUE`               | Use mock queue (local dev)   | `true`           |
| `LOG_LEVEL`                    | Winston log level            | `info`           |

## 🚢 Deployment

### Local Development

```bash
# Start dev server (mock queue - processes immediately)
USE_MOCK_QUEUE=true npm run dev
```

### Deploy to Cloud Run

```bash
# Build and deploy
gcloud run deploy chessvine-api \
  --source . \
  --region asia-south1 \
  --allow-unauthenticated \
  --env-vars-file env.yaml
```

### Production URLs

- **API**: `https://chessvine-api-881017844394.asia-south1.run.app`
- **Swagger Docs**: `https://chessvine-api-881017844394.asia-south1.run.app/api-docs`
- **Health Check**: `https://chessvine-api-881017844394.asia-south1.run.app/health`

## 🔄 Development Workflow

### Queue Configuration

- **Local Development**: Set `USE_MOCK_QUEUE=true` to process jobs immediately without Cloud Tasks
- **Production**: Set `USE_MOCK_QUEUE=false` to use Google Cloud Tasks

### Module Development

Each module follows this structure:

```
module/
├── controllers/     # Route handlers
├── services/        # Business logic
├── models/          # Mongoose schemas
├── routes/          # Express routes
├── types/           # Module-specific types
├── validators/      # Request validation (Zod)
└── index.ts         # Module exports
```

### Adding New Endpoints

1. Create controller function in `controllers/`
2. Add Zod validator in `validators/`
3. Define route in `routes/`
4. Add Swagger JSDoc comments to controller
5. Export route in module `index.ts`
6. Register route in main `src/index.ts`

## 📝 License

ISC © Supratik Chakraborty



