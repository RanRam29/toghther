module.exports = function (api) {
  api.cache(true);
  return {
    presets: [
      [
        "babel-preset-expo",
        {
          jsxImportSource: "nativewind",
          // Metro web bundles load as classic scripts (no type=module); transform import.meta for ESM deps (e.g. zustand).
          unstable_transformImportMeta: true,
        },
      ],
      "nativewind/babel",
    ],
    plugins: ["react-native-reanimated/plugin"],
  };
};
