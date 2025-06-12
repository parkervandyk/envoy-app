const express = require('express');
const { EnvoyAPI } = require('@envoy/envoy-integrations-sdk');

const app = express();
const router = express.Router();

app.use(express.json());

let allowedMinutes = null;

// Configuration endpoint for setting up duration limits
router.post('/api/duration-limits/configure', (req, res) => {
  const { allowedMinutes: minutes } = req.body;

  // Validate input
  if (
    typeof minutes !== 'number' ||
    !Number.isInteger(minutes) ||
    minutes < 0 ||
    minutes > 180
  ) {
    return res.status(400).json({
      error: 'allowedMinutes must be an integer between 0 and 180'
    });
  }

  // Save configuration
  allowedMinutes = minutes;

  return res.status(200).json({
    success: true,
    allowedMinutes
  });
});

// Webhook endpoint for processing visitor events
router.post('/api/visitor-events/process', (req, res) => {
  if (allowedMinutes === null) {
    return res.status(200).json({ message: 'No config set' });
  }

  const event = req.body;

  if (event.type !== 'visitor.sign_out') {
    return res.status(200).json({ message: 'Event ignored' });
  }

  try {
    const signInTime = new Date(event.data.visitor.sign_in_time);
    const signOutTime = new Date(event.data.visitor.sign_out_time);
    
    const stayDurationMinutes = Math.round(
      (signOutTime.getTime() - signInTime.getTime()) / (1000 * 60)
    );

    let message = `Visitor stayed ${stayDurationMinutes} minutes.`;
    
    if (stayDurationMinutes > allowedMinutes) {
      message += ` They overstayed the allotted time of ${allowedMinutes} minutes.`;
    } else {
      message += ' They left within the allotted time.';
    }

    return res.status(200).json({
      visitor: {
        messages: [
          {
            content: message
          }
        ]
      }
    });
  } catch (error) {
    console.error('Error processing webhook:', error);
    return res.status(400).json({
      error: 'Invalid event data'
    });
  }
});

// Mount router with API prefix
app.use('/api', router);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
