import { useCallback, useEffect, useState } from "react";
import { Modal, Pressable, ScrollView, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as DocumentPicker from "expo-document-picker";
import * as FileSystem from "expo-file-system/legacy";
import * as Sharing from "expo-sharing";
import type { AppDataForImport } from "../../../../src/api/types";
import type { MobileIoGateway, MobileSyncService } from "../app/mobileServices";

type SyncPhase = "idle" | "syncing" | "success" | "conflict" | "error";
type ConflictResolution = "fetch-server" | "force-local";
type ImportMode = "merge" | "overwrite";

export function SyncScreen({
  syncService,
  ioGateway,
}: {
  syncService: MobileSyncService;
  ioGateway: MobileIoGateway;
}) {
  const [phase, setPhase] = useState<SyncPhase>("idle");
  const [isDirty, setIsDirty] = useState(false);
  const [serverRev, setServerRev] = useState(0);
  const [lastSyncedAt, setLastSyncedAt] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [selectedResolution, setSelectedResolution] = useState<ConflictResolution>("fetch-server");

  // Export/Import state
  const [exporting, setExporting] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [importMode, setImportMode] = useState<ImportMode>("merge");
  const [importBusy, setImportBusy] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);
  const [importSuccess, setImportSuccess] = useState(false);

  const refresh = useCallback(async () => {
    try {
      const status = await syncService.getStatus();
      setIsDirty(status.dirty);
      setServerRev(status.serverRev);
    } catch {
      // non-critical
    }
  }, [syncService]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  // ── Sync ───────────────────────────────────────────────────────────────────

  const runSync = async () => {
    setPhase("syncing");
    setErrorMsg(null);
    try {
      const result = await syncService.sync();
      if (result.status === "success") {
        setLastSyncedAt(result.updatedAt);
        setServerRev(result.serverRev);
        setIsDirty(false);
        setPhase("success");
        setTimeout(() => setPhase("idle"), 3000);
        return;
      }
      if (result.status === "conflict") {
        setSelectedResolution("fetch-server");
        setPhase("conflict");
        return;
      }
      setErrorMsg(result.message ?? "Unknown error");
      setPhase("error");
    } catch (e) {
      setErrorMsg(e instanceof Error ? e.message : "Sync failed");
      setPhase("error");
    }
  };

  const resolveConflict = async () => {
    setPhase("syncing");
    try {
      const result = await syncService.resolve(selectedResolution);
      setLastSyncedAt(result.updatedAt);
      setServerRev(result.serverRev);
      setIsDirty(false);
      setPhase("success");
      setTimeout(() => setPhase("idle"), 3000);
    } catch {
      setPhase("error");
      setErrorMsg("Failed to resolve conflict");
    }
  };

  // ── Export ─────────────────────────────────────────────────────────────────

  const handleExport = async () => {
    setExporting(true);
    try {
      const data = ioGateway.exportData();
      const json = JSON.stringify(data, null, 2);
      const ts = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
      const fileName = `linguisticnode-backup-${ts}.json`;
      const filePath = `${FileSystem.cacheDirectory}${fileName}`;
      await FileSystem.writeAsStringAsync(filePath, json, { encoding: FileSystem.EncodingType.UTF8 });

      const canShare = await Sharing.isAvailableAsync();
      if (canShare) {
        await Sharing.shareAsync(filePath, {
          mimeType: "application/json",
          dialogTitle: "Export vocabulary",
          UTI: "public.json",
        });
      }
    } catch (e) {
      setErrorMsg(e instanceof Error ? e.message : "Export failed");
    } finally {
      setExporting(false);
    }
  };

  // ── Import ─────────────────────────────────────────────────────────────────

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

    const asset = result.assets[0];
    setImportBusy(true);
    try {
      const json = await FileSystem.readAsStringAsync(asset.uri, {
        encoding: FileSystem.EncodingType.UTF8,
      });
      const parsed = JSON.parse(json) as AppDataForImport;
      ioGateway.importData(parsed, importMode);
      await refresh();
      setImportSuccess(true);
      setTimeout(() => {
        setImportSuccess(false);
        setShowImportModal(false);
      }, 2000);
    } catch (e) {
      setImportError(
        e instanceof Error ? e.message : "Failed to read or parse the file",
      );
    } finally {
      setImportBusy(false);
    }
  };

  // ── Render ─────────────────────────────────────────────────────────────────

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
        <Text style={{ fontSize: 20, fontWeight: "700", color: "#212529" }}>Sync</Text>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: 20, gap: 16 }}
        alwaysBounceVertical={false}
      >
        {/* Status Card */}
        <View
          style={{
            backgroundColor: "#fff",
            borderRadius: 16,
            padding: 20,
            borderWidth: 1,
            borderColor: "#e9ecef",
            gap: 16,
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 1 },
            shadowOpacity: 0.06,
            shadowRadius: 4,
            elevation: 2,
          }}
        >
          <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
            <View
              style={{
                width: 44,
                height: 44,
                borderRadius: 22,
                backgroundColor: isDirty ? "#fff3cd" : "#d1ecf1",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Ionicons
                name={isDirty ? "warning-outline" : "checkmark-circle-outline"}
                size={24}
                color={isDirty ? "#856404" : "#0c5460"}
              />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 16, fontWeight: "700", color: "#212529" }}>
                {isDirty ? "Unsynced Changes" : "Up to Date"}
              </Text>
              <Text style={{ fontSize: 13, color: "#6c757d", marginTop: 2 }}>
                {isDirty ? "Changes saved locally" : "Everything is in sync"}
              </Text>
            </View>
          </View>

          <View style={{ flexDirection: "row", gap: 12 }}>
            <StatItem label="Server Rev" value={String(serverRev)} icon="bookmark-outline" />
            {lastSyncedAt && (
              <StatItem
                label="Last Synced"
                value={new Date(lastSyncedAt).toLocaleString("en-US", {
                  month: "short",
                  day: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
                icon="time-outline"
              />
            )}
          </View>
        </View>

        {/* Phase: Conflict */}
        {phase === "conflict" && (
          <View
            style={{
              backgroundColor: "#fff",
              borderRadius: 16,
              borderWidth: 1.5,
              borderColor: "#ffc107",
              overflow: "hidden",
            }}
          >
            <View style={{ backgroundColor: "#fff3cd", paddingHorizontal: 16, paddingVertical: 12 }}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                <Ionicons name="git-compare-outline" size={18} color="#856404" />
                <Text style={{ fontSize: 16, fontWeight: "700", color: "#856404" }}>Conflict Detected</Text>
              </View>
              <Text style={{ fontSize: 13, color: "#856404", marginTop: 4 }}>
                Local and server data conflict. Which version to use?
              </Text>
            </View>

            <View style={{ padding: 16, gap: 10 }}>
              {(["fetch-server", "force-local"] as ConflictResolution[]).map((option) => (
                <Pressable
                  key={option}
                  onPress={() => setSelectedResolution(option)}
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 12,
                    padding: 14,
                    borderRadius: 12,
                    borderWidth: 2,
                    borderColor: selectedResolution === option ? "#0d6efd" : "#dee2e6",
                    backgroundColor: selectedResolution === option ? "#e7f1ff" : "#f8f9fa",
                  }}
                >
                  <View
                    style={{
                      width: 20,
                      height: 20,
                      borderRadius: 10,
                      borderWidth: 2,
                      borderColor: selectedResolution === option ? "#0d6efd" : "#adb5bd",
                      backgroundColor: selectedResolution === option ? "#0d6efd" : "#fff",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    {selectedResolution === option && (
                      <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: "#fff" }} />
                    )}
                  </View>
                  <View style={{ flex: 1 }}>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                      <Ionicons
                        name={option === "fetch-server" ? "cloud-outline" : "phone-portrait-outline"}
                        size={15}
                        color="#212529"
                      />
                      <Text style={{ fontSize: 15, fontWeight: "700", color: "#212529" }}>
                        {option === "fetch-server" ? "Use server data" : "Keep local data"}
                      </Text>
                    </View>
                    <Text style={{ fontSize: 13, color: "#6c757d", marginTop: 2 }}>
                      {option === "fetch-server"
                        ? "Discard local changes and sync with server"
                        : "Overwrite server with local changes"}
                    </Text>
                  </View>
                </Pressable>
              ))}

              <View style={{ flexDirection: "row", gap: 8, marginTop: 4 }}>
                <Pressable
                  onPress={() => setPhase("idle")}
                  style={({ pressed }) => ({
                    flex: 1,
                    paddingVertical: 12,
                    borderRadius: 10,
                    borderWidth: 1,
                    borderColor: "#dee2e6",
                    backgroundColor: pressed ? "#f1f3f5" : "#fff",
                    alignItems: "center",
                  })}
                >
                  <Text style={{ fontWeight: "600", color: "#6c757d" }}>Cancel</Text>
                </Pressable>
                <Pressable
                  onPress={() => void resolveConflict()}
                  style={({ pressed }) => ({
                    flex: 2,
                    paddingVertical: 12,
                    borderRadius: 10,
                    backgroundColor: pressed ? "#0b5ed7" : "#0d6efd",
                    alignItems: "center",
                  })}
                >
                  <Text style={{ fontWeight: "700", color: "#fff" }}>Resolve</Text>
                </Pressable>
              </View>
            </View>
          </View>
        )}

        {/* Phase: Error */}
        {phase === "error" && errorMsg && (
          <View
            style={{
              backgroundColor: "#f8d7da",
              borderRadius: 14,
              padding: 16,
              borderWidth: 1,
              borderColor: "#f5c2c7",
            }}
          >
            <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
              <Ionicons name="close-circle-outline" size={18} color="#842029" />
              <Text style={{ fontSize: 14, fontWeight: "700", color: "#842029" }}>Sync Error</Text>
            </View>
            <Text style={{ fontSize: 13, color: "#842029", marginTop: 4 }}>{errorMsg}</Text>
          </View>
        )}

        {/* Phase: Success */}
        {phase === "success" && (
          <View
            style={{
              backgroundColor: "#d1e7dd",
              borderRadius: 14,
              padding: 16,
              borderWidth: 1,
              borderColor: "#a3cfbb",
              alignItems: "center",
              gap: 6,
            }}
          >
            <Ionicons name="checkmark-circle-outline" size={28} color="#0a3622" />
            <Text style={{ fontSize: 15, fontWeight: "700", color: "#0a3622" }}>Sync Complete</Text>
          </View>
        )}

        {/* Sync Button */}
        {phase !== "conflict" && (
          <Pressable
            onPress={() => void runSync()}
            disabled={phase === "syncing"}
            style={({ pressed }) => ({
              backgroundColor: phase === "syncing" ? "#a5c8ff" : pressed ? "#0b5ed7" : "#0d6efd",
              borderRadius: 14,
              paddingVertical: 16,
              alignItems: "center",
              flexDirection: "row",
              justifyContent: "center",
              gap: 8,
              shadowColor: "#0d6efd",
              shadowOffset: { width: 0, height: 3 },
              shadowOpacity: 0.25,
              shadowRadius: 6,
              elevation: 4,
            })}
          >
            <Ionicons
              name={phase === "syncing" ? "hourglass-outline" : "cloud-upload-outline"}
              size={22}
              color="#fff"
            />
            <Text style={{ color: "#fff", fontSize: 16, fontWeight: "700" }}>
              {phase === "syncing" ? "Syncing..." : "Sync Now"}
            </Text>
          </Pressable>
        )}

        {/* Divider */}
        <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
          <View style={{ flex: 1, height: 1, backgroundColor: "#e9ecef" }} />
          <Text style={{ fontSize: 12, color: "#adb5bd" }}>File backup</Text>
          <View style={{ flex: 1, height: 1, backgroundColor: "#e9ecef" }} />
        </View>

        {/* Export */}
        <Pressable
          onPress={() => void handleExport()}
          disabled={exporting}
          style={({ pressed }) => ({
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "center",
            gap: 8,
            backgroundColor: exporting ? "#f1f3f5" : pressed ? "#f1f3f5" : "#fff",
            borderRadius: 12,
            paddingVertical: 14,
            borderWidth: 1,
            borderColor: "#dee2e6",
          })}
        >
          <Ionicons name="share-outline" size={20} color={exporting ? "#adb5bd" : "#212529"} />
          <Text style={{ fontSize: 15, fontWeight: "600", color: exporting ? "#adb5bd" : "#212529" }}>
            {exporting ? "Exporting..." : "Export as JSON"}
          </Text>
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
            justifyContent: "center",
            gap: 8,
            backgroundColor: pressed ? "#f1f3f5" : "#fff",
            borderRadius: 12,
            paddingVertical: 14,
            borderWidth: 1,
            borderColor: "#dee2e6",
          })}
        >
          <Ionicons name="download-outline" size={20} color="#212529" />
          <Text style={{ fontSize: 15, fontWeight: "600", color: "#212529" }}>Import from JSON</Text>
        </Pressable>

        {/* Refresh Status */}
        <Pressable
          onPress={() => void refresh()}
          style={{ flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, paddingVertical: 8 }}
        >
          <Ionicons name="refresh-outline" size={15} color="#6c757d" />
          <Text style={{ fontSize: 13, color: "#6c757d" }}>Refresh status</Text>
        </Pressable>
      </ScrollView>

      {/* Import Modal */}
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

// ── Import Modal ──────────────────────────────────────────────────────────────

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
          {/* Header */}
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
            <Text style={{ fontSize: 18, fontWeight: "700", color: "#212529" }}>Import JSON</Text>
            <Pressable onPress={onClose} hitSlop={8}>
              <Ionicons name="close" size={24} color="#6c757d" />
            </Pressable>
          </View>

          {/* Mode selector */}
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

          {/* Overwrite warning */}
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

          {/* Error */}
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

          {/* Success */}
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

          {/* Buttons */}
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

// ── Stat Item ─────────────────────────────────────────────────────────────────

function StatItem({ label, value, icon }: { label: string; value: string; icon: keyof typeof Ionicons.glyphMap }) {
  return (
    <View style={{ flex: 1, backgroundColor: "#f8f9fa", borderRadius: 10, padding: 12, gap: 4 }}>
      <Ionicons name={icon} size={18} color="#6c757d" />
      <Text style={{ fontSize: 12, color: "#6c757d" }}>{label}</Text>
      <Text style={{ fontSize: 14, fontWeight: "700", color: "#212529" }}>{value}</Text>
    </View>
  );
}
