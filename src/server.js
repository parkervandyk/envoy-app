const express = require('express');
const { middleware, errorMiddleware } = require('@envoy/envoy-integrations-sdk');

const app = express();

// Add Envoy middleware
app.use(middleware());
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

// Handle visitor sign-out webhook from Envoy
app.post('/webhook', async (req, res) => {
  const envoy = req.envoy;
  const job = envoy.job;
  const config = envoy.meta.config;
  const visitor = envoy.payload;
  
  try {
    const signInTime = new Date(visitor.attributes['sign-in-time']);
    const signOutTime = new Date(visitor.attributes['sign-out-time']);
    const allowedMinutes = parseInt(config.allowedMinutes, 10);
    
    const stayDurationMinutes = Math.round(
      (signOutTime.getTime() - signInTime.getTime()) / (1000 * 60)
    );

    let message = `Visitor stayed ${stayDurationMinutes} minutes.`;
    
    if (stayDurationMinutes > allowedMinutes) {
      message += ` They overstayed the allotted time of ${allowedMinutes} minutes.`;
    } else {
      message += ' They left within the allotted time.';
    }

    // Attach the message to the job for display in Envoy dashboard
    await job.attach({ 
      label: 'Stay Duration', 
      value: message 
    });
    
    res.send({ message });
  } catch (error) {
    console.error('Error processing webhook:', error);
    res.status(400).send({ error: 'Error processing visitor data' });
  }
});

// Add error middleware
app.use(errorMiddleware());

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
