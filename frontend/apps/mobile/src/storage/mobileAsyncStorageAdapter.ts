import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  createAsyncStorageAdapter,
  type AsyncStorageDriver,
  type StorageAdapter,
} from "../../../../src/core/storage";

export const reactNativeAsyncStorageDriver: AsyncStorageDriver = {
  async getItem(key: string): Promise<string | null> {
    return AsyncStorage.getItem(key);
  },
  async setItem(key: string, value: string): Promise<void> {
    await AsyncStorage.setItem(key, value);
  },
  async removeItem(key: string): Promise<void> {
    await AsyncStorage.removeItem(key);
  },
  async getAllKeys(): Promise<string[]> {
    return [...await AsyncStorage.getAllKeys()];
  },
};

export function createMobileAsyncStorageAdapter(): StorageAdapter {
  return createAsyncStorageAdapter(reactNativeAsyncStorageDriver);
}
