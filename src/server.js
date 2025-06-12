// Load environment variables
require('dotenv').config();

const express = require('express');
const { middleware, errorMiddleware } = require('@envoy/envoy-integrations-sdk');

// Verify environment variables
if (!process.env.ENVOY_CLIENT_ID || !process.env.ENVOY_CLIENT_SECRET) {
  console.error('Missing required environment variables ENVOY_CLIENT_ID and/or ENVOY_CLIENT_SECRET');
  process.exit(1);
}

const app = express();

// Add JSON parsing for all routes
app.use(express.json());

// Log all requests
app.use((req, res, next) => {
  console.log('Incoming request:', {
    method: req.method,
    path: req.path,
    body: req.body
  });
  next();
});

// Handle duration configuration from Envoy (no middleware needed)
app.post('/duration', (req, res) => {
  try {
    console.log('Duration setup payload:', req.body);

    // Just return the validation array directly
    if (!req.body?.config?.allowedMinutes || 
        !Number.isInteger(req.body.config.allowedMinutes) || 
        req.body.config.allowedMinutes < 0 || 
        req.body.config.allowedMinutes > 180) {
      console.log('Validation failed:', req.body?.config?.allowedMinutes);
      return res.send([{
        field: 'allowedMinutes',
        message: 'Must be a number between 0 and 180'
      }]);
    }

    // Return empty array for success
    console.log('Validation passed');
    return res.send([]);
  } catch (error) {
    console.error('Error in duration setup:', error);
    return res.status(500).send([{
      field: 'allowedMinutes',
      message: 'Internal server error: ' + error.message
    }]);
  }
});

// Add Envoy middleware only for webhook endpoint
app.use('/webhook', middleware({
  clientId: process.env.ENVOY_CLIENT_ID,
  clientSecret: process.env.ENVOY_CLIENT_SECRET,
  debug: true
}));

// Handle visitor sign-out webhook from Envoy
app.post('/webhook', async (req, res) => {
  try {
    console.log('Webhook payload:', JSON.stringify(req.body, null, 2));
    
    // Verify this is a sign-out event
    if (req.body.type !== 'visitor.sign_out') {
      return res.send({ message: 'Ignored non-sign-out event' });
    }

    // Get visitor data directly from the webhook payload structure
    const visitor = req.body.data?.visitor;
    if (!visitor?.attributes) {
      throw new Error('Missing visitor data or attributes');
    }

    // For testing locally, use a default allowed minutes
    const allowedMinutes = 20; // We can get this from config when running in Envoy

    const signInTime = new Date(visitor.attributes['sign-in-time']);
    const signOutTime = new Date(visitor.attributes['sign-out-time']);
    
    const stayDurationMinutes = Math.round(
      (signOutTime.getTime() - signInTime.getTime()) / (1000 * 60)
    );

    let message = `Visitor stayed ${stayDurationMinutes} minutes.`;
    
    if (stayDurationMinutes > allowedMinutes) {
      message += ` They overstayed the allotted time of ${allowedMinutes} minutes.`;
    } else {
      message += ' They left within the allotted time.';
    }

    // When testing locally, just return the message
    // In Envoy, the job.attach will happen automatically
    res.send({ message });
  } catch (error) {
    console.error('Error processing webhook:', error);
    res.status(400).send({ 
      error: 'Error processing visitor data: ' + error.message 
    });
  }
});

// Add error middleware
app.use(errorMiddleware());

// Handle uncaught errors
process.on('uncaughtException', (error) => {
  console.error('Uncaught exception:', error);
});

process.on('unhandledRejection', (error) => {
  console.error('Unhandled rejection:', error);
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
