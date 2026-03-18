import { Linking, Modal, Pressable, Text, View } from "react-native";
import * as Clipboard from "expo-clipboard";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../app/ThemeContext";

interface Props {
  visible: boolean;
  text: string;
  onClose: () => void;
}

export function TextActionMenu({ visible, text, onClose }: Props) {
  const { colors } = useTheme();
  const trimmed = text.trim();

  const handleSearch = () => {
    Linking.openURL(`https://www.google.com/search?q=${encodeURIComponent(trimmed)}`);
    onClose();
  };

  const handleCopy = async () => {
    await Clipboard.setStringAsync(trimmed);
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable
        style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.45)", justifyContent: "flex-end" }}
        onPress={onClose}
      >
        {/* Bottom sheet: stop propagation so tapping inside doesn't close */}
        <Pressable onPress={() => {}}>
          <View
            style={{
              backgroundColor: colors.surface,
              borderTopLeftRadius: 20,
              borderTopRightRadius: 20,
              paddingHorizontal: 16,
              paddingTop: 12,
              paddingBottom: 36,
            }}
          >
            {/* Handle bar */}
            <View
              style={{
                width: 40,
                height: 4,
                borderRadius: 2,
                backgroundColor: colors.borderMid,
                alignSelf: "center",
                marginBottom: 12,
              }}
            />

            {/* Text preview */}
            <Text
              style={{
                fontSize: 13,
                color: colors.textSub,
                paddingHorizontal: 4,
                marginBottom: 12,
              }}
              numberOfLines={2}
            >
              {trimmed}
            </Text>

            <View style={{ height: 1, backgroundColor: colors.border, marginBottom: 4 }} />

            {/* Search */}
            <Pressable
              onPress={handleSearch}
              style={({ pressed }) => ({
                flexDirection: "row",
                alignItems: "center",
                gap: 14,
                paddingVertical: 16,
                paddingHorizontal: 4,
                backgroundColor: pressed ? colors.surfacePressed : "transparent",
                borderRadius: 10,
              })}
            >
              <Ionicons name="search-outline" size={22} color={colors.primary} />
              <Text style={{ fontSize: 16, fontWeight: "500", color: colors.text }}>Search</Text>
            </Pressable>

            {/* Copy */}
            <Pressable
              onPress={handleCopy}
              style={({ pressed }) => ({
                flexDirection: "row",
                alignItems: "center",
                gap: 14,
                paddingVertical: 16,
                paddingHorizontal: 4,
                backgroundColor: pressed ? colors.surfacePressed : "transparent",
                borderRadius: 10,
              })}
            >
              <Ionicons name="copy-outline" size={22} color={colors.text} />
              <Text style={{ fontSize: 16, fontWeight: "500", color: colors.text }}>Copy</Text>
            </Pressable>

            <View style={{ height: 1, backgroundColor: colors.border, marginTop: 4, marginBottom: 4 }} />

            {/* Cancel */}
            <Pressable
              onPress={onClose}
              style={({ pressed }) => ({
                alignItems: "center",
                paddingVertical: 16,
                backgroundColor: pressed ? colors.surfacePressed : "transparent",
                borderRadius: 10,
              })}
            >
              <Text style={{ fontSize: 16, color: colors.textSub }}>Cancel</Text>
            </Pressable>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
