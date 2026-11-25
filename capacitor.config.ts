import type { CapacitorConfig } from "@capacitor/cli";

/** The Android and iPhone apps: the same pages, carried inside the app. */
const config: CapacitorConfig = {
  appId: "in.unfluke.mirrorfit",
  appName: "Mirror Fit",
  webDir: "out",
  backgroundColor: "#FBF9F6",
  android: {
    // Keeps the page clear of the status and navigation bars on Android 15.
    adjustMarginsForEdgeToEdge: "auto",
  },
  ios: {
    // Keeps the page clear of the notch and the home bar.
    contentInset: "always",
  },
};

export default config;
