const fs = require("fs");
const { PassThrough } = require("stream");
require("dotenv").config();

const express = require("express");
const axios = require("axios");
const rateLimit = require("express-rate-limit");
const path = require("path");
const FormData = require("form-data");
const multer = require("multer");
const { v4: uuidv4 } = require("uuid");
const { exec } = require("child_process");
const { promisify } = require("util");
const execAsync = promisify(exec);

// Initialize retry-axios with dynamic import
(async () => {
  const retryAxios = await import("retry-axios");

  // Configure Axios with retry functionality
  axios.defaults.raxConfig = {
    instance: axios,
    retry: 3, // 3 próby
    retryDelay: 1000, // 1 sekunda przerwy między próbami
  };
  retryAxios.attach();
})();

const app = express();
app.set("trust proxy", 1);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.text());

// Importowanie modułów
const {
  getAvatarIdByName,
  getPolishVoiceId,
  generateHeyGenVideo,
  waitForVideoCompletion,
} = require("./heyGen");
const {
  uploadVideoToZapCapFromUrl,
  createZapCapTask,
  waitForZapCapTask,
} = require("./zapCap");
const { callAssistant } = require("./openAi");
const { uploadStreamToDrive } = require("./googleDrive");

// Funkcja do przetwarzania formularza
async function processForm(formData) {
  try {
    console.log("Rozpoczynam przetwarzanie formularza...");
    const { avatar, text, fileId } = formData;

    // Pobierz ID avatara i głosu
    console.log("Pobieram ID awatara...");
    const avatarId = await getAvatarIdByName(avatar);
    console.log("ID awatara:", avatarId);

    console.log("Pobieram ID głosu...");
    const voiceId = await getPolishVoiceId();
    console.log("ID głosu:", voiceId);

    // Generuj wideo w HeyGen
    console.log("Generuję wideo w HeyGen...");
    const heygenVideoId = await generateHeyGenVideo(avatarId, voiceId, text);
    console.log("ID wideo:", heygenVideoId);

    console.log("Czekam na zakończenie generowania wideo...");
    const videoUrl = await waitForVideoCompletion(heygenVideoId);
    console.log("URL wideo:", videoUrl);

    const timestamp = Date.now();
    const folderId =
      process.env.GOOGLE_DRIVE_FOLDER_ID || "1aAvDyvyMruVLhNYMM4CCaed4-_lfuZGb";

    // Przesyłanie oryginalnego wideo jako strumień
    console.log("Przesyłam oryginalne wideo na Google Drive...");
    const videoResponse = await axios.get(videoUrl, {
      responseType: "stream",
    });
    const originalStream = new PassThrough();
    videoResponse.data.pipe(originalStream);
    const originalFileId = await uploadStreamToDrive(
      originalStream,
      `original_${timestamp}.mp4`,
      folderId
    );
    console.log(`Oryginalne wideo na Google Drive: ${originalFileId}`);

    // Przetwarzanie w ZapCap
    console.log("Przesyłam wideo do ZapCap...");
    const zapcapVideoId = await uploadVideoToZapCapFromUrl(videoUrl);
    console.log("ID wideo w ZapCap:", zapcapVideoId);

    console.log("Tworzę zadanie w ZapCap...");
    const taskId = await createZapCapTask(zapcapVideoId);
    console.log("ID zadania:", taskId);

    console.log("Czekam na zakończenie zadania w ZapCap...");
    const downloadUrl = await waitForZapCapTask(zapcapVideoId, taskId);
    console.log("URL do pobrania przetworzonego wideo:", downloadUrl);

    // Przesyłanie przetworzonego wideo jako strumień
    console.log("Przesyłam przetworzone wideo na Google Drive...");
    const processedResponse = await axios.get(downloadUrl, {
      responseType: "stream",
    });
    const processedStream = new PassThrough();
    processedResponse.data.pipe(processedStream);
    const processedFileId = await uploadStreamToDrive(
      processedStream,
      `processed_${timestamp}.mp4`,
      folderId
    );
    console.log(`Przetworzone wideo na Google Drive: ${processedFileId}`);

    console.log("Przetwarzanie formularza zakończone pomyślnie");
    return {
      heygenDriveFileId: originalFileId,
      zapcapDriveFileId: processedFileId,
    };
  } catch (error) {
    console.error("Błąd podczas przetwarzania formularza:", error);
    throw error;
  }
}

