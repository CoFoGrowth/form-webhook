const fs = require("fs");
const { PassThrough } = require("stream");
require("dotenv").config();

const express = require("express");
const axios = require("axios");
const rateLimit = require("express-rate-limit");
const cors = require("cors");
const { google } = require("googleapis");
const nodemailer = require("nodemailer");

// OAuth2 setup for Gmail
const oauth2Client = new google.auth.OAuth2(
  process.env.OAUTH_CLIENT_ID,
  process.env.OAUTH_CLIENT_SECRET,
  "https://developers.google.com/oauthplayground"
);
oauth2Client.setCredentials({ refresh_token: process.env.OAUTH_REFRESH_TOKEN });
oauth2Client.on("tokens", (tokens) => {
  if (tokens.refresh_token) {
    console.log("New refresh token:", tokens.refresh_token);
    // Zaktualizuj .env
  }
});
// Returns a fresh access token
async function getAccessToken() {
  try {
    const { token } = await oauth2Client.getAccessToken();
    console.log("Current access token:", token); // Dodaj to
    return token;
  } catch (error) {
    console.error("Error getting access token:", error);
    throw error;
  }
}

// Nodemailer transporter with OAuth2
async function createTransporter() {
  try {
    const accessToken = await getAccessToken();
    return nodemailer.createTransport({
      service: "gmail",
      auth: {
        type: "OAuth2",
        user: process.env.EMAIL_USER,
        clientId: process.env.OAUTH_CLIENT_ID,
        clientSecret: process.env.OAUTH_CLIENT_SECRET,
        refreshToken: process.env.OAUTH_REFRESH_TOKEN,
        accessToken,
      },
    });
  } catch (error) {
    console.error("Error creating transporter:", error);
    throw error;
  }
}

// retry-axios initialization - converted to async import
(async () => {
  try {
    const rax = await import("retry-axios");
    axios.defaults.raxConfig = {
      instance: axios,
      retry: 3,
      retryDelay: 1000,
    };
    rax.attach();
  } catch (error) {
    console.error("Error initializing retry-axios:", error);
  }
})();

const app = express();
app.set("trust proxy", 1);

// CORS
app.use(
  cors({
    origin: [
      "http://localhost:5174",
      "http://localhost:5173",
      "https://co-fo.vercel.app",
      "https://cofo.onrender.com",
      "https://cofo.pl",
    ],
    methods: ["GET", "POST", "OPTIONS"],
    allowedHeaders: [
      "Content-Type",
      "Authorization",
      "X-Requested-With",
      "Accept",
    ],
    credentials: true,
  })
);

// Body parsers
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.text());

// Rate limiter for email endpoint
const emailLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 3,
  message: { error: "Too many requests, please try again later." },
});

// Custom modules
const {
  getAvatarIdByName,
  getPolishVoiceId,
  generateHeyGenVideo,
  waitForVideoCompletion,
  verifyAndUseAvatarId,
} = require("./heyGen");

// ZapCap imports (zakomentowane)
// const {
//   uploadVideoToZapCapFromUrl,
//   createZapCapTask,
//   waitForZapCapTask,
// } = require("./zapCap");

// Nowe importy dla Submagic
const {
  createSubmagicProject,
  waitForSubmagicCompletion,
} = require("./submagic");

const { callAssistant } = require("./openAi");
const { uploadStreamToDrive } = require("./googleDrive");

// Map client_id to Drive folder
function getFolderIdByClientId(clientId) {
  const map = {
    "0001": "1CR027qsHiGXjAwDQ63y4E-Au0TbaioRO",
    "0002": "1I2tW5r0EclsFhJa9_U4Dg19VXS2FMNZN",
    "0003": "1nGd_0OlwKv62lRD8tMm5gXqarRqcKKGO",
    "0004": "13ICKHPlMDifm0esu9St9h-1BYxdUROg9",
    "0005": "1paE1cfsEMJSE8AN_T5gTjnaMK5xBi8Ze",
  };
  return map[clientId] || process.env.GOOGLE_DRIVE_FOLDER_ID;
}

