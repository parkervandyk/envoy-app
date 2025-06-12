# Envoy Visitor Duration App

Envoy integration that tracks visitor stay duration and notifies when visitors overstay their allotted time.

## Features

- Configure allowed stay duration (0-180 minutes)
- Automatically track visitor stay duration
- Notify when visitors overstay their allotted time
- Display stay duration summary in Envoy dashboard
- Status indicators for within limit or overstay

## Setup

1. Install dependencies:

```bash
npm install
```

2. Set required environment variables:

```bash
ENVOY_CLIENT_ID=your_client_id
ENVOY_CLIENT_SECRET=your_client_secret
```

3. Start the server:

```bash
npm start
```

For development with auto-reload:

```bash
npm run dev
```

## Endpoints

### Duration Configuration (`/duration`)

- Sets the allowed stay duration for visitors
- Accepts POST request with payload: `{ "allowedMinutes": number }`
- Validates input is between 0 and 180 minutes

### Visitor Sign-out (`/visitor-sign-out`)

- Handles visitor sign-out webhook events from Envoy
- Automatically calculates stay duration
- Compares against configured time limit
- Displays summary in Envoy dashboard with:
  - Status (Within Limit/Overstayed)
  - Allotted time
  - Actual duration
  - Time difference (under/over limit)

## Environment Variables

Required:

- `ENVOY_CLIENT_ID`: Your Envoy integration client ID
- `ENVOY_CLIENT_SECRET`: Your Envoy integration client secret

Optional:

- `PORT`: Server port (default: 3000)

## Currently Deployed

The app is currently deployed on Heroku at:
[https://envoy-app-0544a2ff5c8e.herokuapp.com/](https://envoy-app-0544a2ff5c8e.herokuapp.com/)