// Form data webhook handler
app.post("/form-webhook", async (req, res) => {
  console.log("Otrzymano żądanie webhooka");
  console.log("Otrzymane dane:", req.body);
  console.log("Nagłówki żądania:", req.headers);

  const data = req.body;
  const formattedData = {
    email: data["Adres e-mail:"],
    cel_video: data["Cel video"],
    avatar_id: data["avatar_id"],
    form_id: data.form_id,
    form_name: data.form_name,
    koncepcja: data["Koncepcja artystyczna wideo"],
    konto_instagram: data["Konto na Instagramie (np. @cofo.pl)"],
    opis: data["Opis"],
    strona_www: data["Strona www"],
    prompt: data["Twój prompt"],
    awatar: data["Wybierz awatara"],
    zgoda: data["Zaakceptuj regulamin przetwarzania danych:"],
  };
  console.log("Dane z formularza:", formattedData);

  // Przygotowanie odpowiedzi w formacie zgodnym z Elementorem
  const responseData = {
    success: true,
    message: "Form submitted successfully",
    form_id: formattedData.form_id || "190f9ac",
    data: {
      email: formattedData.email || "",
      prompt: formattedData.prompt || "",
      avatar: formattedData.awatar || "",
    },
  };

  // Ustawienie nagłówków i natychmiastowe zwrócenie odpowiedzi
  res.setHeader("Content-Type", "application/json");
  res.status(200).json(responseData);
  console.log("Webhook zakończony sukcesem - odpowiedź wysłana");

  // Asynchroniczne przetwarzanie danych w tle
  (async () => {
    try {
      // Tworzymy wiadomość dla GPT na podstawie danych formularza
      const gptMessage = `Stwórz prompt wideo na podstawie następujących szczegółów:
      - Cel: ${formattedData.cel_video || "brak"}
      - Koncepcja: ${formattedData.koncepcja || "brak"}
      - Opis: ${formattedData.opis || "brak"}
      - Strona internetowa: ${formattedData.strona_www || "brak"}
      - Instagram: ${formattedData.konto_instagram || "brak"}`;

      console.log("Wiadomość dla GPT:", gptMessage);

      // Dodajemy timeout dla wywołania asystenta
      let generatedPrompt;
      const fallbackPrompt =
        "Rozwiązania AI to przyszłość, która dzieje się na naszych oczach. Automatyzacja procesów, zwiększona efektywność i nowe horyzonty biznesowe – sztuczna inteligencja zmienia zasady gry w każdej branży. W świecie, gdzie każda sekunda ma znaczenie, AI daje Ci przewagę nad całym rynkiem. W CoFo dostarczamy rozwiązania skrojone na miarę Twoich potrzeb. Inwestycja w AI niedługo i tak będzie częścią Twojego biznesu. Zrób to teraz, zrób to lepiej.";

      try {
        console.log("Próba wywołania asystenta OpenAI z timeoutem 60 sekund");

        // Ustawiamy timeout na 60 sekund
        const timeoutPromise = new Promise((_, reject) => {
          setTimeout(() => {
            reject(new Error("Timeout podczas wywołania asystenta OpenAI"));
          }, 60000);
        });

        // Wywołujemy asystenta z timeoutem
        generatedPrompt = await Promise.race([
          callAssistant(gptMessage),
          timeoutPromise,
        ]);

        console.log(
          "Otrzymano odpowiedź od asystenta OpenAI:",
          generatedPrompt
        );
      } catch (error) {
        console.error(
          "Błąd lub timeout podczas wywoływania asystenta:",
          error.message
        );
        console.log("Używam domyślnego promptu");
        generatedPrompt = fallbackPrompt;
      }

      if (generatedPrompt.length > 2048) {
        console.error("Prompt jest za długi (maksymalnie 2048 znaków)");
        console.log(
          "Używam domyślnego promptu ze względu na ograniczenie długości"
        );
        generatedPrompt = fallbackPrompt;
      }

      console.log("Finalny prompt do użycia:", generatedPrompt);

      // Przetwarzamy formularz
      const result = await processForm({
        avatar: formattedData.awatar,
        text: generatedPrompt,
        fileId: formattedData.avatar_id,
      });

      console.log(
        "Przetwarzanie zakończone pomyślnie. Identyfikatory plików na Google Drive:",
        {
          wideo_heygen: result.heygenDriveFileId,
          wideo_zapcap: result.zapcapDriveFileId,
        }
      );
    } catch (error) {
      console.error(
        "Błąd podczas asynchronicznego przetwarzania:",
        error.message
      );
      console.error("Szczegóły błędu:", error.response?.data || error);
    }
  })();
});

// Rate limiter for /webhook endpoint (max. 3 requests per minute)
const limiter = rateLimit({
  windowMs: 60 * 1000,
  max: 3,
  message: "Too many requests, please try again later.",
});
app.use("/webhook", limiter);

// GET endpoint to check server status
app.get("/", (req, res) => {
  res.send("Server is running!");
});

app.listen(3000, () => {
  console.log("Server is running on http://localhost:3000");
});
