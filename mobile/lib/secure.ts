// Where the session token lives.
//
// On a phone that is the Keychain (iOS) or the Keystore (Android), through
// expo-secure-store. There is no equivalent in a browser, and SecureStore
// simply is not implemented for web, so a web build falls back to
// AsyncStorage, which is localStorage.
//
// That fallback is a real downgrade and is written here rather than hidden:
// localStorage is readable by any script on the page. The phone builds are the
// product and they get the real thing; the web build exists for previewing
// screens, and if it ever becomes something students use, the token belongs in
// an http-only cookie instead of here.

import AsyncStorage from "@react-native-async-storage/async-storage";
import { Platform } from "react-native";
import * as SecureStore from "expo-secure-store";

const web = Platform.OS === "web";

export async function getSecret(key: string): Promise<string | null> {
  try {
    return web ? await AsyncStorage.getItem(key) : await SecureStore.getItemAsync(key);
  } catch {
    return null;
  }
}

export async function setSecret(key: string, value: string): Promise<void> {
  try {
    if (web) await AsyncStorage.setItem(key, value);
    else await SecureStore.setItemAsync(key, value);
  } catch {
    // A phone that will not store the token still works for this session;
    // the student just signs in again next launch.
  }
}

export async function deleteSecret(key: string): Promise<void> {
  try {
    if (web) await AsyncStorage.removeItem(key);
    else await SecureStore.deleteItemAsync(key);
  } catch {
    // Nothing useful to do: the caller is already signing out.
  }
}
