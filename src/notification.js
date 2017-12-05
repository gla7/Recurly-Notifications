const axios = require('axios');
const debug = require('debug')('slash-command-template:ticket');
const qs = require('querystring');
const users = require('./users');

const notificationTypeColor = function (notificationType) {
  if (notificationType === 'Availability') {
    return 'danger'
  } else if (notificationType === 'New Feature(s)') {
    return 'good'
  }
  return '#439FE0'
}

/*
 *  Send notification creation confirmation via
 *  chat.postMessage to the user who created it
 */
const sendConfirmation = (notification) => {
  axios.post('https://slack.com/api/chat.postMessage', qs.stringify({
    token: process.env.SLACK_ACCESS_TOKEN,
    channel: notification.userId,
    text: 'Notification created!',
    attachments: JSON.stringify([
      {
        text: notification.text,
        color: notificationTypeColor(notification.types),
        fields: [
          {
            title: notification.title,
            value: notification.description || ''
          },
        ],
      },
    ]),
  })).then((result) => {
    debug('sendConfirmation: %o', result.data);
  }).catch((err) => {
    debug('sendConfirmation error: %o', err);
    console.error(err);
  });
};

// Create notification. Call users.find to get the user's email address
// from their user ID
const create = (userId, submission) => {
  const notification = {};

  // send notifications to merchants (hardcoded)
  axios.post('https://hooks.slack.com/services/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', JSON.stringify({
    color: notificationTypeColor(submission.types),
    fields: [
      {
        title: submission.title,
        value: submission.description || ''
      },
    ],
  })).then((result) => {
    console.log("GETTING RESULT: ", result)
  }).catch((err) => {
    console.log("GETTING ERR: ", err)
  })

  const fetchUserEmail = new Promise((resolve, reject) => {
    users.find(userId).then((result) => {
      debug(`Find user: ${userId}`);
      resolve(result.data.user.profile.email);
    }).catch((err) => { reject(err); });
  });

  fetchUserEmail.then((result) => {
    notification.userId = userId;
    notification.userEmail = result;
    notification.title = submission.title;
    notification.description = submission.description;
    notification.types = submission.types;
    sendConfirmation(notification);

    return notification;
  }).catch((err) => { console.error(err); });
};

module.exports = { create, sendConfirmation };
