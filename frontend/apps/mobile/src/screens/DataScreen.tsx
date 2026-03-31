import AsyncStorage from "@react-native-async-storage/async-storage";
import { useEffect, useRef, useState } from "react";
import { Animated, Modal, Pressable, ScrollView, Switch, Text, View } from "react-native";
import { FontAwesome5, Ionicons } from "@expo/vector-icons";
import * as DocumentPicker from "expo-document-picker";
import * as FileSystem from "expo-file-system";
import * as Sharing from "expo-sharing";
import Constants from "expo-constants";
import * as Application from "expo-application";
import type { AppDataForImport } from "../../../../src/api/types";
import type { MobileIoGateway } from "../app/mobileServices";
import { useTheme } from "../app/ThemeContext";
import { DebugInfoScreen } from "./DebugInfoScreen";
import { LicenseScreen } from "./LicenseScreen";
import { debugLogger } from "../infra/debugLogger";

const DEBUG_MODE_STORAGE_KEY = "@debug_mode";

// EAS Build autoIncrement は app.config.ts 評価後にネイティブ versionCode を変更するため
// extra.versionCode はビルド時の古い値になる。Application.nativeBuildVersion が正確な値を返す。
const _extra = Constants.expoConfig?.extra as
  | { appVersion?: string; versionCode?: number }
  | undefined;
// expo-application の nativeBuildVersion が実際の APK versionCode を返す（SDK 52 以降推奨）
const _nativeBuildStr = Application.nativeBuildVersion;
const _nativeBuildNum = _nativeBuildStr ? Number.parseInt(_nativeBuildStr, 10) : null;
const _versionCode = _nativeBuildNum
  ?? _extra?.versionCode
  ?? Number.parseInt(process.env.EXPO_PUBLIC_ANDROID_VERSION_CODE ?? "1", 10);
const _baseAppVersion = _extra?.appVersion ?? process.env.EXPO_PUBLIC_APP_VERSION;
// nativeBuildNum が extra.versionCode と異なる場合は末尾の数字を置換して正確な番号を反映
const _appVersion = (_nativeBuildNum && _baseAppVersion)
  ? _baseAppVersion.replace(/-\d+$/, `-${_nativeBuildNum}`)
  : _baseAppVersion ?? `dev-${_versionCode}`;

type ImportMode = "merge" | "overwrite";

