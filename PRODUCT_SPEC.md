# Chessvine API - Product Specification

## 📋 Overview

Chessvine API is a chess game analysis platform that uses AI to provide personalized insights and recommendations for chess players. Players can upload their games in PGN format and receive detailed analysis including key moments, strategic themes, and improvement recommendations tailored to their playing style.

## 🎯 Product Vision

Empower chess players of all levels to improve their game through AI-powered analysis that understands their perspective and provides actionable, personalized recommendations.

## 👥 Target Users

1. **Competitive Players**: Tournament players who want to analyze their games and prepare for opponents
2. **Improving Players**: Players looking to identify weaknesses and improve their game
3. **Coaches**: Chess coaches analyzing student games
4. **Casual Players**: Players who want quick insights without deep technical knowledge

## ✨ Core Features

### 1. Game Upload & Analysis

**User Story**: As a chess player, I want to upload my games and get AI-powered analysis so I can understand my mistakes and improve.

**Features**:

- Upload multiple PGN files at once (up to 20 files, 10MB each)
- Automatic parsing of PGN files
- Support for multi-game PGN files (automatically split)
- Bulk analysis processing
- Asynchronous job processing with status tracking

**User Flow**:

1. User uploads PGN files via `/api/v1/upload`
2. System stores files in Google Cloud Storage
3. User submits analysis request with their player name via `/api/v1/analysis/bulk`
4. System enqueues analysis jobs
5. User polls for status via `/api/v1/analysis/status`
6. User retrieves completed analysis via `/api/v1/analysis/:id`

### 2. Player-Specific Analysis

**User Story**: As a chess player, I want analysis from my perspective (white or black) so the recommendations are relevant to me.

**Features**:

- Automatic player color detection (white/black)
- Player name matching in PGN metadata
- Personalized recommendations based on player's side
- Games where player not found are skipped with clear error messages

**Technical Details**:

- System matches provided `playerName` against PGN headers (White/Black)
- Determines which side the player played
- AI prompts are tailored to analyze from that player's perspective
- Recommendations focus on that player's moves and decisions

### 3. AI-Powered Insights

**User Story**: As a chess player, I want detailed insights about my games including key moments, strategic themes, and improvement areas.

**Features**:

- Game summary (opening, middlegame, endgame phases)
- Key moments identification (critical moves, mistakes, missed opportunities)
- Strategic themes analysis
- Personalized improvement recommendations
- Move-by-move evaluation highlights

**Analysis Output Structure**:

```json
{
  "summary": "Overall game summary",
  "phases": [
    {
      "name": "Opening",
      "moves": "1.e4 e5 2.Nf3...",
      "evaluation": "White achieved a slight advantage",
      "key_ideas": ["Control of center", "Development"]
    }
  ],
  "key_moments": [
    {
      "move_number": 15,
      "move": "Nxe5",
      "fen": "...",
      "evaluation": "Mistake: -2.5",
      "comment": "This move allows a tactical combination",
      "is_mistake": true
    }
  ],
  "recommendations": [
    "Work on tactical awareness in the middlegame",
    "Improve endgame technique with rook and pawn"
  ]
}
```

### 4. Authentication & User Management

**User Story**: As a user, I want to sign up and manage my account so my analyses are saved and accessible.

**Features**:

- Email/password registration and login
- Google OAuth sign-in
- JWT-based authentication (access + refresh tokens)
- User profile management
- Guest mode (no sign-up required for analysis)

**Authentication Options**:

1. **Email/Password**: Traditional signup with email verification
2. **Google OAuth**: One-click sign-in with Google account
3. **Guest Mode**: Use analysis features without account (data stored temporarily)

### 5. Analysis History & Management

**User Story**: As a registered user, I want to see all my past analyses so I can track my progress over time.

**Features**:

- View all analyses (paginated list)
- Filter by status (pending, processing, completed, failed)
- Access analysis details anytime
- Batch tracking (see all games from a single upload)

**User Flow**:

1. User authenticates
2. User calls `/api/v1/analysis/user` with pagination
3. System returns list of user's analyses
4. User can access any analysis by ID

### 6. Guest User Support

**User Story**: As a casual user, I want to try the analysis without creating an account.

**Features**:

- All analysis endpoints work without authentication
- Guest analyses stored with `user_id: "guest"`
- Guest users can still track their analyses via analysis IDs
- Seamless upgrade path (sign up to save analyses permanently)

**Limitations**:

- Guest users cannot use `/api/v1/analysis/user` endpoint
- Must track analysis IDs manually
- No persistent history across sessions

## 🔄 User Journeys

### Journey 1: First-Time User (Guest)

1. User lands on Chessvine landing page (branded with logo and tagline)
2. User is redirected to login page (if unauthenticated on `/`)
3. User can choose to sign up or continue as guest
4. User uploads PGN files (no sign-up required)
5. User submits analysis request with their name
6. User receives analysis IDs
7. User polls for completion status
8. User retrieves and reviews analysis
9. User decides to sign up to save analyses permanently

