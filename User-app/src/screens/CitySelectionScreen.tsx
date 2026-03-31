import { useEffect, useState } from 'react';
import { Alert } from 'react-native';
import { StyleSheet, View } from 'react-native';

import { AppButton } from '../components/ui/AppButton';
import { AppText } from '../components/ui/AppText';
import { Chip } from '../components/ui/Chip';
import { Divider } from '../components/ui/Divider';
import { Screen } from '../components/ui/Screen';
import { useCity } from '../contexts/CityContext';
import { ApiCity, getCities } from '../services/cities/cityService';

const COMING_SOON_CITIES = ['Indore', 'Bhopal', 'Delhi'];

export function CitySelectionScreen() {
  const { setCity } = useCity();
  const [cities, setCities] = useState<ApiCity[]>([]);
  const [isLoadingCities, setIsLoadingCities] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const loadCities = async () => {
      try {
        setIsLoadingCities(true);
        const cityList = await getCities();
        if (!cancelled) {
          setCities(cityList);
        }
      } catch (error) {
        if (!cancelled) {
          Alert.alert('Unable to load cities', error instanceof Error ? error.message : 'Please try again.');
        }
      } finally {
        if (!cancelled) {
          setIsLoadingCities(false);
        }
      }
    };

    loadCities();

    return () => {
      cancelled = true;
    };
  }, []);

  const handleSelectCity = async (city: ApiCity) => {
    try {
      setIsSubmitting(true);

      await setCity({
        city_id: city._id,
        name: city.name,
      });
    } catch (error) {
      Alert.alert('Unable to select city', error instanceof Error ? error.message : 'Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Screen scroll>
      <AppText style={styles.title}>Choose Your City</AppText>
      <AppText style={styles.subtitle}>Service is currently available in select locations.</AppText>

      <View style={styles.activeSection}>
        {isLoadingCities ? <AppText style={styles.activeNote}>Loading cities...</AppText> : null}
        {!isLoadingCities && cities.length === 0 ? (
          <AppText style={styles.activeNote}>No active city found.</AppText>
        ) : null}
        {!isLoadingCities
          ? cities.map((city) => (
              <AppButton
                key={city._id}
                title={city.name}
                onPress={() => handleSelectCity(city)}
                disabled={isSubmitting}
                loading={isSubmitting}
              />
            ))
          : null}
        {cities.length > 0 ? <AppText style={styles.activeNote}>Currently live in your selected cities</AppText> : null}
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
