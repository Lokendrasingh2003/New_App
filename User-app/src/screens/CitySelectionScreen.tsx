import { StyleSheet, View } from 'react-native';

import { AppButton } from '../components/ui/AppButton';
import { AppText } from '../components/ui/AppText';
import { Chip } from '../components/ui/Chip';
import { Divider } from '../components/ui/Divider';
import { Screen } from '../components/ui/Screen';
import { useCity } from '../contexts/CityContext';

const COMING_SOON_CITIES = ['Indore', 'Bhopal', 'Delhi'];

export function CitySelectionScreen() {
  const { setCity } = useCity();

  const handleSelectGwalior = async () => {
    await setCity({
      city_id: 'gwalior',
      name: 'Gwalior',
    });
  };

  return (
    <Screen scroll>
      <AppText style={styles.title}>Choose Your City</AppText>
      <AppText style={styles.subtitle}>Service is currently available in select locations.</AppText>

      <View style={styles.activeSection}>
        <AppButton title="Gwalior" onPress={handleSelectGwalior} />
        <AppText style={styles.activeNote}>Currently live in Gwalior</AppText>
      </View>

      <View style={styles.comingSoonSection}>
        <Divider spacingVertical={6} />
        <AppText style={styles.comingSoonTitle}>Coming Soon</AppText>
        <View style={styles.chipGroup}>
          {COMING_SOON_CITIES.map((city) => (
            <Chip key={city} label={city} variant="disabled" disabled />
          ))}
        </View>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#111827',
  },
  subtitle: {
    marginTop: 8,
    color: '#6B7280',
  },
  activeSection: {
    marginTop: 32,
    gap: 12,
  },
  activeNote: {
    marginTop: -2,
    fontSize: 13,
    color: '#6B7280',
    fontWeight: '500',
  },
  comingSoonSection: {
    marginTop: 32,
  },
  comingSoonTitle: {
    marginBottom: 12,
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
  },
  chipGroup: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
});
