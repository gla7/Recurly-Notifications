require('dotenv').config();

const axios = require('axios');
const express = require('express');
const bodyParser = require('body-parser');
const qs = require('querystring');
const notification = require('./notification');
const debug = require('debug')('slash-command-template:index');
const mongoose = require('mongoose');

const app = express();

// mongo setup
mongoose.connect('mongodb://' + process.env.MLAB_USERNAME + ':' + process.env.MLAB_PW + '@ds131826.mlab.com:31826/recurlynotifications');

/*
 * Parse application/x-www-form-urlencoded && application/json
 */
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

app.get('/', (req, res) => {
  res.send('<h2>The Slash Command and Dialog app is running</h2> <p>Follow the' +
  ' instructions in the README to configure the Slack App and your environment variables.</p>');
});

// send new merchants' stuff here
app.post('/newMerchant', (req, res) => {
  const name = req.body.text.split(' ')[0]
  const incomingWebHookURL = req.body.text.split(' ')[1]
  const Merchant = require('./models/merchant').Merchant
  const newMerchant = new Merchant({
    name,
    incomingWebHookURL
  })
  newMerchant.save((err, merchant, next) => {
    if (err) { return next(err) }
    console.log("SAVED SUN!!!")
  })
})

/*
 * Endpoint to receive /helpdesk slash command from Slack.
 * Checks verification token and opens a dialog to capture more info.
 */
app.post('/commands', (req, res) => {
  // extract the verification token, slash command text,
  // and trigger ID from payload
  const { token, text, trigger_id } = req.body;

  // check that the verification token matches expected value
  if (token === process.env.SLACK_VERIFICATION_TOKEN) {
    // create the dialog payload - includes the dialog structure, Slack API token,
    // and trigger ID
    const dialog = {
      token: process.env.SLACK_ACCESS_TOKEN, // the OAUTH access token of the app in https://api.slack.com/apps/A8A0GTQS1/oauth?
      trigger_id,
      dialog: JSON.stringify({
        title: 'New Recurly Notification',
        callback_id: 'submit-ticket',
        submit_label: 'Submit',
        elements: [
          {
            label: 'Title',
            type: 'text',
            name: 'title',
            value: text,
            hint: '30 second summary of the problem',
          },
          {
            label: 'Description',
            type: 'textarea',
            name: 'description',
            optional: true,
          },
          {
            label: 'Type',
            type: 'select',
            name: 'types',
            options: [
              { label: 'New Feature(s)', value: 'New Feature(s)' },
              { label: 'Bug Fix(es)', value: 'Bug Fix(es)' },
              { label: 'Availability', value: 'Availability' },
            ],
          },
        ],
      }),
    };

    // open the dialog by calling dialogs.open method and sending the payload
    axios.post('https://slack.com/api/dialog.open', qs.stringify(dialog))
      .then((result) => {
        debug('dialog.open: %o', result.data);
        res.send('');
      }).catch((err) => {
        debug('dialog.open call failed: %o', err);
        res.sendStatus(500);
      });
  } else {
    debug('Verification token mismatch');
    res.sendStatus(500);
  }
});

/*
 * Endpoint to receive the dialog submission. Checks the verification token
 * and creates a notification
 */
app.post('/interactive-component', (req, res) => {
  const body = JSON.parse(req.body.payload);

  // check that the verification token matches expected value
  if (body.token === process.env.SLACK_VERIFICATION_TOKEN) {
    debug(`Form submission received: ${body.submission.trigger_id}`);

    // immediately respond with a empty 200 response to let
    // Slack know the command was received
    res.send('');

    // create notification
    notification.create(body.user.id, body.submission);
  } else {
    debug('Token mismatch');
    res.sendStatus(500);
  }
});

app.listen(process.env.PORT, () => {
  console.log(`App listening on port ${process.env.PORT}!`);
});
