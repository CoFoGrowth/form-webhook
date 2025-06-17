const axios = require("axios");

// Funkcja do testowania połączenia z HeyGen API
async function testHeyGenConnection() {
  console.log("Testuję połączenie z HeyGen API...");
  try {
    const response = await axios.get("https://api.heygen.com/v1/user.get", {
      headers: {
        "X-Api-Key": process.env.HEYGEN_API_KEY,
        Accept: "application/json",
      },
    });
    console.log("Połączenie z HeyGen API: ✅ OK");
    console.log("Informacje o użytkowniku:", {
      email: response.data.data.email,
      remaining_quota: response.data.data.remaining_quota,
      used_quota: response.data.data.used_quota,
    });
    return true;
  } catch (error) {
    console.error("Błąd połączenia z HeyGen API: ❌", error.message);
    if (error.response) {
      console.error("Status:", error.response.status);
      console.error("Data:", error.response.data);
    }
    return false;
  }
}

// Funkcja do pobierania ID awatara na podstawie nazwy
async function getAvatarIdByName(name) {
  console.log(`Próba pobrania ID awatara dla nazwy: ${name}`);
  try {
    const response = await axios.get("https://api.heygen.com/v2/avatars", {
      headers: {
        "X-Api-Key": process.env.HEYGEN_API_KEY,
        Accept: "application/json",
      },
    });
    console.log(
      `Otrzymano ${response.data.data.avatars.length} awatarów z API`
    );
    const avatars = response.data.data.avatars;
    const avatar = avatars.find(
      (a) => a.avatar_name.toLowerCase() === name.toLowerCase()
    );
    if (!avatar) {
      console.error(`Awatar ${name} nie został znaleziony`);
      throw new Error(`Awatar ${name} nie został znaleziony`);
    }
    console.log(`Znaleziono awatar: ${name}, ID: ${avatar.avatar_id}`);
    return avatar.avatar_id;
  } catch (error) {
    console.error(`Błąd podczas pobierania ID awatara ${name}:`, error.message);
    throw error;
  }
}

// Funkcja do pobierania ID głosu dla języka polskiego na podstawie awatara i płci
async function getPolishVoiceId(avatarId, gender) {
  console.log(
    `Próba pobrania ID głosu dla awatara: ${avatarId} i płci: ${gender}`
  );

  // Specjalne awatary z dedykowanymi głosami
  const specialAvatarVoices = {
    // Klient 0001
    fc0c0ebdd4da412a8325cec59911ff74: "b47385bd5db6460aa90c58e2070fe589",
    "88989364f8d34bd2b6a7aee2eef74910": "a0053199b97243f09d8b029e61b1d882",
    "7de56ac82e184a3097f540696c1e2b1d": "1b2b0abed276404498b2cbbbda7d1d32",
    "74e3eac3e1d145b29b5a5ec2f06e6c2a": "63d8a34a3765464a8e8375be2e9aade9",
    d53fc781b5d54205b5b713d39906c8cd: "ae8b7b2f66bb43398e29d4be4e411c8b",

    // Klient 0002
    "649781898578442d936b70762071b79d": "6650bc2d5f334f07b2f1517d421d5165",
    "90e61fb86ac74849ad13ba6b5ea70c8a": "61c0be5bb8004350a9fb78e38891193e",
    "61b861db8ead447fb481b621f2254273": "f870ef5e02904da6a23423c754b72365",
    a33a613eacc547fb996f36cf6b3976d4: "3419f5469f0349bab86d9f959c1fdbbe",
  };

  if (avatarId && specialAvatarVoices[avatarId]) {
    const voiceId = specialAvatarVoices[avatarId];
    console.log(
      `Znaleziono specjalny awatar: ${avatarId}, używam dedykowanego głosu: ${voiceId}`
    );
    return voiceId;
  }

  try {
    const response = await axios.get("https://api.heygen.com/v2/voices", {
      headers: {
        "X-Api-Key": process.env.HEYGEN_API_KEY,
        Accept: "application/json",
      },
    });
    console.log(`Otrzymano ${response.data.data.voices.length} głosów z API`);
    const voices = response.data.data.voices;

    // Filtrowanie głosów polskich
    const polishVoices = voices.filter((v) => v.language === "Polish");
    if (!polishVoices.length) {
      console.error("Brak dostępnych głosów dla języka polskiego");
      throw new Error("Brak dostępnych głosów dla języka polskiego");
    }

    // Domyślne ID głosów
    const femaleVoiceId = "ba3b2274201d4f18b8b6888ad991bffe";
    const maleVoiceId = "c126eda711af4a2086c4cfb60ae93304";

    if (gender && typeof gender === "string") {
      const lowerGender = gender.toLowerCase();
      if (lowerGender === "female") {
        console.log(`Wybrano głos kobiecy: ${femaleVoiceId}`);
        return femaleVoiceId;
      } else if (lowerGender === "male") {
        console.log(`Wybrano głos męski: ${maleVoiceId}`);
        return maleVoiceId;
      }
    }

    console.log(`Używam domyślnego głosu kobiecego: ${femaleVoiceId}`);
    return femaleVoiceId;
  } catch (error) {
    console.error("Błąd podczas pobierania ID głosu:", error.message);
    throw error;
  }
}

