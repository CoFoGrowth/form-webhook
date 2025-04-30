const { google } = require("googleapis");
const readline = require("readline");
require("dotenv").config();

const CLIENT_ID = process.env.OAUTH_CLIENT_ID;
const CLIENT_SECRET = process.env.OAUTH_CLIENT_SECRET;
const REDIRECT_URI = "http://localhost";

const oauth2Client = new google.auth.OAuth2(
  CLIENT_ID,
  CLIENT_SECRET,
  REDIRECT_URI
);

const SCOPES = [
  "https://mail.google.com/",
  "https://www.googleapis.com/auth/gmail.send",
];

const authUrl = oauth2Client.generateAuthUrl({
  access_type: "offline",
  scope: SCOPES,
});

console.log("Autoryzuj aplikację, odwiedzając ten URL:", authUrl);

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

rl.question("Wklej kod z URL po autoryzacji: ", (code) => {
  rl.close();
  oauth2Client.getToken(code, (err, token) => {
    if (err) return console.error("Błąd uzyskiwania tokena:", err);
    console.log("Refresh Token:", token.refresh_token);
  });
});
