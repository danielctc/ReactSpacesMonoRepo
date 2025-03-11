# Configuration Keys Reference Guide

## Environment Files Setup

### 1. Root `.env`
```
VITE_FIREBASE_API_KEY=AIzaSyCaxoNKRIMaXhotGzdAjXc5gkARoqtS3bU
VITE_FIREBASE_AUTH_DOMAIN=disruptive-metaverse.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=disruptive-metaverse
VITE_FIREBASE_STORAGE_BUCKET=disruptive-metaverse.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=294433070603
VITE_FIREBASE_APP_ID=1:294433070603:web:136cddd196eea9614fb10e
```

### 2. `/packages/webgl/.env`
```
VITE_AGORA_APP_ID=your-agora-app-id
VITE_FIREBASE_API_KEY=AIzaSyCaxoNKRIMaXhotGzdAjXc5gkARoqtS3bU
VITE_FIREBASE_AUTH_DOMAIN=disruptive-metaverse.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=disruptive-metaverse
VITE_FIREBASE_STORAGE_BUCKET=disruptive-metaverse.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=294433070603
VITE_FIREBASE_APP_ID=1:294433070603:web:136cddd196eea9614fb10e
```

### 3. `/packages/shared/.env`
```
VITE_FIREBASE_API_KEY=AIzaSyCaxoNKRIMaXhotGzdAjXc5gkARoqtS3bU
VITE_FIREBASE_AUTH_DOMAIN=disruptive-metaverse.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=disruptive-metaverse
VITE_FIREBASE_STORAGE_BUCKET=disruptive-metaverse.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=294433070603
VITE_FIREBASE_APP_ID=1:294433070603:web:136cddd196eea9614fb10e
```

### 4. `/packages/testing/.env`
```
VITE_AGORA_APP_ID=your-agora-app-id
```

## Why Firebase Config Is Duplicated

Firebase config is duplicated in multiple .env files because each package is built separately with Vite, and each build process only has access to environment variables in its own directory.

## Quick Start Commands

- **Run development server**: `cd packages/webgl && npm run dev`
- **Build project**: `npm run build` (from root directory)
- **Deploy project**: `npm run deploy` (from root directory)

## Important Notes

- All `.env` files should be in `.gitignore`
- Firebase values are public but should have proper security rules
- Agora App ID should use token authentication for security
- Environment variables with `VITE_` prefix are exposed in client-side code