const express = require('express');
const { middleware, errorMiddleware } = require('@envoy/envoy-integrations-sdk');

const app = express();

// Add Envoy middleware
app.use(middleware());
app.use(express.json());

// Handle duration configuration from Envoy
app.post('/duration', (req, res) => {
  console.log('Raw request body:', JSON.stringify(req.body, null, 2));
  
  const envoy = req.envoy;
  console.log('Envoy meta:', envoy?.meta);
  console.log('Envoy config:', envoy?.meta?.config);

  let minutes;
  try {
    // Try getting from Envoy SDK first
    minutes = envoy?.meta?.config?.allowedMinutes;
    if (minutes === undefined) {
      // Fallback to request body
      minutes = req.body?.config?.allowedMinutes;
    }
    
    // Convert to number if string
    if (typeof minutes === 'string') {
      minutes = parseInt(minutes, 10);
    }

    minutes = Number(minutes); // Ensure it's a number
    
    console.log('Parsed minutes:', minutes, 'Type:', typeof minutes);
    
    if (typeof minutes !== 'number' || !Number.isInteger(minutes) || minutes < 0 || minutes > 180) {
      throw new Error('Invalid range');
    }
  } catch (error) {
    console.error('Validation error:', error);
    return res.status(422).json([
      {
        field: "allowedMinutes",
        message: "Must be a number between 0 and 180"
      }
    ]);
  }

  const response = {
    step: 0,
    config: {
      allowedMinutes: minutes
    }
  };
  
  console.log('Sending response:', JSON.stringify(response, null, 2));
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
