const express = require('express');
const { EnvoyAPI } = require('@envoy/envoy-integrations-sdk');

const app = express();
const router = express.Router();

app.use(express.json());

let allowedMinutes = null;

// Handle duration configuration from Envoy
router.post('/duration', (req, res) => {
  const minutes = parseInt(req.body.allowedMinutes, 10);

  if (
    isNaN(minutes) ||
    !Number.isInteger(minutes) ||
    minutes < 0 ||
    minutes > 180
  ) {
    return res.status(422).json({
      errors: {
        allowedMinutes: ['Must be a number between 0 and 180']
      }
    });
  }

  allowedMinutes = minutes;

  // Return format that Envoy expects for successful validation
  return res.status(200).json({
    data: {
      allowedMinutes: minutes.toString()  // Convert to string as Envoy expects string values
    }
  });
});

// Handle visitor sign-out webhook from Envoy
router.post('/webhook', (req, res) => {
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

app.use(router);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
