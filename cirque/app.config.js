const path = require("path");

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

/**
 * EAS sets EAS_BUILD_PROFILE during `eas build` (e.g. development, preview, production).
 * Store-bound builds must not embed a client Anthropic key; food parsing uses Edge (`parse-food`) in release JS anyway.
 */
const profile = process.env.EAS_BUILD_PROFILE ?? "";
const stripClientAnthropicKey =
  profile === "production" || profile === "preview";

module.exports = {
  expo: {
    ...appJson.expo,
    extra: {
      ...(appJson.expo.extra ?? {}),
      anthropicApiKey: stripClientAnthropicKey
        ? ""
        : (process.env.EXPO_PUBLIC_ANTHROPIC_API_KEY ?? ""),
      eas: {
        projectId: "3df62a5f-0284-4232-9e6a-396b84e96320",
      },
    },
  },
};