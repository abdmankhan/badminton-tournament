# 🏸 Badminton Tournament Manager - Documentation

> A production-quality tournament management and live scoring application for men's doubles badminton.

**Live Demo:** [badminton-tournament-eight.vercel.app](https://badminton-tournament-eight.vercel.app)

---

## 📋 Table of Contents

1. [Overview](#overview)
2. [Features](#features)
3. [Tech Stack](#tech-stack)
4. [Getting Started](#getting-started)
5. [User Guide](#user-guide)
6. [API Reference](#api-reference)
7. [Future Enhancements](#future-enhancements)

---

## Overview

This application is a complete tournament management system designed for badminton doubles competitions. It supports:

- **Tournament Creation** - Create tournaments with customizable team/player setup
- **Match Generation** - Automatic round-robin fixture generation
- **Live Scoring** - Real-time match scoring with player credit tracking
- **Viewer Mode** - Live score updates for spectators with commentary
- **Statistics** - Player/team standings with multiple ranking criteria
- **Finals** - Best-of-3 set finals with championship point detection

---

## Features

### ✅ Currently Implemented

#### 1. Tournament Management
| Feature | Description |
|---------|-------------|
| Create Tournament | Name, format selection, team/player configuration |
| Tournament Formats | Round Robin + Final (MVP), extensible for knockout |
| Team Setup | Team name, photo upload, 2 main players per team |
| Player Profiles | Name, photo (ImgBB upload), substitute marking |
| Match Generation | Automatic N*(N-1)/2 league matches creation |

#### 2. Authentication System
| Feature | Description |
|---------|-------------|
| Admin Login | Username/password authentication |
| Session Management | 24-hour session expiry |
| Environment Config | Credentials via `NEXT_PUBLIC_ADMIN_USERNAME/PASSWORD` |
| Logout | Clear session and return to login |

#### 3. Live Scoring Engine
| Feature | Description |
|---------|-------------|
| Team Scoring | +/- buttons for team points |
| Player Credit | +/- buttons track individual player contributions |
| Event-Based | Every action stored as an event (undo-friendly) |
| Undo Support | Reverse last action anytime |
| Match Timer | Start/pause/stop with persistence |
| Auto-Sync | Events synced to database every 300ms |

#### 4. Badminton Rules Engine
| Feature | Description |
|---------|-------------|
| Standard Scoring | First to 21 points wins |
| Deuce Detection | At 20-20, need 2-point lead |
| 30-Point Cap | At 29-29, next point wins (official BWF rule) |
| Game States | Normal → Game Point → Deuce → Advantage → Won |
| Match Point | Special display at 29-29 |

#### 5. Multi-Set Finals
| Feature | Description |
|---------|-------------|
| Best-of-3 Sets | Configurable set count for finals |
| Set Transition | Animated screen between sets |
| Sets Won Display | Visual dots showing sets won |
| Championship Point | Special banner when match point in deciding set |
| Golden Theme | Finals have amber/gold visual styling |

#### 6. Viewer Mode
| Feature | Description |
|---------|-------------|
| Live Polling | Updates every 2.5 seconds |
| Score Display | Large, readable team and player scores |
| Commentary Feed | Auto-generated play-by-play with emojis |
| Game State Badges | Animated deuce/advantage/game point indicators |
| Mobile Optimized | Fits perfectly on phone screens |

#### 7. Standings & Statistics
| Feature | Description |
|---------|-------------|
| League Table | Auto-calculated from match results |
| Ranking Criteria | Points → Efficiency → Head-to-Head → Point Diff |
| Player Stats | Individual points credited per match |
| Top 2 to Finals | Automatic final generation when league completes |

#### 8. Offline Support
| Feature | Description |
|---------|-------------|
| IndexedDB | Local storage with Dexie.js |
| Sync Queue | Queued updates when back online |
| Graceful Degradation | Works without internet |

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| Framework | Next.js 14 (App Router) |
| Language | JavaScript (JSX) |
| Styling | Tailwind CSS |
| UI Components | shadcn/ui |
| State Management | Zustand |
| Database | MongoDB Atlas + Mongoose |
| Image Upload | ImgBB API |
| Offline Storage | Dexie.js (IndexedDB) |
| Deployment | Vercel |

---

## Getting Started

### Prerequisites
- Node.js 18+
- MongoDB Atlas account
- ImgBB API key (free)

### Installation

```bash
# Clone repository
git clone https://github.com/abdmankhan/badminton-tournament.git
cd badminton-tournament

# Install dependencies
npm install

# Configure environment
cp .env.example .env.local
# Edit .env.local with your credentials

# Run development server
npm run dev
```

### Environment Variables

```env
# Database
MONGODB_URI=mongodb+srv://...

# App URL
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Image Upload
IMGBB_API_KEY=your_imgbb_api_key

# Admin Authentication
NEXT_PUBLIC_ADMIN_USERNAME=admin
NEXT_PUBLIC_ADMIN_PASSWORD=your_secure_password
```

---

## User Guide

### Admin Workflow

1. **Login** - Enter admin credentials
2. **Create Tournament** - Set name, teams, players
3. **Generate Fixtures** - Create all league matches
4. **Score Matches** - Start timer, click +/- for points
5. **Complete League** - Final auto-generates with top 2 teams
6. **Play Final** - Best-of-3 sets with special UI

### Scoring Actions

| Action | Effect |
|--------|--------|
| Player + | Player credit +1, Team score +1 |
| Player - | Player credit -1, Team score -1 |
| Team + | Team score +1 only |
| Team - | Team score -1 only |
| Undo | Reverses last action |

### Viewer Mode

1. Open viewer URL: `/viewer/tournaments/{id}`
2. See live matches automatically
3. Scores update every 2.5 seconds
4. Commentary feed shows play-by-play

---

## API Reference

### Tournaments
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/tournaments` | GET | List all tournaments |
| `/api/tournaments` | POST | Create tournament |
| `/api/tournaments/[id]` | GET | Get tournament details |
| `/api/tournaments/[id]/generate-fixtures` | POST | Generate matches |
| `/api/tournaments/[id]/standings` | GET | Get standings |

### Matches
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/matches/[id]` | GET | Get match with teams |
| `/api/matches/[id]` | PUT | Update match (scores/status) |

### Upload
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/upload` | POST | Upload image to ImgBB |

---

## Future Enhancements

Based on tournament management best practices and user needs, here are recommended features to add:

### 🔥 High Priority

#### 1. Real-Time WebSocket Updates
Replace polling with WebSocket/Server-Sent Events for instant viewer updates. Options:
- Pusher (free tier available)
- Socket.io with custom server
- Vercel's experimental real-time features

#### 2. Match History & Replay
- Store complete event timeline
- Replay matches point-by-point
- Export match statistics

#### 3. Player Leaderboard Dashboard
- "Man of the Tournament" calculation
- Points per match average
- Win contribution percentage
- Match participation stats

### 📊 Medium Priority

#### 4. Advanced Tournament Formats
- Knockout/Elimination brackets
- Swiss-system pairing
- Double elimination
- Group stage + playoffs

#### 5. QR Code Sharing
- Generate QR codes for:
  - Viewer mode access
  - Tournament details
  - Player profiles

#### 6. Push Notifications
- Match starting soon
- Score updates
- Tournament completion
- Use Web Push API

#### 7. Match Scheduling
- Date/time assignment for matches
- Calendar view
- Reminder notifications

### 🎨 UI/UX Improvements

#### 8. Dark/Light Theme Toggle
- User preference persistence
- System theme detection
- Custom theme colors

#### 9. Sound Effects
- Point scored sound
- Deuce/Advantage alerts
- Match won celebration

#### 10. Accessibility
- Screen reader support
- Keyboard navigation
- High contrast mode
- Font size controls

### 📈 Analytics & Insights

#### 11. Tournament Analytics Dashboard
- Match duration averages
- Point distribution graphs
- Player performance trends
- Team comparison charts

#### 12. Export Capabilities
- PDF tournament reports
- CSV statistics export
- Share to social media
- Certificate generation

### 🔐 Security & Multi-User

#### 13. Role-Based Access
- Super Admin (all tournaments)
- Tournament Admin (single tournament)
- Scorer (can only score)
- Viewer (read-only)

#### 14. OAuth Integration
- Google login
- GitHub login
- Email/password registration

### 🌐 Localization

#### 15. Multi-Language Support
- English, Hindi, Spanish, etc.
- RTL language support
- Localized number formats

### 📱 Native Features

#### 16. PWA Enhancement
- Install as app
- Offline-first architecture
- Background sync
- Add to home screen prompt

#### 17. Mobile App
- React Native version
- Native notifications
- Camera integration for photos

---

## Architecture Decisions

### Why Event-Based Scoring?
- **Undo Support**: Simply mark events as undone
- **Audit Trail**: Complete history of every point
- **Offline Sync**: Events queue for later sync
- **Real-Time**: Events stream to viewers

### Why Session Storage for Auth?
- **MVP Simplicity**: No database user table needed
- **Quick Setup**: Environment variables only
- **Security**: HTTP-only wasn't needed for MVP
- **Future**: Easy to migrate to NextAuth/Clerk

### Why ImgBB for Images?
- **Free Tier**: Generous limits
- **Simple API**: Base64 upload, URL response
- **CDN**: Fast global delivery
- **No Server Storage**: Keeps deployment simple

---

## Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing`)
5. Open Pull Request

---

## License

MIT License - feel free to use for your tournaments!

---

**Built with ❤️ for badminton enthusiasts**
