// Ustaw API key dla testów lokalnych
process.env.HEYGEN_API_KEY =
  "N2Y4M2Y3NWViNmJiNDQ4ZDg5MjY0YWI1ZTQ3YzU5NjYtMTczOTE3OTE4NQ==";

require("dotenv").config();
const {
  testVoicesAndMappings,
  analyzeAllVoices,
  testWithDifferentAvatars,
  checkHeyGenStatus,
} = require("./heyGen");

async function runTests() {
  console.log("🚀 ROZPOCZYNAM TESTY HEYGEN API");
  console.log("================================");

  try {
    // 1. Sprawdź status API
    console.log("1️⃣ Sprawdzam status HeyGen API...");
    const apiStatus = await checkHeyGenStatus();
    if (!apiStatus) {
      console.error("❌ Problem z API - przerywam testy");
      return;
    }

    console.log("\n2️⃣ Analizuję wszystkie głosy...");
    await analyzeAllVoices();

    console.log("\n3️⃣ Testuję mapowania i wybór głosów...");
    await testVoicesAndMappings();

    console.log("\n4️⃣ Testuję różne awatary...");
    await testWithDifferentAvatars();

    console.log("\n✅ TESTY ZAKOŃCZONE POMYŚLNIE");
  } catch (error) {
    console.error("❌ BŁĄD PODCZAS TESTÓW:", error.message);
    console.error(error.stack);
  }
}

// Uruchom testy
if (require.main === module) {
  runTests();
}

module.exports = { runTests };