// Funkcja pomocnicza do wykonywania requestu z retry
async function makeRequestWithRetry(requestFn, maxRetries = 3, delay = 5000) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await requestFn();
    } catch (error) {
      console.log(`Próba ${attempt}/${maxRetries} nie powiodła się`);

      // Jeśli to ostatnia próba lub błąd nie jest 500, rzuć błąd
      if (
        attempt === maxRetries ||
        (error.response && error.response.status !== 500)
      ) {
        throw error;
      }

      console.log(`Czekam ${delay}ms przed kolejną próbą...`);
      await new Promise((resolve) => setTimeout(resolve, delay));
      delay *= 1.5; // Zwiększ opóźnienie dla kolejnych prób
    }
  }
}

// Funkcja do generowania wideo w HeyGen
async function generateHeyGenVideo(avatarId, voiceId, text) {
  console.log("Generuję wideo w HeyGen...");
  console.log(`Avatar ID: ${avatarId}`);
  console.log(`Voice ID: ${voiceId}`);
  console.log(`Text length: ${text ? text.length : 0} characters`);

  // Walidacja parametrów wejściowych
  if (!avatarId || !voiceId || !text) {
    throw new Error("Brakuje wymaganych parametrów (avatarId, voiceId, text)");
  }

  if (text.length > 8000) {
    throw new Error("Tekst jest za długi (maksymalnie 8000 znaków)");
  }

  try {
    // Weryfikacja kompatybilności głosu z awatarem
    const isCompatible = await verifyVoiceAvatarCompatibility(
      avatarId,
      voiceId
    );
    if (!isCompatible) {
      console.warn(
        "Wykryto potencjalny problem z kompatybilnością, ale kontynuuję..."
      );
    }

    const avatarResponse = await axios.get(
      "https://api.heygen.com/v2/avatars",
      {
        headers: {
          "X-Api-Key": process.env.HEYGEN_API_KEY,
          Accept: "application/json",
        },
      }
    );
    const avatar = avatarResponse.data.data.avatars.find(
      (a) => a.avatar_id === avatarId
    );
    if (!avatar) {
      throw new Error(`Awatar o ID ${avatarId} nie istnieje`);
    }

    const requestData = {
      video_inputs: [
        {
          character: {
            type: "avatar",
            avatar_id: avatarId,
            avatar_style: "normal",
          },
          voice: {
            type: "text",
            input_text: text,
            voice_id: voiceId,
            speed: 1.0,
          },
        },
      ],
      dimension: {
        width: 720,
        height: 1280,
      },
    };

    console.log(
      "Wysyłam request do HeyGen:",
      JSON.stringify(requestData, null, 2)
    );

    const response = await makeRequestWithRetry(() =>
      axios.post("https://api.heygen.com/v2/video/generate", requestData, {
        headers: {
          "X-Api-Key": process.env.HEYGEN_API_KEY,
          "Content-Type": "application/json",
        },
      })
    );
    console.log("Wideo wygenerowane, ID:", response.data.data.video_id);
    return response.data.data.video_id;
  } catch (error) {
    console.error("Błąd podczas generowania wideo:", error.message);

    // Logowanie szczegółowych informacji o błędzie
    if (error.response) {
      console.error("Status błędu:", error.response.status);
      console.error("Headers błędu:", error.response.headers);
      console.error(
        "Data błędu:",
        JSON.stringify(error.response.data, null, 2)
      );

      // Jeśli błąd 500 i używamy specjalnego głosu, spróbuj z domyślnym
      if (error.response.status === 500) {
        const specialAvatarVoices = {
          // Klient 0001
          fc0c0ebdd4da412a8325cec59911ff74: "b47385bd5db6460aa90c58e2070fe589",
          "88989364f8d34bd2b6a7aee2eef74910":
            "a0053199b97243f09d8b029e61b1d882",
          "7de56ac82e184a3097f540696c1e2b1d":
            "1b2b0abed276404498b2cbbbda7d1d32",
          "74e3eac3e1d145b29b5a5ec2f06e6c2a":
            "63d8a34a3765464a8e8375be2e9aade9",
          d53fc781b5d54205b5b713d39906c8cd: "ae8b7b2f66bb43398e29d4be4e411c8b",

          // Klient 0002
          "649781898578442d936b70762071b79d":
            "6650bc2d5f334f07b2f1517d421d5165",
          "90e61fb86ac74849ad13ba6b5ea70c8a":
            "61c0be5bb8004350a9fb78e38891193e",
          "61b861db8ead447fb481b621f2254273":
            "f870ef5e02904da6a23423c754b72365",
          a33a613eacc547fb996f36cf6b3976d4: "3419f5469f0349bab86d9f959c1fdbbe",
        };

        if (specialAvatarVoices[avatarId] === voiceId) {
          console.log("Próbuję ponownie z domyślnym głosem polskim...");
          const defaultVoiceId = "ba3b2274201d4f18b8b6888ad991bffe"; // domyślny kobiecy głos

          const fallbackRequestData = {
            video_inputs: [
              {
                character: {
                  type: "avatar",
                  avatar_id: avatarId,
                  avatar_style: "normal",
                },
                voice: {
                  type: "text",
                  input_text: text,
                  voice_id: defaultVoiceId,
                  speed: 1.0,
                },
              },
            ],
            dimension: {
              width: 720,
              height: 1280,
            },
          };

          try {
            console.log(
              "Wysyłam fallback request z domyślnym głosem:",
              JSON.stringify(fallbackRequestData, null, 2)
            );
            const fallbackResponse = await axios.post(
              "https://api.heygen.com/v2/video/generate",
              fallbackRequestData,
              {
                headers: {
                  "X-Api-Key": process.env.HEYGEN_API_KEY,
                  "Content-Type": "application/json",
                },
              }
            );
            console.log(
              "Fallback wideo wygenerowane pomyślnie, ID:",
              fallbackResponse.data.data.video_id
            );
            return fallbackResponse.data.data.video_id;
          } catch (fallbackError) {
            console.error(
              "Fallback również nie powiódł się:",
              fallbackError.message
            );
          }
        }
      }
    } else if (error.request) {
      console.error("Brak odpowiedzi z serwera:", error.request);
    } else {
      console.error("Błąd konfiguracji request:", error.message);
    }

    throw error;
  }
}

