import { useEffect, useState } from "react";
import { Modal, Platform, Pressable, ScrollView, Text, View } from "react-native";
import * as FileSystem from "expo-file-system";
import { Ionicons } from "@expo/vector-icons";
import { type AppColors, useTheme } from "../app/ThemeContext";
import { debugLogger } from "../infra/debugLogger";

export function DebugInfoScreen({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const { colors } = useTheme();
  const [logFileSize, setLogFileSize] = useState<number | null>(null);
  const [logContent, setLogContent] = useState<string>("");
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    if (!visible) return;
    void loadInfo();
  }, [visible, refreshKey]);

  const loadInfo = async () => {
    const path = debugLogger.getLogFilePath();
    try {
      const info = await FileSystem.getInfoAsync(path, { size: true });
      if (info.exists && "size" in info) {
        setLogFileSize((info as { size: number }).size);
      } else {
        setLogFileSize(null);
      }
    } catch {
      setLogFileSize(null);
    }
    setLogContent(debugLogger.getLogs());
  };

  const appVersion = process.env.EXPO_PUBLIC_APP_VERSION ?? "1.0.0";
  const gitCommit = process.env.EXPO_PUBLIC_GIT_COMMIT ?? "(unknown)";
  const debugMode = debugLogger.isDebugMode();
  const logLines = logContent ? logContent.split("\n").filter(Boolean).length : 0;

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: colors.bg }}>
        {/* Header */}
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            backgroundColor: colors.surface,
            paddingHorizontal: 16,
            paddingVertical: 14,
            borderBottomWidth: 1,
            borderBottomColor: colors.border,
          }}
        >
          <Text style={{ fontSize: 20, fontWeight: "700", color: colors.text }}>Debug Info</Text>
          <View style={{ flexDirection: "row", gap: 16, alignItems: "center" }}>
            <Pressable onPress={() => setRefreshKey((k) => k + 1)} hitSlop={8}>
              <Ionicons name="refresh-outline" size={22} color={colors.textSub} />
            </Pressable>
            <Pressable onPress={onClose} hitSlop={8}>
              <Ionicons name="close" size={24} color={colors.textSub} />
            </Pressable>
          </View>
        </View>

        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16, gap: 12 }}>
          {/* App Info */}
          <InfoSection title="App" colors={colors}>
            <InfoRow label="Version" value={appVersion} colors={colors} />
            <InfoRow
              label="Commit"
              value={gitCommit !== "(unknown)" ? gitCommit.slice(0, 7) : "(unknown)"}
              colors={colors}
            />
            <InfoRow label="Full commit" value={gitCommit} colors={colors} small />
            <InfoRow label="Build env" value={process.env.NODE_ENV ?? "(unknown)"} colors={colors} />
          </InfoSection>

          {/* Platform */}
          <InfoSection title="Platform" colors={colors}>
            <InfoRow label="OS" value={Platform.OS} colors={colors} />
            <InfoRow label="OS version" value={String(Platform.Version)} colors={colors} />
            {Platform.OS === "ios" && (
              <InfoRow label="isPad" value={Platform.isPad ? "yes" : "no"} colors={colors} />
            )}
            <InfoRow label="document dir" value={FileSystem.documentDirectory ?? "(null)"} colors={colors} small />
            <InfoRow label="cache dir" value={FileSystem.cacheDirectory ?? "(null)"} colors={colors} small />
          </InfoSection>

          {/* Debug Logger */}
          <InfoSection title="Debug Logger" colors={colors}>
            <InfoRow
              label="Debug mode"
              value={debugMode ? "ON" : "OFF"}
              colors={colors}
              highlight={debugMode}
            />
            <InfoRow label="In-memory lines" value={String(logLines)} colors={colors} />
            <InfoRow label="Log file path" value={debugLogger.getLogFilePath()} colors={colors} small />
            <InfoRow
              label="Log file size"
              value={logFileSize !== null ? `${logFileSize} bytes (${(logFileSize / 1024).toFixed(1)} KB)` : "(no file)"}
              colors={colors}
            />
          </InfoSection>

          {/* In-memory Logs */}
          <InfoSection title="In-memory Logs" colors={colors}>
            <ScrollView
              style={{
                maxHeight: 400,
                backgroundColor: colors.bg,
                borderRadius: 8,
                padding: 8,
                borderWidth: 1,
                borderColor: colors.borderLight,
              }}
              nestedScrollEnabled
            >
              <Text
                selectable
                style={{ fontSize: 10, color: colors.textSub, fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace" }}
              >
                {logContent || "(no logs in memory)"}
              </Text>
            </ScrollView>
          </InfoSection>
        </ScrollView>
      </View>
    </Modal>
  );
}

function InfoSection({
  title,
  children,
  colors,
}: {
  title: string;
  children: React.ReactNode;
  colors: AppColors;
}) {
  return (
    <View
      style={{
        backgroundColor: colors.surface,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: colors.border,
        overflow: "hidden",
      }}
    >
      <View
        style={{
          paddingHorizontal: 14,
          paddingVertical: 8,
          backgroundColor: colors.surfaceAlt,
          borderBottomWidth: 1,
          borderBottomColor: colors.border,
        }}
      >
        <Text
          style={{
            fontSize: 11,
            fontWeight: "700",
            color: colors.textDim,
            textTransform: "uppercase",
            letterSpacing: 0.5,
          }}
        >
          {title}
        </Text>
      </View>
      <View style={{ paddingHorizontal: 14, paddingVertical: 4 }}>{children}</View>
    </View>
  );
}

function InfoRow({
  label,
  value,
  colors,
  small,
  highlight,
}: {
  label: string;
  value: string;
  colors: AppColors;
  small?: boolean;
  highlight?: boolean;
}) {
  return (
    <View
      style={{
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "flex-start",
        paddingVertical: 8,
        borderBottomWidth: 0.5,
        borderBottomColor: colors.borderLight,
        gap: 8,
      }}
    >
      <Text style={{ fontSize: 13, color: colors.textSub, flexShrink: 0 }}>{label}</Text>
      <Text
        selectable
        numberOfLines={small ? 2 : 1}
        style={{
          fontSize: small ? 10 : 13,
          color: highlight ? colors.primary : colors.text,
          fontWeight: highlight ? "700" : "400",
          flex: 1,
          textAlign: "right",
          flexWrap: "wrap",
        }}
      >
        {value}
      </Text>
    </View>
  );
}
