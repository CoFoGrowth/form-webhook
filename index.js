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
  verifyAndUseAvatarId,
} = require("./heyGen");
const {
  uploadVideoToZapCapFromUrl,
  createZapCapTask,
  waitForZapCapTask,
} = require("./zapCap");
const { callAssistant } = require("./openAi");
const { uploadStreamToDrive } = require("./googleDrive");

// Funkcja pomocnicza do mapowania client_id na folder ID
function getFolderIdByClientId(clientId) {
  const folderMapping = {
    "0001": "1CR027qsHiGXjAwDQ63y4E-Au0TbaioRO",
    "0002": "1I2tW5r0EclsFhJa9_U4Dg19VXS2FMNZN",
    "0003": "1nGd_0OlwKv62lRD8tMm5gXqarRqcKKGO",
    "0004": "13ICKHPlMDifm0esu9St9h-1BYxdUROg9",
    "0005": "1paE1cfsEMJSE8AN_T5gTjnaMK5xBi8Ze",
  };

  // Jeśli client_id jest w mapowaniu, zwróć odpowiedni folder ID
  if (clientId && folderMapping[clientId]) {
    console.log(
      `Znaleziono folder dla client_id ${clientId}: ${folderMapping[clientId]}`
    );
    return folderMapping[clientId];
  }

  // W przeciwnym razie użyj domyślnego folderu
  const defaultFolderId =
    process.env.GOOGLE_DRIVE_FOLDER_ID || "1aAvDyvyMruVLhNYMM4CCaed4-_lfuZGb";
  console.log(`Używam domyślnego folderu: ${defaultFolderId}`);
  return defaultFolderId;
}

