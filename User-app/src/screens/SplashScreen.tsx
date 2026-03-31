import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { AppText } from '../components/ui/AppText';
import { Screen } from '../components/ui/Screen';

export function SplashScreen() {
  return (
    <Screen>
      <View style={styles.container}>
        <AppText style={styles.title}>User App</AppText>
        <AppText style={styles.subtitle}>Hyperlocal Marketplace</AppText>
        <ActivityIndicator style={styles.loader} color="#2563EB" />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 30,
    fontWeight: '700',
    color: '#2563EB',
  },
  subtitle: {
    marginTop: 8,
    color: '#6B7280',
  },
  loader: {
    marginTop: 24,
  },
});
