import { useState } from "react";
import { Modal, Pressable, ScrollView, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as DocumentPicker from "expo-document-picker";
import * as FileSystem from "expo-file-system";
import * as Sharing from "expo-sharing";
import type { AppDataForImport } from "../../../../src/api/types";
import type { MobileIoGateway } from "../app/mobileServices";

type ImportMode = "merge" | "overwrite";

export function DataScreen({ ioGateway }: { ioGateway: MobileIoGateway }) {
  const [exporting, setExporting] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
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
    <View style={{ flex: 1, backgroundColor: "#f8f9fa" }}>
      <View
        style={{
          backgroundColor: "#fff",
          paddingHorizontal: 16,
          paddingVertical: 14,
          borderBottomWidth: 1,
          borderBottomColor: "#e9ecef",
        }}
      >
        <Text style={{ fontSize: 20, fontWeight: "700", color: "#212529" }}>Settings</Text>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: 20, gap: 12 }}
        alwaysBounceVertical={false}
      >
        <Text style={{ fontSize: 13, color: "#6c757d", marginBottom: 4 }}>
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
            backgroundColor: pressed || exporting ? "#f1f3f5" : "#fff",
            borderRadius: 14,
            padding: 18,
            borderWidth: 1,
            borderColor: "#e9ecef",
          })}
        >
          <View
            style={{
              width: 44,
              height: 44,
              borderRadius: 22,
              backgroundColor: "#e7f1ff",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Ionicons name="share-outline" size={22} color="#0d6efd" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 16, fontWeight: "700", color: exporting ? "#adb5bd" : "#212529" }}>
              {exporting ? "Exporting..." : "Export"}
            </Text>
            <Text style={{ fontSize: 13, color: "#6c757d", marginTop: 2 }}>
              Save all words as a JSON file
            </Text>
          </View>
          {!exporting && <Ionicons name="chevron-forward" size={18} color="#adb5bd" />}
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
            backgroundColor: pressed ? "#f1f3f5" : "#fff",
            borderRadius: 14,
            padding: 18,
            borderWidth: 1,
            borderColor: "#e9ecef",
          })}
        >
          <View
            style={{
              width: 44,
              height: 44,
              borderRadius: 22,
              backgroundColor: "#ebfbee",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Ionicons name="download-outline" size={22} color="#2b8a3e" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 16, fontWeight: "700", color: "#212529" }}>Import</Text>
            <Text style={{ fontSize: 13, color: "#6c757d", marginTop: 2 }}>
              Load words from a JSON backup file
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color="#adb5bd" />
        </Pressable>

        {/* App Version */}
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: 14,
            backgroundColor: "#fff",
            borderRadius: 14,
            padding: 18,
            borderWidth: 1,
            borderColor: "#e9ecef",
          }}
        >
          <View
            style={{
              width: 44,
              height: 44,
              borderRadius: 22,
              backgroundColor: "#f3f0ff",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Ionicons name="information-circle-outline" size={22} color="#5f3dc4" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 16, fontWeight: "700", color: "#212529" }}>App Version</Text>
            <Text style={{ fontSize: 13, color: "#6c757d", marginTop: 2 }}>
              {process.env.EXPO_PUBLIC_APP_VERSION ?? "1.0.0"}
              {process.env.EXPO_PUBLIC_GIT_COMMIT
                ? `  (${process.env.EXPO_PUBLIC_GIT_COMMIT.slice(0, 7)})`
                : ""}
            </Text>
          </View>
        </View>
      </ScrollView>

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
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.45)", justifyContent: "flex-end" }}>
        <View
          style={{
            backgroundColor: "#fff",
            borderTopLeftRadius: 20,
            borderTopRightRadius: 20,
            padding: 24,
            gap: 16,
          }}
        >
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
            <Text style={{ fontSize: 18, fontWeight: "700", color: "#212529" }}>Import JSON</Text>
            <Pressable onPress={onClose} hitSlop={8}>
              <Ionicons name="close" size={24} color="#6c757d" />
            </Pressable>
          </View>

          <View style={{ gap: 8 }}>
            <Text style={{ fontSize: 13, fontWeight: "600", color: "#6c757d" }}>Import mode</Text>
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
                  borderColor: mode === m ? "#0d6efd" : "#dee2e6",
                  backgroundColor: mode === m ? "#e7f1ff" : "#f8f9fa",
                }}
              >
                <View
                  style={{
                    width: 18,
                    height: 18,
                    borderRadius: 9,
                    borderWidth: 2,
                    borderColor: mode === m ? "#0d6efd" : "#adb5bd",
                    backgroundColor: mode === m ? "#0d6efd" : "#fff",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  {mode === m && (
                    <View style={{ width: 7, height: 7, borderRadius: 3.5, backgroundColor: "#fff" }} />
                  )}
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 14, fontWeight: "700", color: "#212529" }}>
                    {m === "merge" ? "Merge" : "Overwrite"}
                  </Text>
                  <Text style={{ fontSize: 12, color: "#6c757d", marginTop: 2 }}>
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
                borderColor: "#dee2e6",
                backgroundColor: pressed ? "#f1f3f5" : "#fff",
                alignItems: "center",
              })}
            >
              <Text style={{ fontWeight: "600", color: "#495057" }}>Cancel</Text>
            </Pressable>
            <Pressable
              onPress={onPickFile}
              disabled={busy}
              style={({ pressed }) => ({
                flex: 2,
                paddingVertical: 13,
                borderRadius: 10,
                backgroundColor: busy ? "#a5c8ff" : pressed ? "#0b5ed7" : "#0d6efd",
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
