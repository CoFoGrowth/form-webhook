const axios = require("axios");

const API_BASE = "https://api.zapcap.ai";
const TEMPLATE_ID = "cc4b8197-2d49-4cc7-9f77-d9fbd8ef96ab";

// Funkcja do przesyłania wideo do ZapCap z URL
async function uploadVideoToZapCapFromUrl(videoUrl) {
  console.log("Przesyłam wideo do ZapCap...");
  try {
    const response = await axios.post(
      `${API_BASE}/videos/url`,
      { url: videoUrl },
      {
        headers: {
          "x-api-key": process.env.ZAPCAP_API_KEY,
          "Content-Type": "application/json",
        },
      }
    );
    console.log("Wideo przesłane do ZapCap, ID:", response.data.id);
    return response.data.id;
  } catch (error) {
    console.error("Błąd podczas przesyłania wideo do ZapCap:", error.message);
    throw error;
  }
}

// Funkcja do tworzenia zadania w ZapCap
async function createZapCapTask(videoId) {
  console.log("Tworzę zadanie w ZapCap...");
  try {
    const response = await axios.post(
      `${API_BASE}/videos/${videoId}/task`,
      {
        templateId: TEMPLATE_ID,
        autoApprove: true,
        language: "pl",
        transcribeSettings: {
          broll: {
            brollPercent: 50,
          },
        },
      },
      {
        headers: {
          "x-api-key": process.env.ZAPCAP_API_KEY,
          "Content-Type": "application/json",
        },
      }
    );
    console.log("Zadanie utworzone w ZapCap, ID:", response.data.taskId);
    return response.data.taskId;
  } catch (error) {
    console.error("Błąd podczas tworzenia zadania w ZapCap:", error.message);
    throw error;
  }
}

// Funkcja oczekująca na zakończenie zadania w ZapCap
async function waitForZapCapTask(videoId, taskId) {
  console.log("Czekam na zakończenie zadania w ZapCap...");
  let attempts = 0;
  const maxAttempts = 60;

  while (attempts < maxAttempts) {
    try {
      const response = await axios.get(
        `${API_BASE}/videos/${videoId}/task/${taskId}`,
        {
          headers: { "x-api-key": process.env.ZAPCAP_API_KEY },
        }
      );

      const { status, downloadUrl } = response.data;
      console.log(
        `Status zadania (próba ${attempts + 1}/${maxAttempts}):`,
        status
      );

      if (status === "completed") {
        console.log("Zadanie zakończone, URL do pobrania:", downloadUrl);
        return downloadUrl;
      }
      if (status === "failed") {
        throw new Error("Zadanie nie powiodło się");
      }

      await new Promise((resolve) => setTimeout(resolve, 5000));
      attempts++;
    } catch (error) {
      console.error("Błąd podczas sprawdzania statusu zadania:", error.message);
      throw error;
    }
  }
  throw new Error("Przekroczono limit czasu oczekiwania na zadanie");
}

module.exports = {
  uploadVideoToZapCapFromUrl,
  createZapCapTask,
  waitForZapCapTask,
};
