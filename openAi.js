require("dotenv").config();
const axios = require("axios");

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

// Funkcja do wywoływania asystenta OpenAI
async function callAssistant(prompt) {
  console.log("Rozpoczynam wywołanie asystenta OpenAI");
  const assistantId = "asst_DE9kt4lKO0KLTPAlgudaXlpR";

  const headers = {
    Authorization: `Bearer ${OPENAI_API_KEY}`,
    "Content-Type": "application/json",
    "OpenAI-Beta": "assistants=v2",
  };

  try {
    // Krok 1: Utwórz nowy wątek
    console.log("Wysyłam żądanie utworzenia wątku...");
    const threadResponse = await axios.post(
      "https://api.openai.com/v1/threads",
      {},
      {
        headers,
        timeout: 30000,
      }
    );
    console.log("Odpowiedź utworzenia wątku:", threadResponse.data);
    const threadId = threadResponse.data.id;
    console.log("Utworzono wątek z ID:", threadId);

    // Krok 2: Dodaj wiadomość do wątku
    console.log("Wysyłam żądanie dodania wiadomości...");
    const messageData = {
      role: "user",
      content: prompt,
    };

    const messageResponse = await axios.post(
      `https://api.openai.com/v1/threads/${threadId}/messages`,
      messageData,
      {
        headers,
        timeout: 30000,
      }
    );
    console.log("Dodano wiadomość do wątku, odpowiedź:", messageResponse.data);

    // Krok 3: Uruchom asystenta na wątku
    console.log("Uruchamiam asystenta na wątku...");
    const runResponse = await axios.post(
      `https://api.openai.com/v1/threads/${threadId}/runs`,
      {
        assistant_id: assistantId,
      },
      {
        headers,
        timeout: 30000,
      }
    );
    console.log("Odpowiedź uruchomienia asystenta:", runResponse.data);
    const runId = runResponse.data.id;
    console.log("Uruchomiono asystenta z ID:", runId);

    // Krok 4: Oczekuj na zakończenie zadania
    console.log("Czekam na zakończenie zadania...");
    let runStatus;
    let attempts = 0;
    const maxAttempts = 30;

    do {
      await new Promise((resolve) => setTimeout(resolve, 2000));
      console.log(
        `Sprawdzam status zadania (próba ${attempts + 1}/${maxAttempts})...`
      );

      const statusResponse = await axios.get(
        `https://api.openai.com/v1/threads/${threadId}/runs/${runId}`,
        {
          headers,
          timeout: 30000,
        }
      );

      runStatus = statusResponse.data.status;
      console.log(
        `Status zadania (próba ${attempts + 1}/${maxAttempts}):`,
        runStatus
      );

      if (statusResponse.data.last_error) {
        console.error(
          "Błąd podczas wykonywania zadania:",
          statusResponse.data.last_error
        );
      }

      attempts++;

      if (attempts >= maxAttempts) {
        console.error(
          "Przekroczono maksymalną liczbę prób oczekiwania na zakończenie zadania"
        );
        throw new Error(
          "Przekroczono maksymalną liczbę prób oczekiwania na zakończenie zadania"
        );
      }
    } while (
      runStatus !== "completed" &&
      runStatus !== "failed" &&
      runStatus !== "cancelled" &&
      runStatus !== "expired"
    );

    if (runStatus !== "completed") {
      console.error(
        `Asystent nie zdołał ukończyć zadania, status: ${runStatus}`
      );
      throw new Error(
        `Asystent nie zdołał ukończyć zadania, status: ${runStatus}`
      );
    }

    // Krok 5: Pobierz wiadomości z wątku
    console.log("Pobieram wiadomości z wątku...");
    const messagesResponse = await axios.get(
      `https://api.openai.com/v1/threads/${threadId}/messages`,
      {
        headers,
        timeout: 30000,
      }
    );
    console.log(
      "Odpowiedź z wiadomościami:",
      JSON.stringify(messagesResponse.data).substring(0, 500) + "..."
    );

    // Znajdź ostatnią wiadomość od asystenta
    const assistantMessages = messagesResponse.data.data.filter(
      (msg) => msg.role === "assistant"
    );
    if (assistantMessages.length === 0) {
      console.error("Brak odpowiedzi od asystenta");
      throw new Error("Brak odpowiedzi od asystenta");
    }

    // Zwróć treść ostatniej wiadomości
    console.log("Pobrano odpowiedź od asystenta");
    return assistantMessages[0].content[0].text.value;
  } catch (error) {
    console.error("Błąd podczas wywoływania asystenta:", {
      message: error.message,
      code: error.code,
      stack: error.stack,
      response: error.response?.data,
      status: error.response?.status,
    });
    throw error;
  }
}

// Funkcja testowa dla OpenAI completions endpoint
async function testOpenAICompletions() {
  console.log("Rozpoczynam test endpointu completions...");
  const headers = {
    Authorization: `Bearer ${OPENAI_API_KEY}`,
    "Content-Type": "application/json",
  };

  const requestData = {
    model: "text-davinci-003",
    prompt: "Test",
    max_tokens: 10,
  };

  console.log("Wysyłam żądanie do OpenAI:", {
    url: "https://api.openai.com/v1/completions",
    headers,
    data: requestData,
  });

  try {
    const response = await axios.post(
      "https://api.openai.com/v1/completions",
      requestData,
      {
        headers,
        timeout: 30000,
      }
    );
    console.log("Odpowiedź OpenAI:", response.data);
    return response.data;
  } catch (error) {
    console.error("Błąd OpenAI:", {
      message: error.message,
      code: error.code,
      stack: error.stack,
      response: error.response?.data,
      status: error.response?.status,
    });
    throw error;
  }
}

module.exports = {
  callAssistant,
  testOpenAICompletions,
};
