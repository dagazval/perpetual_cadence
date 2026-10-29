import * as RNWeb from 'react-native-web';

// Re-export all react-native-web primitives (View, Text, TouchableOpacity, ScrollView, FlatList, StyleSheet, etc.)
export * from 'react-native-web';

// Shims for native fabric/codegen imports used by react-native-svg and mobile libraries
export const codegenNativeComponent = (_name: string) => {
  return RNWeb.View || 'div';
};

export const codegenNativeCommands = () => ({});

export const TurboModuleRegistry = {
  get: (_name: string) => null,
  getEnforcing: (_name: string) => ({}),
};

export default RNWeb;
