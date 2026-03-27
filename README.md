# XhessMaster

A modern full-stack chess application built with React, TypeScript, and Vite. Play chess locally, against AI, online multiplayer, solve puzzles, and analyze games with Stockfish engine integration.

## Features

- **Multiple Game Modes**: Local play, AI opponents, online multiplayer, puzzles, and analysis board
- **Stockfish Analysis**: Real-time position evaluation and move suggestions
- **Online Multiplayer**: Play against others in real-time (powered by Vercel serverless functions)
- **Firebase Authentication**: Secure user accounts with email/password and Google login
- **Game History**: Save and review your games
- **Opening Trainer**: Learn popular chess openings
- **Responsive Design**: Works on desktop and mobile devices

## Quick Start

### Prerequisites
- Node.js 18+ and npm

### Installation

```bash
npm install
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
```

### Development

```bash
npm run dev
```

### Build for Production

```bash
npm run build
```

## Deploy to Vercel (Full-Stack)

This app is optimized for **Vercel's free tier** with both frontend and backend (serverless API) included!

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone)

### One-Click Deployment

1. Click the "Deploy with Vercel" button above
2. Connect your GitHub account
3. Add environment variables (Firebase config)
4. Deploy! 🚀

### Manual Deployment

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel

# Add environment variables in Vercel dashboard
# Then deploy to production
vercel --prod
```

### Environment Variables on Vercel

Add these in your Vercel project settings → Environment Variables:
- `VITE_FIREBASE_API_KEY`
- `VITE_FIREBASE_AUTH_DOMAIN`
- `VITE_FIREBASE_PROJECT_ID`
- `VITE_FIREBASE_STORAGE_BUCKET`
- `VITE_FIREBASE_MESSAGING_SENDER_ID`
- `VITE_FIREBASE_APP_ID`

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

### Backend (Serverless)
- Vercel Serverless Functions (`/api` directory)
- REST API with polling for real-time updates
- No Socket.IO needed - works perfectly on Vercel free tier!

### Online Multiplayer
The app uses a REST API + polling approach instead of WebSockets, making it perfect for Vercel's serverless architecture. Game state is managed in-memory on serverless functions.

## Tech Stack

- **Frontend**: React 19, TypeScript, Vite
- **Backend**: Vercel Serverless Functions (Node.js)
- **Chess Logic**: chess.js
- **Chess UI**: react-chessboard
- **Engine**: Stockfish.js
- **Auth & Database**: Firebase
- **Styling**: CSS with custom properties
- **Deployment**: Vercel (free tier)

## License

MIT