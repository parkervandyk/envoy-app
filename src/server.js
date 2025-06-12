const express = require('express');
const { middleware, errorMiddleware } = require('@envoy/envoy-integrations-sdk');

const app = express();

// Add Envoy middleware for all routes
app.use(middleware());

// Handle duration configuration from Envoy
app.post('/duration', (req, res) => {
  // Just return the validation array directly
  if (!req.body?.config?.allowedMinutes || 
      !Number.isInteger(req.body.config.allowedMinutes) || 
      req.body.config.allowedMinutes < 0 || 
      req.body.config.allowedMinutes > 180) {
    return res.send([{
      field: 'allowedMinutes',
      message: 'Must be a number between 0 and 180'
    }]);
  }

  // Return empty array for success
  return res.send([]);
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
