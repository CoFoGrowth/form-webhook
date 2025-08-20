const axios = require("axios");

const API_BASE = "https://api.submagic.co/v1";

// Funkcja do tworzenia projektu w Submagic
async function createSubmagicProject(
  videoUrl,
  title = "Generated Video",
  language = "pl",
  templateName = "Hormozi 2"
) {
  console.log("Tworzę projekt w Submagic...");
  try {
    const response = await axios.post(
      `${API_BASE}/projects`,
      {
        title: title,
        language: language,
        videoUrl: videoUrl,
        templateName: templateName,
        magicZooms: true,
        magicBrolls: true,
        magicBrollsPercentage: 75,
      },
      {
        headers: {
          "x-api-key": process.env.SUBMAGIK_API_KEY,
          "Content-Type": "application/json",
        },
      }
    );
    console.log("Projekt utworzony w Submagic, ID:", response.data.id);
    return response.data;
  } catch (error) {
    console.error("Błąd podczas tworzenia projektu w Submagic:", error.message);
    if (error.response) {
      console.error("Response data:", error.response.data);
      console.error("Response status:", error.response.status);
    }
    throw error;
  }
}

// Funkcja oczekująca na zakończenie przetwarzania w Submagic
async function waitForSubmagicCompletion(projectId) {
  console.log("Czekam na zakończenie przetwarzania w Submagic...");
  let attempts = 0;
  const maxAttempts = 60;

  while (attempts < maxAttempts) {
    try {
      const response = await axios.get(`${API_BASE}/projects/${projectId}`, {
        headers: { "x-api-key": process.env.SUBMAGIK_API_KEY },
      });

      const { status, downloadUrl } = response.data;
      console.log(
        `Status projektu (próba ${attempts + 1}/${maxAttempts}):`,
        status
      );

      if (status === "completed" || status === "done") {
        console.log("Projekt zakończony, URL do pobrania:", downloadUrl);
        return downloadUrl;
      }
      if (status === "failed" || status === "error") {
        throw new Error("Projekt nie powiódł się");
      }

      await new Promise((resolve) => setTimeout(resolve, 5000));
      attempts++;
    } catch (error) {
      console.error(
        "Błąd podczas sprawdzania statusu projektu:",
        error.message
      );
      throw error;
    }
  }
  throw new Error("Przekroczono limit czasu oczekiwania na projekt");
}

module.exports = {
  createSubmagicProject,
  waitForSubmagicCompletion,
};