// Funkcja do przetwarzania formularza
async function processForm(formData) {
  try {
    console.log("Rozpoczynam przetwarzanie formularza...");
    const { avatar, text, fileId, client_id, brollPercent } = formData;

    // Weryfikacja i użycie avatar_id
    console.log("Weryfikuję avatar_id...");
    let avatarId;
    try {
      avatarId = await verifyAndUseAvatarId(fileId);
      console.log("ID awatara:", avatarId);
    } catch (error) {
      console.error(
        `Błąd podczas weryfikacji avatar_id ${fileId}:`,
        error.message
      );
      // Próbujemy użyć domyślnego awatara
      avatarId = await getAvatarIdByName("Anna");
      console.log("Używam domyślnego awatara Anna, ID:", avatarId);
    }

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
    // Używamy funkcji pomocniczej do określenia folderu na podstawie client_id
    const folderId = getFolderIdByClientId(client_id);

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
    const taskId = await createZapCapTask(zapcapVideoId, brollPercent);
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
    client_id: data["client_id"],
    brollPercent: parseInt(data["slider"] || "50", 10),
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
      const gptMessage = `Stwórz wyłącznie tekst, który mój awatar ma wypowiedzieć w krótkim wideo promującym moją markę osobistą. Nie opisuj koncepcji, nie dodawaj wprowadzeń ani podsumowań — oczekuję tylko gotowej wypowiedzi awatara, maksymalnie 300 słów.
        Wypowiedź powinna:
        Brzmieć naturalnie i spójnie – jakby mówiła ją osoba promująca swoją markę.
        Podkreślać moje kompetencje, wartości i misję.
        Wyróżniać mnie na tle innych w mojej branży.
        Być angażująca i skierowana do konkretnej grupy odbiorców (np. klienci, współpracownicy, obserwatorzy).
        Mieć styl dopasowany do mojej marki osobistej (np. profesjonalny, motywujący, luźny).
        Zawierać wezwanie do działania na końcu (np. "Obserwuj mnie, by poznać więcej", "Napisz, jeśli chcesz współpracować").
        Długość wypowiedzi: ok. 30 sekund (maks. 300 słów).
        Nie przekraczaj tej długości.
        Na podstawie poniższych informacji stwórz samą wypowiedź awatara:
      - Cel: ${formattedData.cel_video || "brak"}
      - Koncepcja: ${formattedData.koncepcja || "brak"}
      - Opis: ${formattedData.opis || "brak"}
      - Strona internetowa: ${formattedData.strona_www || "brak"}
      - Instagram: ${formattedData.konto_instagram || "brak"}`;

      console.log("Wiadomość dla GPT:", gptMessage);

      // Przygotowanie fallbackowego promptu
      let generatedPrompt;
      const fallbackPrompt =
        "Rozwiązania AI to przyszłość, która dzieje się na naszych oczach. Automatyzacja procesów, zwiększona efektywność i nowe horyzonty biznesowe – sztuczna inteligencja zmienia zasady gry w każdej branży. W świecie, gdzie każda sekunda ma znaczenie, AI daje Ci przewagę nad całym rynkiem. W CoFo dostarczamy rozwiązania skrojone na miarę Twoich potrzeb. Inwestycja w AI niedługo i tak będzie częścią Twojego biznesu. Zrób to teraz, zrób to lepiej.";

      try {
        console.log("Wywołuję asystenta OpenAI");

        // Wywołujemy asystenta z wbudowanym timeoutem w funkcji callAssistant
        generatedPrompt = await callAssistant(gptMessage);

        console.log(
          "Otrzymano odpowiedź od asystenta OpenAI:",
          generatedPrompt
        );
      } catch (error) {
        console.error("Błąd podczas wywoływania asystenta:", error.message);
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
        client_id: formattedData.client_id,
        brollPercent: formattedData.brollPercent,
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

// Custom script webhook handler
app.post("/custom-script-for-heygen", async (req, res) => {
  console.log("Otrzymano żądanie custom-script webhooka");
  console.log("Otrzymane dane:", req.body);
  console.log("Nagłówki żądania:", req.headers);

  const data = req.body;
  const formattedData = {
    custom_script: data["Wklej swój skrypt:"] || data["Viral"],
    form_id: data.form_id,
    form_name: data.form_name,
    client_id: data["client_id"],
    avatar_id: data["avatar_id"],
    brollPercent: parseInt(data["slider"] || "50", 10),
  };
  console.log("Dane z formularza:", formattedData);

  // Walidacja danych
  if (!formattedData.custom_script) {
    console.error("Brak tekstu skryptu w danych formularza");
    return res.status(400).json({
      success: false,
      message: "Brak tekstu skryptu w danych formularza",
      form_id: formattedData.form_id || "custom-script-form",
    });
  }

  // Przygotowanie odpowiedzi w formacie zgodnym z Elementorem
  const responseData = {
    success: true,
    message: "Custom script form submitted successfully",
    form_id: formattedData.form_id || "custom-script-form",
    data: {
      custom_script: formattedData.custom_script,
    },
  };

  // Ustawienie nagłówków i natychmiastowe zwrócenie odpowiedzi
  res.setHeader("Content-Type", "application/json");
  res.status(200).json(responseData);
  console.log("Webhook zakończony sukcesem - odpowiedź wysłana");

  (async () => {
    try {
      // Weryfikacja i użycie avatar_id
      console.log("Weryfikuję avatar_id...");
      let avatarId;
      try {
        avatarId = await verifyAndUseAvatarId(formattedData.avatar_id);
        console.log("ID awatara:", avatarId);
      } catch (error) {
        console.error(
          `Błąd podczas weryfikacji avatar_id ${formattedData.avatar_id}:`,
          error.message
        );
        // Próbujemy użyć domyślnego awatara
        avatarId = await getAvatarIdByName("Anna");
        console.log("Używam domyślnego awatara Anna, ID:", avatarId);
      }

      console.log("Pobieram ID głosu...");
      const voiceId = await getPolishVoiceId();
      console.log("ID głosu:", voiceId);

      console.log("Generuję wideo w HeyGen...");
      const heygenVideoId = await generateHeyGenVideo(
        avatarId,
        voiceId,
        formattedData.custom_script
      );
      console.log("ID wideo:", heygenVideoId);

      console.log("Czekam na zakończenie generowania wideo...");
      const videoUrl = await waitForVideoCompletion(heygenVideoId);
      console.log("URL wideo:", videoUrl);
      const timestamp = Date.now();
      const folderId = getFolderIdByClientId(formattedData.client_id);

      // Przesyłanie oryginalnego wideo jako strumień
      console.log("Przesyłam oryginalne wideo na Google Drive...");
      const videoResponse = await axios.get(videoUrl, {
        responseType: "stream",
      });
      const originalStream = new PassThrough();
      videoResponse.data.pipe(originalStream);
      const originalFileId = await uploadStreamToDrive(
        originalStream,
        `custom_script_original_${timestamp}.mp4`,
        folderId
      );
      console.log(`Oryginalne wideo na Google Drive: ${originalFileId}`);

      // Przetwarzanie w ZapCap
      console.log("Przesyłam wideo do ZapCap...");
      const zapcapVideoId = await uploadVideoToZapCapFromUrl(videoUrl);
      console.log("ID wideo w ZapCap:", zapcapVideoId);

      console.log("Tworzę zadanie w ZapCap...");
      const taskId = await createZapCapTask(
        zapcapVideoId,
        formattedData.brollPercent
      );
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
        `custom_script_processed_${timestamp}.mp4`,
        folderId
      );
      console.log(`Przetworzone wideo na Google Drive: ${processedFileId}`);

      console.log("Przetwarzanie custom script zakończone pomyślnie");
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
