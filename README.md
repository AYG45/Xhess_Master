# XhessMaster

A modern full-stack chess application with real-time multiplayer using Socket.IO. Play chess locally, against AI, online with friends or random opponents, solve puzzles, and analyze games with Stockfish engine integration.

## Features

- **Multiple Game Modes**: Local play, AI opponents, online multiplayer (matchmaking & private rooms), puzzles, and analysis board
- **Real-Time Multiplayer**: Socket.IO powered instant move updates, live timers, and disconnect handling
- **Stockfish Analysis**: Real-time position evaluation and move suggestions
- **Firebase Authentication**: Secure user accounts with email/password and Google login
- **Game Features**: Captured pieces tracking, move timers with increment, game history
- **Opening Trainer**: Learn popular chess openings
- **Responsive Design**: Works on desktop and mobile devices

## Quick Start

### Prerequisites
- Node.js 18+ and npm

### Installation

```bash
npm install
cd server && npm install
```

### Environment Setup

1. Copy `.env.example` to `.env`
2. Add your Firebase configuration:

```env
VITE_FIREBASE_API_KEY=your-api-key
VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your-project-id
VITE_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your-sender-id
VITE_FIREBASE_APP_ID=your-app-id
VITE_SOCKET_URL=http://localhost:3001
```

### Development

**Terminal 1 - Frontend:**
```bash
npm run dev
```

**Terminal 2 - Socket.IO Server:**
```bash
cd server
npm start
```

The app will be available at `http://localhost:5173`

### Build for Production

```bash
npm run build
```

## Deployment

### Frontend (Vercel)

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone)

1. Push your code to GitHub
2. Import project to Vercel
3. Add environment variables:
   - `VITE_FIREBASE_API_KEY`
   - `VITE_FIREBASE_AUTH_DOMAIN`
   - `VITE_FIREBASE_PROJECT_ID`
   - `VITE_FIREBASE_STORAGE_BUCKET`
   - `VITE_FIREBASE_MESSAGING_SENDER_ID`
   - `VITE_FIREBASE_APP_ID`
   - `VITE_SOCKET_URL` (your Socket.IO server URL)
4. Deploy! 🚀

### Socket.IO Server (Railway/Render)

**Option 1: Railway (Recommended)**

1. Go to [Railway](https://railway.app/)
2. Create new project → Deploy from GitHub
3. Select the `server` folder as root directory
4. Add environment variable: `CORS_ORIGIN=*` (or your frontend URL)
5. Railway will auto-detect Node.js and deploy
6. Copy the deployed URL and add it as `VITE_SOCKET_URL` in Vercel

**Option 2: Render**

1. Go to [Render](https://render.com/)
2. New Web Service → Connect your repository
3. Root Directory: `server`
4. Build Command: `npm install`
5. Start Command: `npm start`
6. Add environment variable: `CORS_ORIGIN=*`
7. Deploy and copy the URL to Vercel's `VITE_SOCKET_URL`

## Firebase Setup

1. Create a project at [Firebase Console](https://console.firebase.google.com/)
2. Enable Authentication (Email/Password and Google)
3. Enable Firestore Database
4. Copy your config to `.env` or Vercel environment variables

## Architecture

### Frontend
- React 19 with TypeScript
- Vite for blazing fast builds
- React Router for navigation
- Stockfish.js for chess engine
- Socket.IO client for real-time communication

### Backend
- Express.js HTTP server
- Socket.IO for WebSocket connections
- In-memory game state management
- Real-time timer system (1s intervals)
- Automatic matchmaking by time control

### Online Multiplayer Features
- **Matchmaking**: Automatic pairing with players of same time control
- **Private Rooms**: Create room codes to play with friends
- **Real-time Updates**: Instant move broadcasting, live timers
- **Captured Pieces**: Synced from FEN position on every update
- **Disconnect Handling**: Game ends when player leaves
- **Time Controls**: Support for increment (e.g., 3+2, 10+5)

## Tech Stack

- **Frontend**: React 19, TypeScript, Vite
- **Backend**: Node.js, Express, Socket.IO
- **Chess Logic**: chess.js
- **Chess UI**: react-chessboard
- **Engine**: Stockfish.js
- **Auth & Database**: Firebase
- **Styling**: CSS with custom properties
- **Deployment**: Vercel (frontend) + Railway/Render (backend)

## Project Structure

```
chess-app/
├── src/                    # Frontend React app
│   ├── components/         # React components
│   ├── services/          # Socket.IO client service
│   ├── contexts/          # React contexts (Auth)
│   └── config/            # Firebase config
├── server/                # Socket.IO backend
│   ├── server.js          # Main server file
│   └── package.json       # Server dependencies
├── public/                # Static assets
└── dist/                  # Production build
```

## License

MIT