### Journey 2: Registered User

1. User lands on Chessvine landing page
2. User is redirected to dashboard (if authenticated on `/`)
3. User signs up (email/password or Google OAuth)
4. User receives JWT tokens
5. User uploads PGN files (authenticated)
6. User submits analysis request
7. User can view all analyses via `/api/v1/analysis/user`
8. User reviews analysis and recommendations
9. User uses insights to improve their game

### Journey 3: Bulk Tournament Analysis

1. User uploads multiple tournament games
2. User submits bulk analysis with their name
3. System processes all games asynchronously
4. User tracks progress via status endpoint
5. User reviews all completed analyses
6. User identifies patterns across games

## 📊 Data Models

### User

```typescript
{
  _id: ObjectId,
  email: string,              // Unique identifier
  password?: string,           // Hashed (bcrypt) - email provider only
  name: string,
  picture?: string,            // Profile picture (Google OAuth)
  provider: "email" | "google",
  provider_id?: string,        // Google user ID
  created_at: Date,
  updated_at: Date,
}
```

### Analysis

```typescript
{
  _id: ObjectId,
  analysis_id: string,         // Client-facing UUID
  user_id: ObjectId | string,  // Owner (ObjectId or "guest")
  batch_id?: string,           // Links games from same upload
  status: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED',
  pgn: string,                 // Raw PGN data
  gcs_url?: string,            // Source file location
  player_name: string,         // Player being analyzed
  player_color: 'white' | 'black', // Player's side
  metadata: {
    white: string,
    black: string,
    result: string,
    event?: string,
    date?: string,
    eco?: string,
    opening?: string,
  },
  result?: {                   // AI analysis output
    summary: string,
    phases: [...],
    key_moments: [...],
    recommendations: [...],
  },
  error?: string,              // Error message if failed
  created_at: Date,
  updated_at: Date,
  completed_at?: Date,
}
```

## 🔌 API Endpoints

### Authentication

| Method | Endpoint               | Description                    | Auth Required |
| ------ | ---------------------- | ------------------------------ | ------------- |
| POST   | `/api/v1/auth/signup`  | Register with email/password   | No            |
| POST   | `/api/v1/auth/login`   | Login with email/password      | No            |
| POST   | `/api/v1/auth/google`  | Authenticate with Google OAuth | No            |
| POST   | `/api/v1/auth/refresh` | Refresh access token           | No            |
| GET    | `/api/v1/auth/me`      | Get current user profile       | Yes           |

### Analysis

| Method | Endpoint                  | Description                  | Auth Required |
| ------ | ------------------------- | ---------------------------- | ------------- |
| POST   | `/api/v1/upload`          | Upload PGN files to GCS      | Optional      |
| POST   | `/api/v1/analysis/bulk`   | Submit bulk analysis request | Optional      |
| GET    | `/api/v1/analysis/status` | Check analysis status        | Optional      |
| GET    | `/api/v1/analysis/:id`    | Get single analysis result   | Optional      |
| GET    | `/api/v1/analysis/user`   | List user's analyses         | Yes           |

### System

| Method | Endpoint  | Description  | Auth Required |
| ------ | --------- | ------------ | ------------- |
| GET    | `/health` | Health check | No            |

## 🏗️ Technical Architecture

### System Components

1. **Express API Server**: Main API endpoint handling requests
2. **MongoDB**: Database for users and analyses
3. **Google Cloud Storage**: File storage for PGN files
4. **Google Cloud Tasks**: Job queue for asynchronous processing
5. **Cloud Run Worker**: Serverless worker processing analyses
6. **Gemini AI**: AI model for game analysis

### Processing Flow

```
1. Client → API: Upload PGN files
   ↓
2. API → GCS: Store files
   ↓
3. Client → API: Submit analysis request
   ↓
4. API → MongoDB: Create analysis records (PENDING)
   ↓
5. API → Cloud Tasks: Enqueue analysis jobs
   ↓
6. Cloud Tasks → Cloud Run: Trigger worker
   ↓
7. Worker → GCS: Download PGN file
   ↓
8. Worker → Gemini AI: Analyze game
   ↓
9. Worker → MongoDB: Update analysis (COMPLETED)
```

### Authentication Flow

```
Email/Password:
1. User → API: POST /auth/signup {email, password, name}
2. API → MongoDB: Create user (password hashed)
3. API → Client: Return JWT tokens

Google OAuth:
1. Frontend → Google: Get ID token
2. Client → API: POST /auth/google {credential}
3. API → Google: Verify ID token
4. API → MongoDB: Create/update user
5. API → Client: Return JWT tokens

Token Usage:
1. Client → API: Include "Authorization: Bearer <token>" header
2. API: Verify token, extract user info
3. API: Process request with user context
```

