const ffmpeg = require("fluent-ffmpeg");
const path = require("path");
const fs = require("fs");
const { google } = require("googleapis");
const { PassThrough } = require("stream");
const { uploadStreamToDrive } = require("./googleDrive");

// Użyj Service Account zamiast OAuth2
const serviceAccountAuth = new google.auth.GoogleAuth({
  credentials: JSON.parse(
    process.env.GOOGLE_SERVICE_ACCOUNT_KEY.replace(/'/g, "")
  ),
  scopes: ["https://www.googleapis.com/auth/drive"],
});

// Usuń stare OAuth2 setup i zastąp:
async function getDriveClient() {
  const authClient = await serviceAccountAuth.getClient();
  return google.drive({ version: "v3", auth: authClient });
}

/**
 * Pobiera wymiary wideo (width, height) przez ffprobe.
 */
function getVideoDimensions(file) {
  return new Promise((resolve, reject) => {
    ffmpeg.ffprobe(file, (err, meta) => {
      if (err) return reject(err);
      const stream = meta.streams.find((s) => s.width && s.height);
      if (!stream) return reject(new Error("Nie znaleziono strumienia wideo"));
      resolve({
        width: stream.width,
        height: stream.height,
        duration: stream.duration || 0,
      });
    });
  });
}

/**
 * Pobiera plik z Google Drive i zapisuje lokalnie
 */
async function downloadFileFromDrive(fileId, localPath) {
  console.log(`Pobieram plik ${fileId} z Google Drive...`);
  try {
    const drive = await getDriveClient();
    const response = await drive.files.get(
      {
        fileId: fileId,
        alt: "media",
      },
      { responseType: "stream" }
    );

    const writeStream = fs.createWriteStream(localPath);

    return new Promise((resolve, reject) => {
      response.data
        .pipe(writeStream)
        .on("error", reject)
        .on("finish", () => {
          console.log(`Plik zapisany lokalnie: ${localPath}`);
          resolve(localPath);
        });
    });
  } catch (error) {
    console.error("Błąd podczas pobierania pliku z Drive:", error.message);
    throw error;
  }
}

/**
 * Łączy dwa wideo w układ góra/dół 50/50.
 * submagicPath - plik który ma być na górze (Submagic)
 * heygenPath   - plik który ma być na dole (HeyGen - jego audio zostanie zachowane)
 * outPath      - ścieżka zapisu wynikowego pliku
 */
async function stackVertical50(submagicPath, heygenPath, outPath) {
  try {
    return new Promise((resolve, reject) => {
      ffmpeg()
        .addInput(submagicPath) // input 0 - Submagic (góra - 50%)
        .addInput(heygenPath) // input 1 - HeyGen (dół - 50%)
        .addOption(
          "-filter_complex",
          `[0:v]scale=720:640:force_original_aspect_ratio=increase,crop=720:640[top];[1:v]scale=720:640:force_original_aspect_ratio=increase,crop=720:640:0:80[bottom];[top][bottom]vstack=inputs=2[outv]`
        )
        .addOption("-map", "[outv]")
        .addOption("-map", "1:a")
        .videoCodec("libx264")
        .addOption("-crf", "18")
        .addOption("-preset", "fast")
        .addOption("-shortest")
        .on("start", (cmd) => console.log("FFMPEG cmd:", cmd))
        .on("progress", (p) => {
          if (p.percent)
            process.stdout.write(`\rPostęp łączenia: ${p.percent.toFixed(2)}%`);
        })
        .on("error", (err) => reject(err))
        .on("end", () => {
          console.log("\nZakończono łączenie filmów.");
          resolve(outPath);
        })
        .save(outPath);
    });
  } catch (error) {
    console.error("Błąd w stackVertical50:", error);
    throw error;
  }
}

/**
 * Główna funkcja łącząca filmy z Google Drive
 * @param {string} heygenFileId - ID pliku HeyGen na Google Drive
 * @param {string} submagicFileId - ID pliku Submagic na Google Drive
 * @param {string} client_id - ID klienta (do określenia folderu docelowego)
 * @returns {string} - ID połączonego pliku na Google Drive
 */
async function combineVideosFromDrive(heygenFileId, submagicFileId, client_id) {
  const timestamp = Date.now();
  const tempDir = path.join(__dirname, "temp");

  // Utwórz folder tymczasowy jeśli nie istnieje
  if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir, { recursive: true });
  }

  const heygenLocalPath = path.join(tempDir, `heygen_${timestamp}.mp4`);
  const submagicLocalPath = path.join(tempDir, `submagic_${timestamp}.mp4`);
  const combinedLocalPath = path.join(tempDir, `combined_${timestamp}.mp4`);

  try {
    console.log("Rozpoczynam łączenie filmów...");

    // Pobierz oba pliki z Google Drive
    await Promise.all([
      downloadFileFromDrive(heygenFileId, heygenLocalPath),
      downloadFileFromDrive(submagicFileId, submagicLocalPath),
    ]);

    // Połącz filmy (Submagic na górze, HeyGen na dole)
    await stackVertical50(
      submagicLocalPath,
      heygenLocalPath,
      combinedLocalPath
    );

    // Wgraj połączony film z powrotem na Google Drive
    const folderId = getFolderIdByClientId(client_id);
    const combinedStream = fs.createReadStream(combinedLocalPath);
    const combinedFileId = await uploadStreamToDrive(
      combinedStream,
      `combined_${timestamp}.mp4`,
      folderId
    );

    console.log("Film połączony i wgrany na Google Drive:", combinedFileId);

    // Wyczyść pliki tymczasowe
    [heygenLocalPath, submagicLocalPath, combinedLocalPath].forEach(
      (filePath) => {
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
          console.log(`Usunięto plik tymczasowy: ${filePath}`);
        }
      }
    );

    return combinedFileId;
  } catch (error) {
    console.error("Błąd podczas łączenia filmów:", error.message);

    // Wyczyść pliki tymczasowe w przypadku błędu
    [heygenLocalPath, submagicLocalPath, combinedLocalPath].forEach(
      (filePath) => {
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }
      }
    );

    throw error;
  }
}

// Funkcja pomocnicza do określenia folderu na podstawie client_id
function getFolderIdByClientId(clientId) {
  const folderMap = {
    "0001": "1CR027qsHiGXjAwDQ63y4E-Au0TbaioRO", // Folder klienta 0001
    "0002": "1I2tW5r0EclsFhJa9_U4Dg19VXS2FMNZN", // Folder klienta 0002
    "0003": "1nGd_0OlwKv62lRD8tMm5gXqarRqcKKGO", // Folder klienta 0003
    "0004": "13ICKHPlMDifm0esu9St9h-1BYxdUROg9", // Folder klienta 0004
    "0005": "1paE1cfsEMJSE8AN_T5gTjnaMK5xBi8Ze", // Folder klienta 0005
  };
  return folderMap[clientId] || process.env.GOOGLE_DRIVE_FOLDER_ID; // domyślny folder
}

module.exports = {
  combineVideosFromDrive,
  stackVertical50,
  downloadFileFromDrive,
  getVideoDimensions,
};
