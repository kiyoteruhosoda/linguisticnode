import { useState } from "react";
import { Modal, Pressable, ScrollView, Switch, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as DocumentPicker from "expo-document-picker";
import * as FileSystem from "expo-file-system";
import * as Sharing from "expo-sharing";
import type { AppDataForImport } from "../../../../src/api/types";
import type { MobileIoGateway } from "../app/mobileServices";
import { useTheme } from "../app/ThemeContext";
import { LicenseScreen } from "./LicenseScreen";

type ImportMode = "merge" | "overwrite";

export function DataScreen({ ioGateway }: { ioGateway: MobileIoGateway }) {
  const { isDark, colors, toggleTheme } = useTheme();
  const [exporting, setExporting] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [showLicenses, setShowLicenses] = useState(false);
  const [importMode, setImportMode] = useState<ImportMode>("merge");
  const [importBusy, setImportBusy] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);
  const [importSuccess, setImportSuccess] = useState(false);

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

  const handlePickFile = async () => {
    setImportError(null);
    setImportSuccess(false);
    let result: DocumentPicker.DocumentPickerResult;
    try {
      result = await DocumentPicker.getDocumentAsync({
        type: "application/json",
        copyToCacheDirectory: true,
      });
    } catch {
      setImportError("Failed to open file picker");
      return;
    }
    if (result.canceled || !result.assets?.length) return;

    setImportBusy(true);
    try {
      const json = await FileSystem.readAsStringAsync(result.assets[0].uri, {
        encoding: FileSystem.EncodingType.UTF8,
      });
      ioGateway.importData(JSON.parse(json) as AppDataForImport, importMode);
      setImportSuccess(true);
      setTimeout(() => {
        setImportSuccess(false);
        setShowImportModal(false);
      }, 2000);
    } catch (e) {
      setImportError(e instanceof Error ? e.message : "Failed to read or parse the file");
    } finally {
      setImportBusy(false);
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
            <Ionicons name="share-outline" size={22} color={colors.primary} />
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
            setImportSuccess(false);
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
            <Ionicons name="download-outline" size={22} color={colors.memMastered.color} />
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

        {/* App Version */}
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
            <Ionicons name="information-circle-outline" size={22} color="#5f3dc4" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 16, fontWeight: "700", color: colors.text }}>App Version</Text>
            <Text style={{ fontSize: 13, color: colors.textSub, marginTop: 2 }}>
              {process.env.EXPO_PUBLIC_APP_VERSION ?? "1.0.0"}
              {process.env.EXPO_PUBLIC_GIT_COMMIT
                ? `  (${process.env.EXPO_PUBLIC_GIT_COMMIT.slice(0, 7)})`
                : ""}
            </Text>
          </View>
        </View>
      </ScrollView>

      <LicenseScreen visible={showLicenses} onClose={() => setShowLicenses(false)} />

      <ImportModal
        visible={showImportModal}
        mode={importMode}
        busy={importBusy}
        error={importError}
        success={importSuccess}
        onChangeMode={setImportMode}
        onPickFile={() => void handlePickFile()}
        onClose={() => setShowImportModal(false)}
      />
    </View>
  );
}

function ImportModal({
  visible,
  mode,
  busy,
  error,
  success,
  onChangeMode,
  onPickFile,
  onClose,
}: {
  visible: boolean;
  mode: ImportMode;
  busy: boolean;
  error: string | null;
  success: boolean;
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

          {success && (
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 8,
                backgroundColor: "#d1e7dd",
                borderRadius: 10,
                padding: 12,
              }}
            >
              <Ionicons name="checkmark-circle-outline" size={18} color="#0a3622" />
              <Text style={{ fontSize: 13, fontWeight: "700", color: "#0a3622" }}>Import successful!</Text>
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
              <Ionicons name="folder-open-outline" size={18} color="#fff" />
              <Text style={{ fontWeight: "700", color: "#fff" }}>
                {busy ? "Importing..." : "Choose File"}
              </Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}
