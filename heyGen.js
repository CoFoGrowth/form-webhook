const axios = require("axios");

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

const AVATAR_VOICE_MAPPING = {
  // 0002
  ef912416d4dc4ed1b492a09ed7c6846a: "a410f19b3706444fb92a25c65b657551",
  "90e61fb86ac74849ad13ba6b5ea70c8a": "882a52ba43fa444ab119eaafacd33515",
  "61b861db8ead447fb481b621f2254273": "06d268085a414781852dafe9e64a51db",
  a33a613eacc547fb996f36cf6b3976d4: "6f3cdda55791435494cff9806af6aef3",

  // 0001
  fc0c0ebdd4da412a8325cec59911ff74: "b47385bd5db6460aa90c58e2070fe589",
  "88989364f8d34bd2b6a7aee2eef74910": "a0053199b97243f09d8b029e61b1d882",
  "7de56ac82e184a3097f540696c1e2b1d": "1b2b0abed276404498b2cbbbda7d1d32",
  "74e3eac3e1d145b29b5a5ec2f06e6c2a": "63d8a34a3765464a8e8375be2e9aade9",
  d53fc781b5d54205b5b713d39906c8cd: "ae8b7b2f66bb43398e29d4be4e411c8b",
  e4f99e04c3a64759a8306695446a1315: "77b02d418dff418ea4a59954ddff90e9",
  f91cb72e3456475386b6f1a53e63a24c: "77b02d418dff418ea4a59954ddff90e9",
  "14bb685a7fe54b59a395a4653e300da9": "77b02d418dff418ea4a59954ddff90e9",
  d19813e5217547fcaf5293181b0c39b5: "77b02d418dff418ea4a59954ddff90e9",
  "3cafa5d8091843b3936f4a1592a39b84": "77b02d418dff418ea4a59954ddff90e9",
  "117048e935de41deb14f39a0aa27661e": "77b02d418dff418ea4a59954ddff90e9",
  "3c3ddaa1a99844c682d810290539fda8": "ae8b7b2f66bb43398e29d4be4e411c8b",
  "72119bafb4674537af105164001cf734": "1b2b0abed276404498b2cbbbda7d1d32",
  bcd3a34820fa4aa9a417e3686e43acff: "77b02d418dff418ea4a59954ddff90e9",

  // Nowe awatary Zuzanna dla 0001
  "8682655562b3432d84bfe2189b492319": "a58b3f59627e4c1faf12abf5d18a347b", // Zuzanna_nowyNowy_1
  d394a04b1c2548238d3b4953f739efe5: "c0dc6968f42e422b9da80abe3580bb11", // Zuzanna_nowyNowy_2
  "4d155442543b49d2b41590a4133e0444": "917fdc23e0af4719b145bdca31adb89f", // Zuzanna_nowyNowy_3
  "9092040beff14d598eb8fc7a19050981": "16801b2fd8714103a39bdbb51a9863ae", // Zuzanna_nowyNowy_4
  aad991539a724bd1a5ee733bc4c2e0dc: "8b64b3c16739424b8cfa2590c30fd5eb", // Zuzanna_nowyNowy_5
  "9307c5ee4c124e6e9ab73c24aaeb7c49": "696fcd7da6784ce4bed95e5e6b72ffae", // Zuzanna_nowyNowy_6
  d0454740b1854f1e8ae4ed4d323e664d: "bc4fcc17960343ca91846951c42273c3", // Zuzanna_nowyNowy_7
  "73fcb4393f144904a39f2707443cb285": "bd0c198175dc472ea58f4c243f6eb37e", // Zuzanna_nowyNowy_8
  "77746b1abab54cd4b7314bbe4ea35853": "f1aad6e1fa0f40fc8d31231fcc8c974b", // Zuzanna_nowyNowy_9

  // 0004
  "680c8f7675c7438481930d2346e338a7": "7fbad8be3d2949f49648bf8726bcb46d",

  // Nowe awatary z głosem 21eae9a0a9324e0bbabf83466818e692
  "65d13e86b4294c749e3af7dbcd94a349": "21eae9a0a9324e0bbabf83466818e692",
  a43bd672e8884c24a15cf9d4814d0270: "21eae9a0a9324e0bbabf83466818e692",
  e673b8786d8e425eb8a1e35632c3893f: "21eae9a0a9324e0bbabf83466818e692",
  ff3c90b413474336a876468b569ebe79: "21eae9a0a9324e0bbabf83466818e692",
  e55bd14a83b44605a32cd3a78aa26212: "21eae9a0a9324e0bbabf83466818e692",
  "861d0719630446f5aeff671c1e4303b2": "21eae9a0a9324e0bbabf83466818e692",
};

