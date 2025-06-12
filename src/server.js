const express = require('express');
const { middleware, errorMiddleware } = require('@envoy/envoy-integrations-sdk');

const app = express();

// Add JSON parsing middleware
app.use(express.json());

// Handle duration configuration from Envoy
app.post('/duration', (req, res) => {
  console.log('Raw request:', JSON.stringify(req.body, null, 2));

  // Get the value directly from request
  const minutes = req.body?.config?.allowedMinutes;
  
  // Basic validation
  if (!Number.isInteger(minutes) || minutes < 0 || minutes > 180) {
    return res.status(422).json([{
      field: 'allowedMinutes',
      message: 'Must be a number between 0 and 180'
    }]);
  }

  // Mirror the request format exactly
  const response = {
    step: req.body.step,
    config: {
      allowedMinutes: minutes
    }
  };

  console.log('Response:', JSON.stringify(response, null, 2));
  return res.json(response);
});

// Add Envoy middleware only for webhook endpoint
app.use('/webhook', middleware());

// Handle visitor sign-out webhook from Envoy
app.post('/webhook', async (req, res) => {
  console.log('Webhook payload:', JSON.stringify(req.body, null, 2));

  try {
    if (req.body.type !== 'visitor.sign_out') {
      return res.status(200).json({ message: 'Ignored non-sign-out event' });
    }

    const visitor = req.body.visitor;
    if (!visitor?.attributes) {
      throw new Error('Missing visitor attributes');
    }

    const signInTime = new Date(visitor.attributes['sign-in-time']);
    const signOutTime = new Date(visitor.attributes['sign-out-time']);
    
    // For testing, use a default if config is not available
    const allowedMinutes = 20; // Default to 20 minutes for local testing
    
    const stayDurationMinutes = Math.round(
      (signOutTime.getTime() - signInTime.getTime()) / (1000 * 60)
    );

    let message = `Visitor stayed ${stayDurationMinutes} minutes.`;
    
    if (stayDurationMinutes > allowedMinutes) {
      message += ` They overstayed the allotted time of ${allowedMinutes} minutes.`;
    } else {
      message += ' They left within the allotted time.';
    }

    console.log('Generated message:', message);
    
    // When testing locally without Envoy SDK, just send the message
    return res.status(200).json({
      message: message
    });
  } catch (error) {
    console.error('Error processing webhook:', error);
    return res.status(400).json({
      error: 'Error processing visitor data: ' + error.message
    });
  }
});

// Add error middleware
app.use(errorMiddleware());

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