// Funkcja oczekująca na zakończenie generowania wideo
async function waitForVideoCompletion(videoId) {
  console.log("Czekam na zakończenie generowania wideo...");
  const maxAttempts = 35;
  let attempts = 0;
  while (attempts < maxAttempts) {
    try {
      const response = await axios.get(
        `https://api.heygen.com/v1/video_status.get?video_id=${videoId}`,
        {
          headers: {
            "X-Api-Key": process.env.HEYGEN_API_KEY,
            Accept: "application/json",
          },
        }
      );
      const status = response.data.data.status;
      console.log(
        `Status wideo (próba ${attempts + 1}/${maxAttempts}):`,
        status
      );

      if (status === "completed") {
        console.log("Wideo gotowe, URL:", response.data.data.video_url);
        return response.data.data.video_url;
      } else if (status === "failed") {
        throw new Error("Generowanie wideo nie powiodło się");
      }

      await new Promise((resolve) => setTimeout(resolve, 20000));
      attempts++;
    } catch (error) {
      console.error("Błąd podczas sprawdzania statusu wideo:", error.message);
      throw error;
    }
  }
  throw new Error("Przekroczono limit czasu generowania wideo");
}

// Funkcja do weryfikacji i używania avatar_id
async function verifyAndUseAvatarId(avatarId) {
  console.log(`Weryfikuję avatar_id: ${avatarId}`);
  try {
    if (!avatarId || typeof avatarId !== "string") {
      throw new Error("Nieprawidłowy format avatar_id");
    }

    const response = await axios.get("https://api.heygen.com/v2/avatars", {
      headers: {
        "X-Api-Key": process.env.HEYGEN_API_KEY,
        Accept: "application/json",
      },
    });

    console.log(
      `Otrzymano ${response.data.data.avatars.length} awatarów z API`
    );
    const avatars = response.data.data.avatars;

    const avatar = avatars.find((a) => a.avatar_id === avatarId);
    if (!avatar) {
      console.error(`Awatar z ID ${avatarId} nie został znaleziony`);
      throw new Error(`Awatar z ID ${avatarId} nie został znaleziony`);
    }

    console.log(
      `Znaleziono awatar: ${avatar.avatar_name} (${avatar.gender}), ID: ${avatar.avatar_id}`
    );
    return avatar.avatar_id;
  } catch (error) {
    console.error(
      `Błąd podczas weryfikacji avatar_id ${avatarId}:`,
      error.message
    );
    throw error;
  }
}

