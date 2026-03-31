# Badminton Tournament Manager

A production-quality tournament management and live scoring application for men's doubles badminton.

## Features

- Tournament Management: Create and manage tournaments with N teams
- Team & Player Setup: Add teams with 2 main players + optional substitutes
- Live Scoring: Real-time match scoring with player attribution
- Undo Support: Event-based scoring with full undo capability
- Leaderboard: Auto-updating standings with Tournament Efficiency Score
- Mobile-Friendly: Responsive design for scoring on any device
- Offline-First: Works offline with IndexedDB, syncs when online
- Viewer Mode: Read-only access for spectators

## Tech Stack

- Frontend: Next.js 14 (App Router) + JavaScript
- Styling: Tailwind CSS + shadcn/ui components
- State Management: Zustand
- Database: MongoDB Atlas with Mongoose
- Offline Storage: IndexedDB via Dexie.js

## Getting Started

### Prerequisites

- Node.js 18+ installed
- MongoDB Atlas account (free tier works)

### Installation

1. Run the setup scripts to create all source files:
   node create_source_files.js
   node create_source_files_part2.js
   node create_source_files_part3.js

2. Install dependencies:
   npm install

3. Create .env.local with your MongoDB connection string:
   MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/badminton-tournament

4. Run the development server:
   npm run dev

5. Open http://localhost:3000

## Usage Guide

### Admin Mode

1. Click "Enter as Admin" on the landing page
2. Create a new tournament with teams and players
3. Generate fixtures (round-robin)
4. Start matches and score live
5. View auto-updating standings

### Scoring a Match

1. Navigate to a match and click "Start"
2. Use team +/- buttons for team-only scoring
3. Use player +/- buttons to credit points (also updates team score)
4. Click "Undo" to reverse the last action
5. Click "End Match" when done

### Viewer Mode

1. Click "Enter as Viewer" on the landing page
2. Browse active tournaments
3. View standings, matches, and players (read-only)

## Tournament Efficiency Score (TES)

The TES is used for tie-breaking in standings:

Match Efficiency = (Points For - Points Against) / Duration in Minutes
TES = Sum of Match Efficiency across all matches

This rewards:
- Winning by larger margins
- Winning in shorter time
- Consistent performance

### Ranking Priority

1. League Points (Win = 2, Loss = 0)
2. Tournament Efficiency Score
3. Head-to-Head Result
4. Point Difference
5. Points For

## Deployment

### Vercel (Recommended)

1. Push code to GitHub
2. Import project in Vercel
3. Add MONGODB_URI environment variable
4. Deploy

## License

MIT
