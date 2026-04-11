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

module.exports = {
  expo: {
    ...appJson.expo,
    extra: {
      ...(appJson.expo.extra ?? {}),
      anthropicApiKey: process.env.EXPO_PUBLIC_ANTHROPIC_API_KEY ?? "",
      eas: {
        projectId: "3df62a5f-0284-4232-9e6a-396b84e96320",
      },
    },
  },
};