import { useCallback, useState } from "react";
import { Alert, Modal, Pressable, ScrollView, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as FileSystem from "expo-file-system";
import * as Sharing from "expo-sharing";
import { useTheme } from "../app/ThemeContext";
import { mobileLogger, type MobileLogEntry } from "../utils/mobileLogger";

const LEVEL_COLORS: Record<MobileLogEntry["level"], string> = {
  debug: "#6c757d",
  info: "#0c63e4",
  warn: "#856404",
  error: "#842029",
};

const LEVEL_BG: Record<MobileLogEntry["level"], string> = {
  debug: "#f8f9fa",
  info: "#e7f1ff",
  warn: "#fff3cd",
  error: "#f8d7da",
};

export function DebugScreen({
  visible,
  onClose,
}: {
  visible: boolean;
  onClose: () => void;
}) {
  const { colors } = useTheme();
  const [logs, setLogs] = useState<MobileLogEntry[]>([]);
  const [exporting, setExporting] = useState(false);

  const refresh = useCallback(() => {
    setLogs(mobileLogger.getLogs());
  }, []);

  const handleClear = () => {
    mobileLogger.clearLogs();
    setLogs([]);
  };

  const handleDownload = async () => {
    setExporting(true);
    try {
      const text = mobileLogger.exportAsText();
      const ts = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
      const filePath = `${FileSystem.cacheDirectory}debug-log-${ts}.txt`;
      await FileSystem.writeAsStringAsync(filePath, text, {
        encoding: FileSystem.EncodingType.UTF8,
      });
      const canShare = await Sharing.isAvailableAsync();
      if (canShare) {
        await Sharing.shareAsync(filePath, {
          mimeType: "text/plain",
          dialogTitle: "Save debug log",
          UTI: "public.plain-text",
        });
      } else {
        Alert.alert("Saved", `Log saved to:\n${filePath}`);
      }
    } finally {
      setExporting(false);
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      onRequestClose={onClose}
      onShow={refresh}
    >
      <View style={{ flex: 1, backgroundColor: colors.bg }}>
        {/* Header */}
        <View
          style={{
            backgroundColor: colors.surface,
            paddingHorizontal: 16,
            paddingVertical: 14,
            borderBottomWidth: 1,
            borderBottomColor: colors.border,
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <Text style={{ fontSize: 18, fontWeight: "700", color: colors.text }}>
            Debug Log
          </Text>
          <View style={{ flexDirection: "row", gap: 12, alignItems: "center" }}>
            {/* Refresh */}
            <Pressable onPress={refresh} hitSlop={8}>
              <Ionicons name="refresh-outline" size={22} color={colors.textSub} />
            </Pressable>
            {/* Clear */}
            <Pressable onPress={handleClear} hitSlop={8}>
              <Ionicons name="trash-outline" size={22} color={colors.textSub} />
            </Pressable>
            {/* Download - down arrow */}
            <Pressable
              onPress={() => void handleDownload()}
              disabled={exporting}
              hitSlop={8}
            >
              <Ionicons
                name="arrow-down-circle-outline"
                size={22}
                color={exporting ? colors.textMuted : colors.primary}
              />
            </Pressable>
            {/* Close */}
            <Pressable onPress={onClose} hitSlop={8}>
              <Ionicons name="close" size={24} color={colors.textSub} />
            </Pressable>
          </View>
        </View>

        {/* Log list */}
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ padding: 12, gap: 4 }}
          alwaysBounceVertical={false}
        >
          {logs.length === 0 ? (
            <View
              style={{ alignItems: "center", paddingVertical: 40 }}
            >
              <Ionicons name="document-outline" size={36} color={colors.textMuted} />
              <Text
                style={{ fontSize: 14, color: colors.textMuted, marginTop: 8 }}
              >
                No logs yet
              </Text>
            </View>
          ) : (
            logs.map((entry, i) => (
              <View
                key={i}
                style={{
                  backgroundColor: LEVEL_BG[entry.level],
                  borderRadius: 8,
                  padding: 8,
                  gap: 2,
                }}
              >
                <Text
                  style={{
                    fontSize: 10,
                    color: colors.textMuted,
                    fontFamily: "monospace",
                  }}
                >
                  {entry.timestamp}
                  {"  "}
                  <Text
                    style={{
                      fontWeight: "700",
                      color: LEVEL_COLORS[entry.level],
                    }}
                  >
                    {entry.level.toUpperCase()}
                  </Text>
                </Text>
                <Text
                  style={{
                    fontSize: 12,
                    color: LEVEL_COLORS[entry.level],
                    fontFamily: "monospace",
                  }}
                >
                  {entry.message}
                </Text>
              </View>
            ))
          )}
        </ScrollView>
      </View>
    </Modal>
  );
}