export function DataScreen({
  ioGateway,
  onImportSuccess,
  sharedFileUri,
  onSharedFileHandled,
}: {
  ioGateway: MobileIoGateway;
  onImportSuccess?: () => void;
  sharedFileUri?: string | null;
  onSharedFileHandled?: () => void;
}) {
  const { isDark, colors, toggleTheme } = useTheme();
  const [exporting, setExporting] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [showLicenses, setShowLicenses] = useState(false);
  const [importMode, setImportMode] = useState<ImportMode>("merge");
  const [importBusy, setImportBusy] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);
  const [showToast, setShowToast] = useState(false);
  const toastOpacity = useRef(new Animated.Value(0)).current;
  const [sharingLog, setSharingLog] = useState(false);
  const [debugMode, setDebugMode] = useState(() => debugLogger.isDebugMode());
  const [versionTapCount, setVersionTapCount] = useState(0);
  const [showDebug, setShowDebug] = useState(false);
  const [showDebugInfo, setShowDebugInfo] = useState(false);

  const toggleDebugMode = (value: boolean) => {
    setDebugMode(value);
    debugLogger.setDebugMode(value);
    AsyncStorage.setItem(DEBUG_MODE_STORAGE_KEY, value ? "true" : "false").catch(() => {});
    debugLogger.log("DataScreen", `debug mode set to: ${value ? "ON" : "OFF"}`);
  };

  // 他アプリから JSON ファイルがシェアされたときにインポートモーダルを自動表示
  useEffect(() => {
    if (!sharedFileUri) return;
    debugLogger.log("DataScreen", `sharedFileUri received: ${sharedFileUri}`);
    setImportError(null);
    setImportMode("merge");
    setShowImportModal(true);
  }, [sharedFileUri]);

  const handleVersionTap = () => {
    const next = versionTapCount + 1;
    if (next >= 7) {
      setVersionTapCount(0);
      setShowDebug(true);
    } else {
      setVersionTapCount(next);
    }
  };

  const handleExport = async () => {
    setExporting(true);
    try {
      const data = ioGateway.exportData();
      const json = JSON.stringify(data, null, 2);
      const ts = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
      const filePath = `${FileSystem.cacheDirectory}linguisticnode-backup-${ts}.json`;
      await FileSystem.writeAsStringAsync(filePath, json, {
        encoding: FileSystem.EncodingType.UTF8,
      });
      const canShare = await Sharing.isAvailableAsync();
      if (canShare) {
        await Sharing.shareAsync(filePath, {
          mimeType: "application/json",
          dialogTitle: "Export vocabulary",
          UTI: "public.json",
        });
      }
    } finally {
      setExporting(false);
    }
  };

  const handleImportFromUri = async (uri: string) => {
    debugLogger.log("DataScreen", `handleImportFromUri: reading file uri=${uri}`);
    setImportBusy(true);
    try {
      const json = await FileSystem.readAsStringAsync(uri, {
        encoding: FileSystem.EncodingType.UTF8,
      });
      debugLogger.log("DataScreen", `handleImportFromUri: file read ok, length=${json.length}`);
      ioGateway.importData(JSON.parse(json) as AppDataForImport, importMode);
      debugLogger.log("DataScreen", "handleImportFromUri: importData ok");
      onImportSuccess?.();
      onSharedFileHandled?.();
      setShowImportModal(false);
      // トーストを表示 (フェードイン → 2秒維持 → フェードアウト)
      setShowToast(true);
      toastOpacity.setValue(0);
      Animated.sequence([
        Animated.timing(toastOpacity, { toValue: 1, duration: 200, useNativeDriver: true }),
        Animated.delay(2000),
        Animated.timing(toastOpacity, { toValue: 0, duration: 300, useNativeDriver: true }),
      ]).start(() => setShowToast(false));
    } catch (e) {
      debugLogger.log("DataScreen", `handleImportFromUri: error: ${String(e)}`);
      setImportError(e instanceof Error ? e.message : "Failed to read or parse the file");
    } finally {
      setImportBusy(false);
    }
  };

  const handlePickFile = async () => {
    setImportError(null);

    // 他アプリからシェアされたファイルがある場合はそのまま使用する
    if (sharedFileUri) {
      await handleImportFromUri(sharedFileUri);
      return;
    }

    debugLogger.log("DataScreen", "handlePickFile: opening document picker");
    let result: DocumentPicker.DocumentPickerResult;
    try {
      result = await DocumentPicker.getDocumentAsync({
        type: "application/json",
        copyToCacheDirectory: true,
      });
    } catch (e) {
      debugLogger.log("DataScreen", `handlePickFile: picker threw error: ${String(e)}`);
      setImportError("Failed to open file picker");
      return;
    }
    debugLogger.log("DataScreen", `handlePickFile: picker result canceled=${result.canceled} assets=${result.assets?.length ?? 0}`);
    if (result.canceled || !result.assets?.length) return;

    const uri = result.assets[0].uri;
    await handleImportFromUri(uri);
  };

  const handleShareLog = async () => {
    setSharingLog(true);
    debugLogger.log("DataScreen", "debug log download requested");
    try {
      // 常に cacheDirectory の .txt ファイルにコピーしてから共有する
      // （Files by Google 等は documentDirectory を直接読めないため）
      const ts = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
      const sharePath = `${FileSystem.cacheDirectory}debug-log-${ts}.txt`;

      if (debugMode) {
        // デバッグモード ON: 永続ファイルを読み込んでコピー（クラッシュ前のログも含む）
        const persistentPath = debugLogger.getLogFilePath();
        const info = await FileSystem.getInfoAsync(persistentPath);
        if (info.exists) {
          await FileSystem.copyAsync({ from: persistentPath, to: sharePath });
        } else {
          await FileSystem.writeAsStringAsync(sharePath, debugLogger.getLogs() || "(no logs yet)", {
            encoding: FileSystem.EncodingType.UTF8,
          });
        }
      } else {
        // デバッグモード OFF: インメモリのみ
        await FileSystem.writeAsStringAsync(sharePath, debugLogger.getLogs() || "(no logs yet)", {
          encoding: FileSystem.EncodingType.UTF8,
        });
      }

      const canShare = await Sharing.isAvailableAsync();
      if (canShare) {
        await Sharing.shareAsync(sharePath, {
          mimeType: "text/plain",
          dialogTitle: "Share debug log",
          UTI: "public.plain-text",
        });
      }
    } finally {
      setSharingLog(false);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <View
        style={{
          backgroundColor: colors.surface,
          paddingHorizontal: 16,
          paddingVertical: 14,
          borderBottomWidth: 1,
          borderBottomColor: colors.border,
        }}
      >
        <Text style={{ fontSize: 20, fontWeight: "700", color: colors.text }}>Settings</Text>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: 20, gap: 12 }}
        alwaysBounceVertical={false}
      >
        <Text style={{ fontSize: 13, color: colors.textSub, marginBottom: 4 }}>
          Back up your vocabulary or restore from a previous backup.
        </Text>

        {/* Export */}
        <Pressable
          onPress={() => void handleExport()}
          disabled={exporting}
          style={({ pressed }) => ({
            flexDirection: "row",
            alignItems: "center",
            gap: 14,
            backgroundColor: pressed || exporting ? colors.surfacePressed : colors.surface,
            borderRadius: 14,
            padding: 18,
            borderWidth: 1,
            borderColor: colors.border,
          })}
        >
          <View
            style={{
              width: 44,
              height: 44,
              borderRadius: 22,
              backgroundColor: colors.primaryBg,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <FontAwesome5 name="file-export" size={20} color={colors.primary} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 16, fontWeight: "700", color: exporting ? colors.textMuted : colors.text }}>
              {exporting ? "Exporting..." : "Export"}
            </Text>
            <Text style={{ fontSize: 13, color: colors.textSub, marginTop: 2 }}>
              Save all words as a JSON file
            </Text>
          </View>
          {!exporting && <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />}
        </Pressable>

        {/* Import */}
        <Pressable
          onPress={() => {
            setImportError(null);
            setImportMode("merge");
            setShowImportModal(true);
          }}
          style={({ pressed }) => ({
            flexDirection: "row",
            alignItems: "center",
            gap: 14,
            backgroundColor: pressed ? colors.surfacePressed : colors.surface,
            borderRadius: 14,
            padding: 18,
            borderWidth: 1,
            borderColor: colors.border,
          })}
        >
          <View
            style={{
              width: 44,
              height: 44,
              borderRadius: 22,
              backgroundColor: colors.memMastered.bg,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <FontAwesome5 name="file-import" size={20} color={colors.memMastered.color} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 16, fontWeight: "700", color: colors.text }}>Import</Text>
            <Text style={{ fontSize: 13, color: colors.textSub, marginTop: 2 }}>
              Load words from a JSON backup file
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
        </Pressable>

        {/* Dark Mode Toggle */}
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: 14,
            backgroundColor: colors.surface,
            borderRadius: 14,
            padding: 18,
            borderWidth: 1,
            borderColor: colors.border,
          }}
        >
          <View
            style={{
              width: 44,
              height: 44,
              borderRadius: 22,
              backgroundColor: isDark ? "#2d2540" : "#f3f0ff",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Ionicons name={isDark ? "moon" : "moon-outline"} size={22} color="#7950f2" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 16, fontWeight: "700", color: colors.text }}>Dark Mode</Text>
            <Text style={{ fontSize: 13, color: colors.textSub, marginTop: 2 }}>
              {isDark ? "Dark theme active" : "Light theme active"}
            </Text>
          </View>
          <Switch
            value={isDark}
            onValueChange={toggleTheme}
            trackColor={{ false: colors.borderMid, true: "#7950f2" }}
            thumbColor={isDark ? "#fff" : "#fff"}
          />
        </View>

        {/* Licenses */}
        <Pressable
          onPress={() => setShowLicenses(true)}
          style={({ pressed }) => ({
            flexDirection: "row",
            alignItems: "center",
            gap: 14,
            backgroundColor: pressed ? colors.surfacePressed : colors.surface,
            borderRadius: 14,
            padding: 18,
            borderWidth: 1,
            borderColor: colors.border,
          })}
        >
          <View
            style={{
              width: 44,
              height: 44,
              borderRadius: 22,
              backgroundColor: colors.memMastered.bg,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Ionicons name="document-text-outline" size={22} color={colors.memMastered.color} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 16, fontWeight: "700", color: colors.text }}>Licenses</Text>
            <Text style={{ fontSize: 13, color: colors.textSub, marginTop: 2 }}>
              Open source libraries used in this app
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
        </Pressable>

        {/* App Version (tap 7 times to unlock debug section) */}
        <Pressable
          onPress={handleVersionTap}
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: 14,
            backgroundColor: colors.surface,
            borderRadius: 14,
            padding: 18,
            borderWidth: 1,
            borderColor: showDebug ? colors.primary : colors.border,
          }}
        >
          <View
            style={{
              width: 44,
              height: 44,
              borderRadius: 22,
              backgroundColor: isDark ? "#2d2540" : "#f3f0ff",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Ionicons name="information-circle-outline" size={22} color="#5f3dc4" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 16, fontWeight: "700", color: colors.text }}>App Version</Text>
            <Text style={{ fontSize: 13, color: colors.textSub, marginTop: 2 }}>
              {_appVersion}{"  "}
              <Text style={{ fontSize: 11, color: colors.textMuted }}>
                (build {_versionCode})
              </Text>
            </Text>
          </View>
          {versionTapCount > 0 && !showDebug && (
            <Text style={{ fontSize: 11, color: colors.textMuted }}>{7 - versionTapCount} more</Text>
          )}
        </Pressable>

        {/* Debug section (hidden by default, unlock by tapping version 7 times) */}
        {showDebug && (
          <>
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 8,
                paddingHorizontal: 4,
              }}
            >
              <Ionicons name="bug-outline" size={14} color="#e65100" />
              <Text style={{ fontSize: 12, fontWeight: "700", color: "#e65100", textTransform: "uppercase", letterSpacing: 0.5 }}>
                Developer
              </Text>
            </View>

            {/* Debug Mode */}
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 14,
                backgroundColor: colors.surface,
                borderRadius: 14,
                padding: 18,
                borderWidth: 1,
                borderColor: debugMode ? "#e65100" : colors.border,
              }}
            >
              <View
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 22,
                  backgroundColor: debugMode ? "#fff3e0" : colors.surfacePressed,
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Ionicons name="bug-outline" size={22} color={debugMode ? "#e65100" : colors.textMuted} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 16, fontWeight: "700", color: colors.text }}>Debug Mode</Text>
                <Text style={{ fontSize: 13, color: colors.textSub, marginTop: 2 }}>
                  {debugMode ? "Logs written to file (survives crashes)" : "In-memory logs only"}
                </Text>
              </View>
              <Switch
                value={debugMode}
                onValueChange={toggleDebugMode}
                trackColor={{ false: colors.borderMid, true: "#e65100" }}
                thumbColor="#fff"
              />
            </View>

            {/* Debug Log download */}
            <Pressable
              onPress={() => void handleShareLog()}
              disabled={sharingLog}
              style={({ pressed }) => ({
                flexDirection: "row",
                alignItems: "center",
                gap: 14,
                backgroundColor: pressed || sharingLog ? colors.surfacePressed : colors.surface,
                borderRadius: 14,
                padding: 18,
                borderWidth: 1,
                borderColor: colors.border,
              })}
            >
              <View
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 22,
                  backgroundColor: isDark ? "#2d2540" : "#f3f0ff",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Ionicons name="document-text-outline" size={22} color="#5f3dc4" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 16, fontWeight: "700", color: sharingLog ? colors.textMuted : colors.text }}>
                  {sharingLog ? "Preparing..." : "Debug Log"}
                </Text>
                <Text style={{ fontSize: 13, color: colors.textSub, marginTop: 2 }}>
                  Download diagnostic log
                </Text>
              </View>
              {!sharingLog && <Ionicons name="arrow-down-outline" size={18} color={colors.textMuted} />}
            </Pressable>

            {/* Debug Info screen */}
            <Pressable
              onPress={() => setShowDebugInfo(true)}
              style={({ pressed }) => ({
                flexDirection: "row",
                alignItems: "center",
                gap: 14,
                backgroundColor: pressed ? colors.surfacePressed : colors.surface,
                borderRadius: 14,
                padding: 18,
                borderWidth: 1,
                borderColor: colors.border,
              })}
            >
              <View
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 22,
                  backgroundColor: "#fff3e0",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Ionicons name="analytics-outline" size={22} color="#e65100" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 16, fontWeight: "700", color: colors.text }}>Debug Info</Text>
                <Text style={{ fontSize: 13, color: colors.textSub, marginTop: 2 }}>
                  System info, logs, diagnostics
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
            </Pressable>
          </>
        )}
      </ScrollView>

      <LicenseScreen visible={showLicenses} onClose={() => setShowLicenses(false)} />
      <DebugInfoScreen visible={showDebugInfo} onClose={() => setShowDebugInfo(false)} />

      <ImportModal
        visible={showImportModal}
        mode={importMode}
        busy={importBusy}
        error={importError}
        hasSharedFile={!!sharedFileUri}
        onChangeMode={setImportMode}
        onPickFile={() => void handlePickFile()}
        onClose={() => {
          onSharedFileHandled?.();
          setShowImportModal(false);
        }}
      />

      {/* トースト通知 */}
      {showToast && (
        <Animated.View
          style={{
            position: "absolute",
            bottom: 24,
            left: 20,
            right: 20,
            opacity: toastOpacity,
            backgroundColor: "#1a7f4b",
            borderRadius: 12,
            paddingVertical: 12,
            paddingHorizontal: 16,
            flexDirection: "row",
            alignItems: "center",
            gap: 10,
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.2,
            shadowRadius: 4,
            elevation: 6,
          }}
          pointerEvents="none"
        >
          <Ionicons name="checkmark-circle" size={20} color="#fff" />
          <Text style={{ color: "#fff", fontWeight: "700", fontSize: 14 }}>Import successful!</Text>
        </Animated.View>
      )}
    </View>
  );
}

