import { useCallback, useEffect, useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import type { MobileSyncService } from "../app/mobileServices";

type SyncPhase = "idle" | "syncing" | "success" | "conflict" | "error";
type ConflictResolution = "fetch-server" | "force-local";

export function SyncScreen({ syncService }: { syncService: MobileSyncService }) {
  const [phase, setPhase] = useState<SyncPhase>("idle");
  const [isDirty, setIsDirty] = useState(false);
  const [serverRev, setServerRev] = useState(0);
  const [lastSyncedAt, setLastSyncedAt] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [selectedResolution, setSelectedResolution] = useState<ConflictResolution>("fetch-server");

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

        {/* Refresh Status */}
        <Pressable
          onPress={() => void refresh()}
          style={{ flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, paddingVertical: 8 }}
        >
          <Ionicons name="refresh-outline" size={15} color="#6c757d" />
          <Text style={{ fontSize: 13, color: "#6c757d" }}>Refresh status</Text>
        </Pressable>
      </ScrollView>
    </View>
  );
}

function StatItem({ label, value, icon }: { label: string; value: string; icon: keyof typeof Ionicons.glyphMap }) {
  return (
    <View style={{ flex: 1, backgroundColor: "#f8f9fa", borderRadius: 10, padding: 12, gap: 4 }}>
      <Ionicons name={icon} size={18} color="#6c757d" />
      <Text style={{ fontSize: 12, color: "#6c757d" }}>{label}</Text>
      <Text style={{ fontSize: 14, fontWeight: "700", color: "#212529" }}>{value}</Text>
    </View>
  );
}
