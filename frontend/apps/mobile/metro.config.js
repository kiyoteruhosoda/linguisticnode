/* eslint-disable */
const { getDefaultConfig } = require('expo/metro-config');

// npm workspaces の monorepo は expo/metro-config が自分で見つけて、
// frontend/ を監視し frontend/node_modules も引く（SDK 52 から）。
//
// Expo 52 の頃は、スマホ版の react-native（0.76.9）と Web 版が引き上げた
// react-native（0.84）が食い違い、resolveRequest で前者へ寄せていた。
// Expo 58 で両方 0.88 に揃ったので、その寄せは外した（#688）。
module.exports = getDefaultConfig(__dirname);
