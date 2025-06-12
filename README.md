# Envoy Visitor Duration App

An Envoy integration that tracks visitor stay duration and notifies when visitors overstay their allotted time.

## Features

- Configure allowed stay duration (0-180 minutes)
- Automatically track visitor stay duration
- Notify when visitors overstay their allotted time
- No action on visitor sign-in
- Message on visitor sign-out with stay duration information

## Setup

1. Install dependencies:
```bash
npm install
```

2. Start the server:
```bash
npm start
```

For development with auto-reload:
```bash
npm run dev
```

## Endpoints

### Install Endpoint (`/install`)
- Configures the allowed stay duration
- Accepts: `{ "allowedMinutes": number }`
- Validates input is between 0 and 180 minutes

### Webhook Endpoint (`/webhook`)
- Handles visitor events
- Processes sign-out events
- Calculates stay duration
- Returns message indicating if visitor overstayed

## Environment Variables

- `PORT`: Server port (default: 3000)

## Deployment

The app can be deployed to any Node.js hosting platform. For Heroku deployment:

```bash
heroku create
git push heroku main
```

## Testing

You can test the endpoints using curl:

```bash
# Test install endpoint
curl -X POST http://localhost:3000/install \
  -H "Content-Type: application/json" \
  -d '{"allowedMinutes": 120}'

# Test webhook endpoint
curl -X POST http://localhost:3000/webhook \
  -H "Content-Type: application/json" \
  -d '{
    "type": "visitor.sign_out",
    "data": {
      "visitor": {
        "sign_in_time": "2025-06-11T14:00:00Z",
        "sign_out_time": "2025-06-11T16:30:00Z"
      }
    }
  }'
```
