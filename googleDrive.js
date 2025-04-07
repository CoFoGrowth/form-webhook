const fs = require("fs");
const { google } = require("googleapis");
const { PassThrough } = require("stream");
const axios = require("axios");

// Inicjalizacja autoryzacji dla konta usługi
const serviceAccountAuth = new google.auth.GoogleAuth({
  credentials: JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_KEY),
  scopes: ["https://www.googleapis.com/auth/drive"],
});

// Funkcja do przesyłania strumienia do Google Drive
async function uploadStreamToDrive(stream, fileName, folderId) {
  console.log(`Przesyłam plik ${fileName} na Google Drive...`);
  try {
    const authClient = await serviceAccountAuth.getClient();
    const drive = google.drive({ version: "v3", auth: authClient });
    const fileMetadata = { name: fileName, parents: [folderId] };
    const media = { mimeType: "video/mp4", body: stream };
    const res = await drive.files.create({
      resource: fileMetadata,
      media: media,
      fields: "id",
    });
    console.log(`Plik przesłany na Google Drive, ID: ${res.data.id}`);
    return res.data.id;
  } catch (error) {
    console.error(
      "Błąd podczas przesyłania pliku na Google Drive:",
      error.message
    );
    throw error;
  }
}

module.exports = {
  uploadStreamToDrive,
};
