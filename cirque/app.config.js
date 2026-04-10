const path = require("path");

// Ensure .env.local is on process.env before extra is computed (Metro HMR can miss new keys).
try {
  require("dotenv").config({ path: path.join(__dirname, ".env.local") });
} catch {
  /* dotenv optional at install time */
}
try {
  require("dotenv").config({ path: path.join(__dirname, ".env") });
} catch {
  /* optional */
}

const appJson = require("./app.json");

module.exports = {
  expo: {
    ...appJson.expo,
    extra: {
      ...(appJson.expo.extra ?? {}),
      anthropicApiKey: process.env.EXPO_PUBLIC_ANTHROPIC_API_KEY ?? "",
    },
  },
};
