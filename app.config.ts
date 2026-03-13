import type { ConfigContext, ExpoConfig } from "expo/config";

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: "Launch3001",
  slug: "launch3001",
  scheme: "launch3001",
  version: "1.0.0",
  orientation: "default",
  userInterfaceStyle: "automatic",
  newArchEnabled: true,
  jsEngine: "hermes",
  splash: {
    backgroundColor: "#07111f"
  },
  ios: {
    supportsTablet: true,
    requireFullScreen: true,
    bundleIdentifier: "com.bigslickgames.launch3001"
  },
  android: {
    package: "com.bigslickgames.launch3001",
    adaptiveIcon: {
      backgroundColor: "#07111f"
    }
  },
  web: {
    bundler: "metro",
    output: "static"
  },
  plugins: [
    "expo-router",
    "expo-asset",
    [
      "expo-sensors",
      {
        motionPermission:
          "Launch3001 uses motion controls so you can tilt the rocket through lunar tunnels."
      }
    ],
    [
      "expo-screen-orientation",
      {
        initialOrientation: "DEFAULT"
      }
    ]
  ],
  experiments: {
    typedRoutes: true
  },
  extra: {
    ...(config.extra ?? {}),
    router: {
      ...((config.extra as { router?: Record<string, unknown> } | undefined)
        ?.router ?? {}),
      root: "app"
    }
  }
});