## 🎨 User Experience Considerations

### Branding & Design

- **Brand Identity**: Chessvine with green brand color and modern typography
- **Landing Page**: Branded landing page with logo and tagline "Checkmate your limits"
- **Auth Experience**: Clean, card-based authentication UI with consistent branding
- **Google Sign-In**: Custom-styled Google OAuth button matching app design system
- **Route Protection**: Intelligent redirects based on authentication status

### Error Handling

- **Clear Error Messages**: Users receive descriptive error messages
- **Validation Feedback**: Input validation errors are specific
- **Status Tracking**: Users can track job progress
- **Failed Jobs**: Failed analyses include error details

### Performance

- **Asynchronous Processing**: Long-running analyses don't block API
- **Status Polling**: Users can check progress without waiting
- **Bulk Operations**: Multiple games processed efficiently
- **Caching**: Analysis results stored for quick retrieval

### Accessibility

- **Guest Mode**: No barriers to entry
- **Simple API**: RESTful endpoints, easy to integrate
- **Clear Documentation**: Swagger UI for API exploration
- **Error Recovery**: Retry mechanisms for failed jobs
- **Responsive Design**: Mobile-friendly interface across all pages

## 📈 Success Metrics

### User Engagement

- Number of analyses processed
- Average games per user
- User retention rate
- Guest-to-registered conversion rate

### Technical Performance

- Average analysis processing time
- API response times
- Job queue throughput
- Error rates

### Quality Metrics

- Analysis completion rate
- User satisfaction with recommendations
- Accuracy of player detection
- AI response quality

## 🚀 Future Enhancements

### Phase 1: Core Features (Current)

- ✅ File upload and storage
- ✅ Bulk analysis processing
- ✅ Player-specific recommendations
- ✅ Authentication system
- ✅ Guest user support

### Phase 2: Enhanced Analysis

- ⏳ Opponent preparation (aggregate opponent patterns)
- ⏳ Opening repertoire analysis
- ⏳ Endgame technique assessment
- ⏳ Tactical pattern recognition
- ⏳ Position evaluation training

### Phase 3: Social & Collaboration

- ⏳ Share analyses with others
- ⏳ Coach-student collaboration
- ⏳ Analysis comments and discussions
- ⏳ Public game database

### Phase 4: Advanced Features

- ⏳ Video analysis integration
- ⏳ Live game analysis
- ⏳ Tournament preparation tools
- ⏳ Performance tracking over time
- ⏳ Custom analysis templates

## 🔒 Security & Privacy

### Data Security

- **Password Hashing**: Bcrypt with salt rounds
- **JWT Tokens**: Secure token-based authentication
- **HTTPS**: All API communication encrypted
- **Input Validation**: Zod schemas for all inputs
- **SQL Injection Prevention**: Mongoose ODM protection

### Privacy

- **User Data**: Users own their analyses
- **Guest Data**: Guest analyses isolated
- **No Data Sharing**: Analyses not shared without permission
- **GDPR Compliance**: User data can be deleted

### Access Control

- **Authentication Required**: Protected endpoints verify tokens
- **User Isolation**: Users can only access their own analyses
- **Guest Isolation**: Guest analyses separate from user data
- **Rate Limiting**: (Future) Prevent abuse

## 📝 API Rate Limits (Future)

- **Guest Users**: 10 analyses per hour
- **Registered Users**: 100 analyses per hour
- **File Upload**: 20 files per request, 10MB per file
- **Status Polling**: 60 requests per minute

## 🐛 Error Scenarios & Handling

### Common Errors

1. **Player Not Found**: Game skipped, reported in `skipped_games`
2. **Invalid PGN**: Error message returned, file rejected
3. **File Too Large**: 10MB limit enforced
4. **Invalid Token**: 401 Unauthorized response
5. **Analysis Failed**: Status set to FAILED, error message stored

### Retry Logic

- **Cloud Tasks**: Automatic retry on worker failure
- **AI Timeout**: Worker retries failed AI calls
- **Network Errors**: Transient errors retried automatically

## 📚 Documentation

- **API Documentation**: Swagger UI at `/api-docs`
- **README**: Developer setup and configuration
- **Product Spec**: This document
- **Code Comments**: Inline documentation in codebase

## 🎯 Product Goals

### Short-term (MVP)

- ✅ Core analysis functionality
- ✅ User authentication
- ✅ Guest user support
- ✅ Basic AI recommendations

### Medium-term

- Opponent preparation features
- Enhanced analysis depth
- Performance tracking
- Social features

### Long-term

- Advanced AI capabilities
- Mobile app integration
- Coaching platform
- Tournament management

---

**Version**: 1.0  
**Last Updated**: December 2025  
**Status**: MVP Complete
