import { useEffect, useState } from 'react';
import { Modal, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { getNearbyPrefs, setNearbyPrefs } from '../../services/location/nearbyService';
import { NearbyPreferences } from '../../types/location';
import { AppButton } from '../ui/AppButton';
import { AppText } from '../ui/AppText';
import { Chip } from '../ui/Chip';

type Props = {
  visible: boolean;
  onClose: () => void;
  onSaved?: (prefs: NearbyPreferences) => void;
};

const RADIUS_OPTIONS: NearbyPreferences['radiusKm'][] = [2, 5, 10];

export function NearbySettingsModal({ visible, onClose, onSaved }: Props) {
  const insets = useSafeAreaInsets();
  const [enabled, setEnabled] = useState(true);
  const [radiusKm, setRadiusKm] = useState<NearbyPreferences['radiusKm']>(5);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!visible) {
      return;
    }

    const hydrate = async () => {
      const prefs = await getNearbyPrefs();
      setEnabled(prefs.enabled);
      setRadiusKm(prefs.radiusKm);
    };

    hydrate();
  }, [visible]);

  const handleSave = async () => {
    setIsSaving(true);

    const nextPrefs: NearbyPreferences = {
      enabled,
      radiusKm,
      updatedAt: new Date().toISOString(),
    };

    await setNearbyPrefs(nextPrefs);
    setIsSaving(false);
    onSaved?.(nextPrefs);
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable
          style={[styles.sheet, { paddingBottom: Math.max(insets.bottom + 10, 16) }]}
          onPress={(event) => event.stopPropagation()}
        >
          <View style={styles.handleWrap}>
            <View style={styles.handle} />
          </View>

          <AppText style={styles.title}>Nearby Settings</AppText>

          <View style={styles.section}>
            <AppText style={styles.sectionTitle}>Enabled</AppText>
            <View style={styles.rowWrap}>
              <Chip
                label="ON"
                variant={enabled ? 'selected' : 'default'}
                onPress={() => setEnabled(true)}
              />
              <Chip
                label="OFF"
                variant={!enabled ? 'selected' : 'default'}
                onPress={() => setEnabled(false)}
              />
            </View>
          </View>

          <View style={styles.section}>
            <AppText style={styles.sectionTitle}>Radius</AppText>
            <View style={styles.rowWrap}>
              {RADIUS_OPTIONS.map((value) => (
                <Chip
                  key={value}
                  label={`${value} km`}
                  variant={radiusKm === value ? 'selected' : 'default'}
                  onPress={() => setRadiusKm(value)}
                />
              ))}
            </View>
          </View>

          <View style={styles.actionsWrap}>
            <AppButton title="Cancel" variant="secondary" onPress={onClose} />
            <AppButton title="Save" loading={isSaving} onPress={handleSave} />
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: '#00000066',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  handleWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
  },
  handle: {
    width: 44,
    height: 5,
    borderRadius: 999,
    backgroundColor: '#D1D5DB',
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
  },
  section: {
    marginTop: 14,
    gap: 8,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
  },
  rowWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
  },
  actionsWrap: {
    marginTop: 18,
    flexDirection: 'row',
    gap: 10,
  },
});
