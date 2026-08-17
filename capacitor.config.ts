import type { CapacitorConfig } from "@capacitor/cli";

// Native shell for the Gabley app (iOS + Android).
//
// The web app is server-rendered, so the native shell loads the deployed site
// instead of a static bundle. Point `server.url` at your production domain
// before submitting to the App Store / Play Store.
const config: CapacitorConfig = {
  appId: "app.lovable.gabley",
  appName: "Gabley",
  webDir: "dist/client",
  server: {
    url: process.env["CAPACITOR_SERVER_URL"] ?? "https://gabley.co.uk",
    cleartext: false,
    androidScheme: "https",
  },
  ios: {
    contentInset: "always",
    limitsNavigationsToAppBoundDomains: false,
  },
  android: {
    allowMixedContent: false,
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 1200,
      backgroundColor: "#0f172a",
      showSpinner: false,
      androidScaleType: "CENTER_CROP",
    },
    StatusBar: {
      style: "DARK",
      backgroundColor: "#0f172a",
    },
  },
};

export default config;
