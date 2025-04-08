const axios = require("axios");

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

// Funkcja do pobierania ID głosu dla języka polskiego na podstawie płci awatara
async function getPolishVoiceId(gender) {
  console.log(`Próba pobrania ID głosu dla języka polskiego i płci: ${gender}`);
  try {
    const response = await axios.get("https://api.heygen.com/v2/voices", {
      headers: {
        "X-Api-Key": process.env.HEYGEN_API_KEY,
        Accept: "application/json",
      },
    });
    console.log(`Otrzymano ${response.data.data.voices.length} głosów z API`);
    const voices = response.data.data.voices;

    // Filtrowanie głosów polskich i zgodnych z płcią
    const polishVoices = voices.filter((v) => v.language === "Polish");
    if (!polishVoices.length) {
      console.error("Brak dostępnych głosów dla języka polskiego");
      throw new Error("Brak dostępnych głosów dla języka polskiego");
    }

    let voice;
    if (gender.toLowerCase() === "male") {
      voice =
        polishVoices.find((v) => v.gender.toLowerCase() === "male") ||
        polishVoices[0];
    } else if (gender.toLowerCase() === "female") {
      voice =
        polishVoices.find((v) => v.gender.toLowerCase() === "female") ||
        polishVoices[0];
    } else {
      voice = polishVoices[0]; // Domyślny głos, jeśli płeć nie jest określona
    }

    if (!voice) {
      console.error(`Brak głosu dla płci ${gender} w języku polskim`);
      throw new Error(`Brak głosu dla płci ${gender} w języku polskim`);
    }

    console.log(
      `Znaleziono głos polski, ID: ${voice.voice_id}, Płeć: ${voice.gender}`
    );
    return voice.voice_id;
  } catch (error) {
    console.error("Błąd podczas pobierania ID głosu:", error.message);
    throw error;
  }
}

// Funkcja do generowania wideo w HeyGen
async function generateHeyGenVideo(avatarId, text) {
  console.log("Generuję wideo w HeyGen...");
  try {
    // Pobierz dane awatara, aby określić płeć
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

    // Pobierz odpowiedni głos na podstawie płci awatara
    const voiceId = await getPolishVoiceId(avatar.gender);

    const response = await axios.post(
      "https://api.heygen.com/v2/video/generate",
      {
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
          width: 1280,
          height: 720,
        },
      },
      {
        headers: {
          "X-Api-Key": process.env.HEYGEN_API_KEY,
          "Content-Type": "application/json",
        },
      }
    );
    console.log("Wideo wygenerowane, ID:", response.data.data.video_id);
    return response.data.data.video_id;
  } catch (error) {
    console.error("Błąd podczas generowania wideo:", error.message);
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

module.exports = {
  getAvatarIdByName,
  getPolishVoiceId,
  generateHeyGenVideo,
  waitForVideoCompletion,
  verifyAndUseAvatarId,
};