async function verifyVoiceMappings() {
  console.log("🔍 Weryfikuję mapowania głosów...");

  try {
    const response = await axios.get("https://api.heygen.com/v2/voices", {
      headers: {
        "X-Api-Key": process.env.HEYGEN_API_KEY,
        Accept: "application/json",
      },
    });

    const voices = response.data.data.voices;
    const verifiedMappings = {};

    for (const [avatarId, voiceId] of Object.entries(AVATAR_VOICE_MAPPING)) {
      const voice = voices.find((v) => v.voice_id === voiceId);
      if (voice) {
        verifiedMappings[avatarId] = voiceId;
        const name =
          voice.name || voice.display_name || voice.voice_name || "Bez nazwy";
        console.log(`✅ ${avatarId} -> ${voiceId} (${name})`);
      } else {
        console.log(`❌ ${avatarId} -> ${voiceId} (GŁOS NIE ISTNIEJE)`);
      }
    }

    return verifiedMappings;
  } catch (error) {
    console.error("❌ Błąd podczas weryfikacji mapowań:", error.message);
    return {};
  }
}

// Funkcja do pobierania ID głosu dla języka polskiego na podstawie awatara i płci
async function getPolishVoiceId(avatarId, gender) {
  console.log(
    `Próba pobrania ID głosu dla awatara: ${avatarId} i płci: ${gender}`
  );

  // Sprawdź czy dla tego awatara jest dedykowany głos z mapowania
  if (avatarId && AVATAR_VOICE_MAPPING[avatarId]) {
    const voiceId = AVATAR_VOICE_MAPPING[avatarId];
    console.log(
      `🎯 Znaleziono mapowanie: awatar ${avatarId} -> głos ${voiceId}`
    );

    // Weryfikuj czy głos rzeczywiście istnieje
    try {
      const response = await axios.get("https://api.heygen.com/v2/voices", {
        headers: {
          "X-Api-Key": process.env.HEYGEN_API_KEY,
          Accept: "application/json",
        },
      });

      const voice = response.data.data.voices.find(
        (v) => v.voice_id === voiceId
      );
      if (voice) {
        const name =
          voice.name || voice.display_name || voice.voice_name || "Bez nazwy";
        console.log(`✅ Potwierdzono istnienie głosu: ${name} (${voiceId})`);
        return voiceId;
      } else {
        console.warn(
          `❌ Głos ${voiceId} nie istnieje w HeyGen! Przechodzę na fallback.`
        );
      }
    } catch (error) {
      console.error("Błąd podczas weryfikacji głosu:", error.message);
    }
  }

  try {
    // Pobierz informacje o awatarze dla lepszego dopasowania głosu
    let avatarGender = gender;
    if (avatarId && !avatarGender) {
      try {
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
        if (avatar && avatar.gender !== "unknown") {
          avatarGender = avatar.gender;
          console.log(`Pobrano płeć awatara z API: ${avatarGender}`);
        }
      } catch (err) {
        console.warn(
          "Nie udało się pobrać informacji o awatarze:",
          err.message
        );
      }
    }

    // Znajdź najlepszy dostępny głos polski
    const bestVoiceId = await findBestPolishVoice(avatarGender);
    console.log(`Finalnie wybrano głos: ${bestVoiceId}`);
    return bestVoiceId;
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

    // Transformacja tekstu - dodanie większych przerw między zdaniami
    const processedText = text
      .split(/(?<=[.?!])\s+/)
      .map((s) => s.trim())
      .filter(Boolean)
      .join("\n\n");

    console.log(
      `Przekształcony tekst dla lepszych przerw między zdaniami (${processedText.length} znaków)`
    );

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
            input_text: processedText,
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

        // Sprawdź czy używamy niedziałającego głosu i spróbuj z innym
        console.log("Próbuję ponownie z alternatywnym głosem polskim...");
        try {
          const alternativeVoiceId = await findBestPolishVoice("female"); // spróbuj z głosem kobiecym

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
                  input_text: processedText,
                  voice_id: alternativeVoiceId, // użyj alternatywnego głosu
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
            "Wysyłam fallback request z alternatywnym głosem:",
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

// Funkcja do pobierania wszystkich dostępnych głosów polskich
async function getAvailablePolishVoices() {
  console.log("Pobieram dostępne głosy polskie...");
  try {
    const response = await axios.get("https://api.heygen.com/v2/voices", {
      headers: {
        "X-Api-Key": process.env.HEYGEN_API_KEY,
        Accept: "application/json",
      },
    });

    const voices = response.data.data.voices;
    const polishVoices = voices.filter((v) => v.language === "Polish");

    console.log(`Znaleziono ${polishVoices.length} głosów polskich:`);
    polishVoices.forEach((voice, index) => {
      const name =
        voice.name ||
        voice.display_name ||
        voice.voice_name ||
        `Voice_${index + 1}`;
      console.log(
        `- ${name} (${voice.voice_id}) - ${voice.gender || "unknown"}`
      );
    });

    return polishVoices;
  } catch (error) {
    console.error("Błąd podczas pobierania głosów polskich:", error.message);
    return [];
  }
}

// Funkcja do znalezienia najlepszego głosu polskiego dla awatara
async function findBestPolishVoice(avatarGender = null) {
  console.log(
    `Szukam najlepszego głosu polskiego dla płci: ${avatarGender || "unknown"}`
  );

  const polishVoices = await getAvailablePolishVoices();

  if (!polishVoices.length) {
    throw new Error("Brak dostępnych głosów polskich");
  }

  // Sprawdź czy istnieją nasze preferowane głosy
  const preferredFemaleId = "ba3b2274201d4f18b8b6888ad991bffe";
  const preferredMaleId = "36969ead9c664bd68c88642b23d53cc2"; // Tomasz - męski głos

  const preferredFemale = polishVoices.find(
    (v) => v.voice_id === preferredFemaleId
  );
  const preferredMale = polishVoices.find(
    (v) => v.voice_id === preferredMaleId
  );

  // Jeśli awatar ma określoną płeć, wybierz odpowiedni głos
  if (avatarGender === "female" && preferredFemale) {
    console.log(
      `Wybrano preferowany głos kobiecy: ${preferredFemale.display_name}`
    );
    return preferredFemale.voice_id;
  }

  if (avatarGender === "male" && preferredMale) {
    console.log(
      `Wybrano preferowany głos męski: ${preferredMale.display_name}`
    );
    return preferredMale.voice_id;
  }

  // Fallback - dla nieznanych płci wybierz męski głos jako domyślny
  if (preferredMale) {
    console.log(
      `Fallback: wybrano domyślny męski głos: ${preferredMale.display_name} (${preferredMale.voice_id})`
    );
    return preferredMale.voice_id;
  }

  // Ostateczny fallback - pierwszy dostępny głos
  const firstAvailable = polishVoices[0];
  console.log(
    `Ostateczny fallback: wybrano pierwszy dostępny głos: ${firstAvailable.display_name} (${firstAvailable.voice_id})`
  );
  return firstAvailable.voice_id;
}

// Funkcja do sprawdzania statusu HeyGen API i quoty
async function checkHeyGenStatus() {
  console.log("Sprawdzam status HeyGen API...");
  try {
    // Spróbuj prostego endpointu do sprawdzenia czy API działa
    const response = await axios.get("https://api.heygen.com/v2/voices", {
      headers: {
        "X-Api-Key": process.env.HEYGEN_API_KEY,
        Accept: "application/json",
      },
    });

    console.log("Status HeyGen API: ✅ Aktywny");
    console.log(
      `Znaleziono ${response.data.data.voices.length} głosów w systemie`
    );

    // Sprawdź czy API key jest prawidłowy
    if (response.data && response.data.data) {
      console.log("✅ API Key jest prawidłowy");
      return true;
    } else {
      console.error("❌ Nieprawidłowa odpowiedź z API");
      return false;
    }
  } catch (error) {
    console.error("❌ Problem z HeyGen API:", error.message);
    if (error.response) {
      console.error("Status:", error.response.status);
      console.error("Data:", error.response.data);
    }
    return false;
  }
}

// Funkcja do pełnej analizy głosów w HeyGen
async function analyzeAllVoices() {
  console.log("🔍 Analizuję wszystkie głosy w HeyGen...");
  try {
    const response = await axios.get("https://api.heygen.com/v2/voices", {
      headers: {
        "X-Api-Key": process.env.HEYGEN_API_KEY,
        Accept: "application/json",
      },
    });

    const voices = response.data.data.voices;
    console.log(`📊 Znaleziono ${voices.length} głosów łącznie`);

    // Sprawdź strukturę pierwszego głosu
    if (voices.length > 0) {
      console.log("🔬 Struktura pierwszego głosu:");
      console.log(JSON.stringify(voices[0], null, 2));
    }

    // Filtruj głosy polskie i pokaż szczegóły
    const polishVoices = voices.filter((v) => v.language === "Polish");
    console.log(`🇵🇱 Znaleziono ${polishVoices.length} głosów polskich`);

    // Sprawdź które głosy z ElevenLabs są dostępne
    const elevenLabsVoices = [
      "a410f19b3706444fb92a25c65b657551",
      "882a52ba43fa444ab119eaafacd33515",
      "06d268085a414781852dafe9e64a51db",
      "6f3cdda55791435494cff9806af6aef3",
    ];

    console.log("🎙️ Sprawdzam głosy z ElevenLabs...");
    elevenLabsVoices.forEach((voiceId) => {
      const voice = voices.find((v) => v.voice_id === voiceId);
      if (voice) {
        console.log(`✅ Znaleziono: ${voiceId}`);
        console.log(
          `   - Nazwa: ${
            voice.name || voice.display_name || voice.voice_name || "Brak nazwy"
          }`
        );
        console.log(`   - Język: ${voice.language || "Nieznany"}`);
        console.log(`   - Płeć: ${voice.gender || "Nieznana"}`);
        console.log(`   - Typ: ${voice.type || "Nieznany"}`);
      } else {
        console.log(`❌ Nie znaleziono: ${voiceId}`);
      }
    });

    // Pokaż wszystkie głosy polskie z dostępnymi polami
    console.log("\n📋 Wszystkie głosy polskie:");
    polishVoices.forEach((voice, index) => {
      const name =
        voice.name ||
        voice.display_name ||
        voice.voice_name ||
        `Voice_${index + 1}`;
      console.log(`${index + 1}. ${name} (ID: ${voice.voice_id})`);
      console.log(`   - Język: ${voice.language || "Nieznany"}`);
      console.log(`   - Płeć: ${voice.gender || "Nieznana"}`);
      console.log(`   - Typ: ${voice.type || "Nieznany"}`);
      if (voice.preview_audio) {
        console.log(`   - Podgląd: ${voice.preview_audio}`);
      }
    });

    return voices;
  } catch (error) {
    console.error("❌ Błąd podczas analizy głosów:", error.message);
    return [];
  }
}

// Funkcja testowa do sprawdzenia wszystkich głosów i mapowań
async function testVoicesAndMappings() {
  console.log("🧪 ROZPOCZYNAM PEŁNY TEST GŁOSÓW I MAPOWAŃ");
  console.log("=" * 50);

  // 1. Analiza wszystkich głosów
  await analyzeAllVoices();

  console.log("\n" + "=" * 50);

  // 2. Weryfikacja mapowań
  const verifiedMappings = await verifyVoiceMappings();

  console.log("\n" + "=" * 50);

  // 3. Test dla konkretnego awatara
  const testAvatarId = "649781898578442d936b70762071b79d";
  console.log(`🎯 Test dla awatara: ${testAvatarId}`);

  try {
    const selectedVoiceId = await getPolishVoiceId(testAvatarId, null);
    console.log(`✅ Wybrany głos: ${selectedVoiceId}`);
  } catch (error) {
    console.error(`❌ Błąd podczas wyboru głosu: ${error.message}`);
  }

  console.log("\n🧪 KONIEC TESTU");
  return verifiedMappings;
}

// Funkcja do testowania z różnymi awatarami
async function testWithDifferentAvatars() {
  console.log("🎭 Testuję różne awatary...");

  // Lista awatarów do przetestowania
  const testAvatars = [
    "649781898578442d936b70762071b79d", // problematyczny
    "90e61fb86ac74849ad13ba6b5ea70c8a", // inny z mapowania
    "fc0c0ebdd4da412a8325cec59911ff74", // z pierwszego klienta
  ];

  // Testowy tekst
  const testText = "Test wideo";

  for (const avatarId of testAvatars) {
    console.log(`\n🎭 Testuję awatar: ${avatarId}`);

    try {
      // 1. Sprawdź czy awatar istnieje
      const avatarExists = await verifyAndUseAvatarId(avatarId);
      console.log(`✅ Awatar istnieje: ${avatarExists}`);

      // 2. Wybierz głos
      const voiceId = await getPolishVoiceId(avatarId, null);
      console.log(`✅ Wybrany głos: ${voiceId}`);

      // 3. Sprawdź kompatybilność
      const isCompatible = await verifyVoiceAvatarCompatibility(
        avatarId,
        voiceId
      );
      console.log(`✅ Kompatybilność: ${isCompatible}`);

      // 4. Spróbuj wygenerować (tylko przygotuj request, nie wysyłaj)
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
              input_text: testText,
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

      console.log(`📋 Request data gotowy dla ${avatarId}`);
      console.log(JSON.stringify(requestData, null, 2));
    } catch (error) {
      console.error(`❌ Błąd dla awatara ${avatarId}: ${error.message}`);
    }
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
  getAvailablePolishVoices,
  findBestPolishVoice,
  checkHeyGenStatus,
  analyzeAllVoices,
  verifyVoiceMappings,
  testVoicesAndMappings,
  testWithDifferentAvatars,
};
