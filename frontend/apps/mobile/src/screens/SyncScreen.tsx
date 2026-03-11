import { useCallback, useEffect, useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
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
      // Status fetch failure is non-critical
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

      setErrorMsg(result.message ?? "不明なエラー");
      setPhase("error");
    } catch (e) {
      setErrorMsg(e instanceof Error ? e.message : "同期に失敗しました");
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
      setErrorMsg("競合の解決に失敗しました");
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: "#f8f9fa" }}>
      {/* Header */}
      <View
        style={{
          backgroundColor: "#fff",
          paddingHorizontal: 16,
          paddingVertical: 14,
          borderBottomWidth: 1,
          borderBottomColor: "#e9ecef",
        }}
      >
        <Text style={{ fontSize: 20, fontWeight: "700", color: "#212529" }}>同期</Text>
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
              <Text style={{ fontSize: 22 }}>{isDirty ? "⚠️" : "✅"}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 16, fontWeight: "700", color: "#212529" }}>
                {isDirty ? "未同期の変更あり" : "同期済み"}
              </Text>
              <Text style={{ fontSize: 13, color: "#6c757d", marginTop: 2 }}>
                {isDirty ? "ローカルに変更が保存されています" : "最新の状態です"}
              </Text>
            </View>
          </View>

          <View style={{ flexDirection: "row", gap: 12 }}>
            <StatItem label="サーバーリビジョン" value={String(serverRev)} icon="🔖" />
            {lastSyncedAt && (
              <StatItem
                label="最終同期"
                value={new Date(lastSyncedAt).toLocaleString("ja-JP", {
                  month: "short",
                  day: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
                icon="🕐"
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
              <Text style={{ fontSize: 16, fontWeight: "700", color: "#856404" }}>⚔️ 競合が検出されました</Text>
              <Text style={{ fontSize: 13, color: "#856404", marginTop: 4 }}>
                ローカルとサーバーのデータが競合しています。どちらを使用しますか？
              </Text>
            </View>

            <View style={{ padding: 16, gap: 10 }}>
              {/* Server option */}
              <Pressable
                onPress={() => setSelectedResolution("fetch-server")}
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 12,
                  padding: 14,
                  borderRadius: 12,
                  borderWidth: 2,
                  borderColor: selectedResolution === "fetch-server" ? "#0d6efd" : "#dee2e6",
                  backgroundColor: selectedResolution === "fetch-server" ? "#e7f1ff" : "#f8f9fa",
                }}
              >
                <View
                  style={{
                    width: 20,
                    height: 20,
                    borderRadius: 10,
                    borderWidth: 2,
                    borderColor: selectedResolution === "fetch-server" ? "#0d6efd" : "#adb5bd",
                    backgroundColor: selectedResolution === "fetch-server" ? "#0d6efd" : "#fff",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  {selectedResolution === "fetch-server" && (
                    <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: "#fff" }} />
                  )}
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 15, fontWeight: "700", color: "#212529" }}>☁️ サーバーのデータを使用</Text>
                  <Text style={{ fontSize: 13, color: "#6c757d", marginTop: 2 }}>
                    ローカルの変更を破棄し、サーバーのデータに合わせます
                  </Text>
                </View>
              </Pressable>

              {/* Local option */}
              <Pressable
                onPress={() => setSelectedResolution("force-local")}
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 12,
                  padding: 14,
                  borderRadius: 12,
                  borderWidth: 2,
                  borderColor: selectedResolution === "force-local" ? "#0d6efd" : "#dee2e6",
                  backgroundColor: selectedResolution === "force-local" ? "#e7f1ff" : "#f8f9fa",
                }}
              >
                <View
                  style={{
                    width: 20,
                    height: 20,
                    borderRadius: 10,
                    borderWidth: 2,
                    borderColor: selectedResolution === "force-local" ? "#0d6efd" : "#adb5bd",
                    backgroundColor: selectedResolution === "force-local" ? "#0d6efd" : "#fff",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  {selectedResolution === "force-local" && (
                    <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: "#fff" }} />
                  )}
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 15, fontWeight: "700", color: "#212529" }}>📱 ローカルのデータを維持</Text>
                  <Text style={{ fontSize: 13, color: "#6c757d", marginTop: 2 }}>
                    ローカルの変更でサーバーを上書きします
                  </Text>
                </View>
              </Pressable>

              {/* Conflict action buttons */}
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
                  <Text style={{ fontWeight: "600", color: "#6c757d" }}>キャンセル</Text>
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
                  <Text style={{ fontWeight: "700", color: "#fff" }}>競合を解決する</Text>
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
            <Text style={{ fontSize: 14, fontWeight: "700", color: "#842029" }}>❌ 同期エラー</Text>
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
              gap: 4,
            }}
          >
            <Text style={{ fontSize: 22 }}>🎉</Text>
            <Text style={{ fontSize: 15, fontWeight: "700", color: "#0a3622" }}>同期が完了しました</Text>
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
            <Text style={{ fontSize: 20 }}>{phase === "syncing" ? "⏳" : "☁️"}</Text>
            <Text style={{ color: "#fff", fontSize: 16, fontWeight: "700" }}>
              {phase === "syncing" ? "同期中..." : "今すぐ同期"}
            </Text>
          </Pressable>
        )}

        {/* Refresh Status */}
        <Pressable onPress={() => void refresh()} style={{ alignItems: "center", paddingVertical: 8 }}>
          <Text style={{ fontSize: 13, color: "#6c757d" }}>🔄 ステータスを更新</Text>
        </Pressable>
      </ScrollView>
    </View>
  );
}

function StatItem({ label, value, icon }: { label: string; value: string; icon: string }) {
  return (
    <View style={{ flex: 1, backgroundColor: "#f8f9fa", borderRadius: 10, padding: 12, gap: 4 }}>
      <Text style={{ fontSize: 16 }}>{icon}</Text>
      <Text style={{ fontSize: 12, color: "#6c757d" }}>{label}</Text>
      <Text style={{ fontSize: 14, fontWeight: "700", color: "#212529" }}>{value}</Text>
    </View>
  );
}