// Core form processing
async function processForm({ avatar, text, fileId, client_id, brollPercent }) {
  console.log("Processing form...");
  let avatarId;
  try {
    avatarId = await verifyAndUseAvatarId(fileId);
  } catch {
    avatarId = await getAvatarIdByName("Anna");
  }

  const voiceId = await getPolishVoiceId(avatarId);
  const heygenVideoId = await generateHeyGenVideo(avatarId, voiceId, text);
  const videoUrl = await waitForVideoCompletion(heygenVideoId);
  const timestamp = Date.now();
  const folderId = getFolderIdByClientId(client_id);

  // Upload original
  const origResp = await axios.get(videoUrl, { responseType: "stream" });
  const origPassthrough = new PassThrough();
  origResp.data.pipe(origPassthrough);
  const originalFileId = await uploadStreamToDrive(
    origPassthrough,
    `original_${timestamp}.mp4`,
    folderId
  );

  // Submagic - nowa logika
  const submagicProject = await createSubmagicProject(
    videoUrl,
    `Video ${timestamp}`,
    "pl",
    "Hormozi 2"
  );
  const downloadUrl = await waitForSubmagicCompletion(submagicProject.id);

  // ZapCap - stara logika (zakomentowana)
  // const zapcapVideoId = await uploadVideoToZapCapFromUrl(videoUrl);
  // const taskId = await createZapCapTask(zapcapVideoId, brollPercent);
  // const downloadUrl = await waitForZapCapTask(zapcapVideoId, taskId);

  // Upload processed
  const procResp = await axios.get(downloadUrl, { responseType: "stream" });
  const procPassthrough = new PassThrough();
  procResp.data.pipe(procPassthrough);
  const processedFileId = await uploadStreamToDrive(
    procPassthrough,
    `processed_${timestamp}.mp4`,
    folderId
  );

  return {
    heygenDriveFileId: originalFileId,
    submagicDriveFileId: processedFileId, // zmienione z zapcapDriveFileId
  };
}

// Generate text endpoint
app.post("/generate-text", async (req, res) => {
  const { prompt } = req.body;
  try {
    const generatedText = await callAssistant(prompt);
    res.json({ success: true, text: generatedText });
  } catch (error) {
    console.error("Error generating text:", error);
    res
      .status(500)
      .json({ success: false, message: "Failed to generate text" });
  }
});

// Webhook: form
app.post("/form-webhook", async (req, res) => {
  const data = req.body;
  const formatted = {
    email: data["Adres e-mail:"],
    avatar_id: data.avatar_id,
    form_id: data.form_id,
    client_id: data.client_id,
    awatar: data["Wybierz awatara"],
    slider: data.slider_value || "50",
    cel_video: data["Cel video"],
    koncepcja: data["Opisz krótko styl rolki"],
    opis: data["Opisz krótko treść rolki"],
    strona_www: data["Strona www"],
    konto_instagram: data["Konto na Instagramie (np. @cofo.pl)"],
    final_text: data.final_text,
  };
  res.json({
    success: true,
    message: "Form submitted",
    form_id: formatted.form_id,
    data: formatted,
  });

  (async () => {
    try {
      const result = await processForm({
        avatar: formatted.awatar,
        text: formatted.final_text,
        fileId: formatted.avatar_id,
        client_id: formatted.client_id,
        brollPercent: formatted.slider,
      });
      console.log("Upload IDs:", result);
    } catch (err) {
      console.error("Async processing error:", err);
    }
  })();
});

// Webhook: custom script
app.post("/custom-script-for-heygen", async (req, res) => {
  const data = req.body;
  const formatted = {
    custom_script: data["Wklej swój skrypt:"] || data.Viral,
    avatar_id: data.avatar_id,
    client_id: data.client_id,
    slider: parseInt(data.slider_value || "50", 10),
  };
  if (!formatted.custom_script)
    return res
      .status(400)
      .json({ success: false, message: "Brak tekstu skryptu" });
  res.json({
    success: true,
    message: "Custom script received",
    data: formatted,
  });

  (async () => {
    try {
      await processForm({
        avatar: formatted.avatar_id,
        text: formatted.custom_script,
        fileId: formatted.avatar_id,
        client_id: formatted.client_id,
        brollPercent: formatted.slider,
      });
      console.log("Custom script processed");
    } catch (err) {
      console.error("Custom script error:", err);
    }
  })();
});

// Email endpoint
app.post("/send-email", emailLimiter, async (req, res) => {
  const { name, phone, email, message } = req.body;
  if (!name || !phone || !email || !message) {
    return res.status(400).json({ error: "Wypełnij wszystkie pola" });
  }
  try {
    const transporter = await createTransporter();
    console.log("Transporter created successfully");
    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: process.env.EMAIL_USER,
      subject: "Nowa wiadomość z formularza",
      text: `Imię: ${name}\nTelefon: ${phone}\nEmail: ${email}\nWiadomość: ${message}`,
      html: `<h2>Nowa wiadomość</h2><p><strong>Imię:</strong> ${name}</p><p><strong>Telefon:</strong> ${phone}</p><p><strong>Email:</strong> ${email}</p><p><strong>Wiadomość:</strong> ${message}</p>`,
    };
    const info = await transporter.sendMail(mailOptions);
    console.log("Message sent: %s", info.messageId);
    res.json({ message: "E-mail wysłany!" });
  } catch (err) {
    console.error("Email send error:", err);
    res.status(500).json({ error: "Coś poszło nie tak" });
  }
});

// Health check
app.get("/", (req, res) => res.send("Server is running!"));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server listening on port ${PORT}`));
