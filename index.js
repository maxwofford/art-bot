'use strict';

let fs = require('fs');
let https = require('https');
let child_process = require('child_process');
let url = require('url');
let path = require('path');
let fetch = require('node-fetch');
let slack = require('@slack/client');
let WebClient = slack.WebClient;
let RtmClient = slack.RtmClient;
let RTM_EVENTS = slack.RTM_EVENTS;

let token = process.env.SLACK_API_TOKEN || '';
let web = new WebClient(token);
let rtm = new RtmClient(token, {logLevel: 'debug'});

let botUserId = '';
web.auth.test().then(function(res) {
  botUserId = res.user_id;

  rtm.start();
});

var respondToMessage = function(message) {
  let channel = message.channel;

  if (message.text && message.text.match(/80s/)) {

    rtm.sendMessage('Generating...', channel);
    let userId = message.user;
    web.users.info(userId).then(function(res) {

      let profilePictureUrl = res.user.profile.image_original;

      // user.profile.image_original isn't set for people using Gravatar. Use
      // image_512 instead.
      if (profilePictureUrl == undefined) {
        profilePictureUrl = res.user.profile.image_512;
      }

      let parsedUrl = url.parse(profilePictureUrl);
      let fileName = path.basename(parsedUrl.pathname);
      let file = fs.createWriteStream(fileName);

      fetch(profilePictureUrl).then(function(e) {
        file.on('error', function(err) {
          console.log(err);
        });
        e.body.on('end', function() {
          glitchifyImage(fileName, channel, fileUpload);
        });
        e.body.pipe(file);
      });

    });
  }
};

let glitchifyImage = function(fileName, channel, callback) {
  let glitchify = child_process.spawn('./glitchify', [fileName]);
  glitchify.on('close', function() {
    callback(fileName, channel);
  });
};

let fileUpload = function(fileName, channel) {
  // file upload
  let streamOpts = {
    file: fs.createReadStream(fileName),
    channels: channel
  };

  web.files.upload(fileName, streamOpts, function handleStreamFileUpload(err, res) {
    if (err) {
      console.log(err);
    }
    console.log('deleting file');
    fs.unlink(fileName);
  });
};

rtm.on(RTM_EVENTS.MESSAGE, respondToMessage);
