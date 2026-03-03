import { StyleSheet, View } from 'react-native';

import { AppText } from './AppText';

export function AppFooter() {
  return (
    <View style={styles.container}>
      <AppText style={styles.brand}>User App</AppText>
      <AppText style={styles.caption}>Hyperlocal marketplace for your daily needs</AppText>
      <AppText style={styles.meta}>© 2026 User App. All rights reserved.</AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: 20,
    borderTopWidth: 1,
    borderTopColor: '#D9E7CB',
    backgroundColor: '#F7FBF2',
    paddingTop: 14,
    paddingBottom: 0,
    alignItems: 'center',
  },
  brand: {
    fontSize: 16,
    fontWeight: '700',
    color: '#4E8E2A',
  },
  caption: {
    marginTop: 4,
    fontSize: 13,
    color: '#5B6B4D',
  },
  meta: {
    marginTop: 6,
    fontSize: 12,
    color: '#7F8D72',
  },
});