// Funkcja do weryfikacji kompatybilności głosu z awatarem
async function verifyVoiceAvatarCompatibility(avatarId, voiceId) {
  console.log(
    `Weryfikuję kompatybilność głosu ${voiceId} z awatarem ${avatarId}`
  );

  try {
    // Pobierz informacje o głosie
    const voicesResponse = await axios.get("https://api.heygen.com/v2/voices", {
      headers: {
        "X-Api-Key": process.env.HEYGEN_API_KEY,
        Accept: "application/json",
      },
    });

    const voice = voicesResponse.data.data.voices.find(
      (v) => v.voice_id === voiceId
    );
    if (!voice) {
      console.error(`Głos o ID ${voiceId} nie został znaleziony`);
      return false;
    }

    console.log(
      `Znaleziono głos: ${voice.display_name} (${voice.language}, ${voice.gender})`
    );

    // Pobierz informacje o awatarze
    const avatarsResponse = await axios.get(
      "https://api.heygen.com/v2/avatars",
      {
        headers: {
          "X-Api-Key": process.env.HEYGEN_API_KEY,
          Accept: "application/json",
        },
      }
    );

    const avatar = avatarsResponse.data.data.avatars.find(
      (a) => a.avatar_id === avatarId
    );
    if (!avatar) {
      console.error(`Awatar o ID ${avatarId} nie został znaleziony`);
      return false;
    }

    console.log(`Znaleziono awatar: ${avatar.avatar_name} (${avatar.gender})`);

    // Sprawdź kompatybilność płci (jeśli dostępna)
    if (
      avatar.gender &&
      voice.gender &&
      avatar.gender !== "unknown" &&
      voice.gender !== "unknown"
    ) {
      if (avatar.gender !== voice.gender) {
        console.warn(
          `Ostrzeżenie: Płeć awatara (${avatar.gender}) nie pasuje do płci głosu (${voice.gender})`
        );
      }
    }

    return true;
  } catch (error) {
    console.error("Błąd podczas weryfikacji kompatybilności:", error.message);
    return false;
  }
}

module.exports = {
  getAvatarIdByName,
  getPolishVoiceId,
  generateHeyGenVideo,
  waitForVideoCompletion,
  verifyAndUseAvatarId,
  verifyVoiceAvatarCompatibility,
  testHeyGenConnection,
};