function ImportModal({
  visible,
  mode,
  busy,
  error,
  hasSharedFile,
  onChangeMode,
  onPickFile,
  onClose,
}: {
  visible: boolean;
  mode: ImportMode;
  busy: boolean;
  error: string | null;
  hasSharedFile: boolean;
  onChangeMode: (m: ImportMode) => void;
  onPickFile: () => void;
  onClose: () => void;
}) {
  const { colors } = useTheme();
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.55)", justifyContent: "flex-end" }}>
        <View
          style={{
            backgroundColor: colors.surface,
            borderTopLeftRadius: 20,
            borderTopRightRadius: 20,
            padding: 24,
            gap: 16,
          }}
        >
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
            <Text style={{ fontSize: 18, fontWeight: "700", color: colors.text }}>Import JSON</Text>
            <Pressable onPress={onClose} hitSlop={8}>
              <Ionicons name="close" size={24} color={colors.textSub} />
            </Pressable>
          </View>

          <View style={{ gap: 8 }}>
            <Text style={{ fontSize: 13, fontWeight: "600", color: colors.textSub }}>Import mode</Text>
            {(["merge", "overwrite"] as ImportMode[]).map((m) => (
              <Pressable
                key={m}
                onPress={() => onChangeMode(m)}
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 12,
                  padding: 12,
                  borderRadius: 10,
                  borderWidth: 2,
                  borderColor: mode === m ? colors.primary : colors.borderMid,
                  backgroundColor: mode === m ? colors.primaryBg : colors.bg,
                }}
              >
                <View
                  style={{
                    width: 18,
                    height: 18,
                    borderRadius: 9,
                    borderWidth: 2,
                    borderColor: mode === m ? colors.primary : colors.textMuted,
                    backgroundColor: mode === m ? colors.primary : colors.surface,
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  {mode === m && (
                    <View style={{ width: 7, height: 7, borderRadius: 3.5, backgroundColor: "#fff" }} />
                  )}
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 14, fontWeight: "700", color: colors.text }}>
                    {m === "merge" ? "Merge" : "Overwrite"}
                  </Text>
                  <Text style={{ fontSize: 12, color: colors.textSub, marginTop: 2 }}>
                    {m === "merge"
                      ? "Add new words; skip words that already exist"
                      : "Replace ALL local data with the file contents"}
                  </Text>
                </View>
              </Pressable>
            ))}
          </View>

          {mode === "overwrite" && (
            <View
              style={{
                flexDirection: "row",
                alignItems: "flex-start",
                gap: 8,
                backgroundColor: "#fff3cd",
                borderRadius: 10,
                padding: 12,
              }}
            >
              <Ionicons name="warning-outline" size={18} color="#856404" style={{ marginTop: 1 }} />
              <Text style={{ fontSize: 13, color: "#856404", flex: 1 }}>
                All current vocabulary data will be replaced and cannot be recovered.
              </Text>
            </View>
          )}

          {error && (
            <View
              style={{
                flexDirection: "row",
                alignItems: "flex-start",
                gap: 8,
                backgroundColor: "#f8d7da",
                borderRadius: 10,
                padding: 12,
              }}
            >
              <Ionicons name="close-circle-outline" size={18} color="#842029" style={{ marginTop: 1 }} />
              <Text style={{ fontSize: 13, color: "#842029", flex: 1 }}>{error}</Text>
            </View>
          )}

          <View style={{ flexDirection: "row", gap: 10 }}>
            <Pressable
              onPress={onClose}
              style={({ pressed }) => ({
                flex: 1,
                paddingVertical: 13,
                borderRadius: 10,
                borderWidth: 1,
                borderColor: colors.borderMid,
                backgroundColor: pressed ? colors.surfacePressed : colors.surface,
                alignItems: "center",
              })}
            >
              <Text style={{ fontWeight: "600", color: colors.textDim }}>Cancel</Text>
            </Pressable>
            <Pressable
              onPress={onPickFile}
              disabled={busy}
              style={({ pressed }) => ({
                flex: 2,
                paddingVertical: 13,
                borderRadius: 10,
                backgroundColor: busy ? colors.primaryBg : pressed ? colors.primaryPressed : colors.primary,
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "center",
                gap: 6,
              })}
            >
              <Ionicons name={hasSharedFile ? "download-outline" : "folder-open-outline"} size={18} color="#fff" />
              <Text style={{ fontWeight: "700", color: "#fff" }}>
                {busy ? "Importing..." : hasSharedFile ? "Import" : "Choose File"}
              </Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}
