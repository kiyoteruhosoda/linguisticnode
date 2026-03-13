import { Modal, Pressable, ScrollView, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../app/ThemeContext";
import { licenses } from "../constants/licenses";

export function LicenseScreen({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const { colors } = useTheme();

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
          <Text style={{ fontSize: 20, fontWeight: "700", color: colors.text }}>Licenses</Text>
          <Pressable onPress={onClose} hitSlop={8}>
            <Ionicons name="close" size={24} color={colors.textSub} />
          </Pressable>
        </View>

        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16, gap: 10 }} alwaysBounceVertical={false}>
          <Text style={{ fontSize: 13, color: colors.textSub, marginBottom: 4 }}>
            This app uses the following open source libraries.
          </Text>

          {licenses.map((lib) => (
            <View
              key={lib.name}
              style={{
                backgroundColor: colors.surface,
                borderRadius: 12,
                padding: 16,
                borderWidth: 1,
                borderColor: colors.border,
                gap: 4,
              }}
            >
              <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
                <Text style={{ fontSize: 15, fontWeight: "700", color: colors.text, flex: 1 }} numberOfLines={1}>
                  {lib.name}
                </Text>
                <View
                  style={{
                    backgroundColor: colors.primaryBg,
                    borderRadius: 6,
                    paddingHorizontal: 8,
                    paddingVertical: 3,
                  }}
                >
                  <Text style={{ fontSize: 11, fontWeight: "700", color: colors.primary }}>{lib.license}</Text>
                </View>
              </View>
              <Text style={{ fontSize: 12, color: colors.textMuted }}>{lib.version}</Text>
              {lib.repository ? (
                <Text style={{ fontSize: 12, color: colors.textSub, marginTop: 2 }} numberOfLines={1}>
                  {lib.repository}
                </Text>
              ) : null}
            </View>
          ))}
        </ScrollView>
      </View>
    </Modal>
  );
}
