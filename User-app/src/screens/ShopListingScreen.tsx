import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useFocusEffect } from '@react-navigation/native';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { FlatList, Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { NearbySettingsModal } from '../components/location/NearbySettingsModal';
import { ShopCard } from '../components/shops/ShopCard';
import { AppButton } from '../components/ui/AppButton';
import { AppHeader } from '../components/ui/AppHeader';
import { AppText } from '../components/ui/AppText';
import { Chip } from '../components/ui/Chip';
import { EmptyState } from '../components/ui/EmptyState';
import { Screen } from '../components/ui/Screen';
import { getCategoryById } from '../constants/demoShops';
import { HomeStackParamList } from '../navigation/types';
import { getNearbyPrefs } from '../services/location/nearbyService';
import { Filters, SortOption, discoverShops } from '../services/shops/shopDiscoveryService';
import { NearbyPreferences } from '../types/location';
import { DiscoveryShop } from '../services/shops/mockShops';

type Props = NativeStackScreenProps<HomeStackParamList, 'ShopListing'>;

type ShopListingContentProps = {
  categoryId?: string;
  title?: string;
  subtitle?: string;
  onShopPress: (shopId: string) => void;
};

const SORT_OPTIONS: { key: SortOption; label: string }[] = [
  { key: 'nearest', label: 'Nearest' },
  { key: 'highest_rated', label: 'Highest rated' },
  { key: 'fastest', label: 'Fastest delivery' },
  { key: 'trending', label: 'Trending' },
  { key: 'newest', label: 'Newest' },
];

function ShopListingContent({
  categoryId,
  title,
  subtitle = 'Showing shops near you',
  onShopPress,
}: ShopListingContentProps) {
  const [sort, setSort] = useState<SortOption>('nearest');
  const [filters, setFilters] = useState<Filters>({});
  const [shops, setShops] = useState<DiscoveryShop[]>([]);
  const [nearbyPrefs, setNearbyPrefs] = useState<NearbyPreferences>({
    enabled: true,
    radiusKm: 5,
    updatedAt: '',
  });
  const [isNearbyModalOpen, setIsNearbyModalOpen] = useState(false);
  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);

  const listingTitle =
    title ?? (categoryId ? getCategoryById(categoryId)?.name : undefined) ?? 'Shops';

  const hasExplicitDistanceFilter = typeof filters.maxDistanceKm === 'number';

  const loadNearbyPrefs = useCallback(async () => {
    const prefs = await getNearbyPrefs();
    setNearbyPrefs(prefs);
  }, []);

  useEffect(() => {
    loadNearbyPrefs();
  }, [loadNearbyPrefs]);

  useFocusEffect(
    useCallback(() => {
      loadNearbyPrefs();
    }, [loadNearbyPrefs]),
  );

  useEffect(() => {
    const hydrateShops = async () => {
      const nextShops = await discoverShops({
        categoryId,
        sort,
        filters,
      });
      setShops(nextShops);
    };

    hydrateShops();
  }, [categoryId, filters, sort, nearbyPrefs.updatedAt]);

  const updateFilter = <K extends keyof Filters>(key: K, value: Filters[K]) => {
    setFilters((current) => ({
      ...current,
      [key]: value,
    }));
  };

  const clearFilters = () => {
    setFilters({});
    setSort('nearest');
  };

  return (
    <View style={styles.contentWrap}>
      <View style={styles.headerBlock}>
        <AppText style={styles.title}>{listingTitle}</AppText>
        <AppText style={styles.subtitle}>{subtitle}</AppText>

        {nearbyPrefs.enabled && !hasExplicitDistanceFilter ? (
          <View style={styles.nearbyRow}>
            <View style={styles.nearbyChip}>
              <AppText style={styles.nearbyChipText}>Nearby: {nearbyPrefs.radiusKm}km</AppText>
            </View>
            <Pressable onPress={() => setIsNearbyModalOpen(true)}>
              <AppText style={styles.nearbyChangeText}>Change</AppText>
            </Pressable>
          </View>
        ) : null}
      </View>

      <View style={styles.controlsWrap}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.controlsRow}
        >
          {SORT_OPTIONS.map((option) => (
            <Chip
              key={option.key}
              label={option.label}
              variant={sort === option.key ? 'selected' : 'default'}
              onPress={() => setSort(option.key)}
            />
          ))}

          <Chip
            label="Open now"
            variant={filters.openNow ? 'selected' : 'default'}
            onPress={() => updateFilter('openNow', !filters.openNow)}
          />

          <Chip
            label="Verified"
            variant={filters.verified ? 'selected' : 'default'}
            onPress={() => updateFilter('verified', !filters.verified)}
          />

          <Pressable style={styles.filtersButton} onPress={() => setIsFilterModalOpen(true)}>
            <AppText style={styles.filtersButtonText}>Filters</AppText>
          </Pressable>
        </ScrollView>
      </View>

      {shops.length === 0 ? (
        <View style={styles.emptyWrap}>
          <EmptyState
            title="No shops found"
            description="Try changing filters or sorting to discover more shops."
            actionLabel="Clear filters"
            onActionPress={clearFilters}
          />
        </View>
      ) : (
        <FlatList
          data={shops}
          numColumns={2}
          keyExtractor={(item) => item.id}
          style={styles.list}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.listContent}
          columnWrapperStyle={styles.columnWrapper}
          renderItem={({ item }) => (
            <View style={styles.cardColumn}>
              <ShopCard shop={item} onPress={() => onShopPress(item.id)} />
            </View>
          )}
        />
      )}

      <Modal
        visible={isFilterModalOpen}
        transparent
        animationType="slide"
        onRequestClose={() => setIsFilterModalOpen(false)}
      >
        <Pressable style={styles.modalBackdrop} onPress={() => setIsFilterModalOpen(false)}>
          <Pressable style={styles.modalSheet} onPress={() => undefined}>
            <AppText style={styles.modalTitle}>More filters</AppText>

            <View style={styles.modalSection}>
              <AppText style={styles.modalSectionTitle}>Minimum rating</AppText>
              <View style={styles.modalChipsWrap}>
                <Chip
                  label="Any"
                  variant={typeof filters.minRating !== 'number' ? 'selected' : 'default'}
                  onPress={() => updateFilter('minRating', undefined)}
                />
                <Chip
                  label="3+"
                  variant={filters.minRating === 3 ? 'selected' : 'default'}
                  onPress={() => updateFilter('minRating', 3)}
                />
                <Chip
                  label="4+"
                  variant={filters.minRating === 4 ? 'selected' : 'default'}
                  onPress={() => updateFilter('minRating', 4)}
                />
              </View>
            </View>

            <View style={styles.modalSection}>
              <AppText style={styles.modalSectionTitle}>Max delivery time</AppText>
              <View style={styles.modalChipsWrap}>
                <Chip
                  label="Any"
                  variant={typeof filters.maxEta !== 'number' ? 'selected' : 'default'}
                  onPress={() => updateFilter('maxEta', undefined)}
                />
                <Chip
                  label="≤ 30 min"
                  variant={filters.maxEta === 30 ? 'selected' : 'default'}
                  onPress={() => updateFilter('maxEta', 30)}
                />
                <Chip
                  label="≤ 45 min"
                  variant={filters.maxEta === 45 ? 'selected' : 'default'}
                  onPress={() => updateFilter('maxEta', 45)}
                />
              </View>
            </View>

            <View style={styles.modalSection}>
              <AppText style={styles.modalSectionTitle}>Distance range</AppText>
              <View style={styles.modalChipsWrap}>
                <Chip
                  label="Any"
                  variant={typeof filters.maxDistanceKm !== 'number' ? 'selected' : 'default'}
                  onPress={() => updateFilter('maxDistanceKm', undefined)}
                />
                <Chip
                  label="≤ 2 km"
                  variant={filters.maxDistanceKm === 2 ? 'selected' : 'default'}
                  onPress={() => updateFilter('maxDistanceKm', 2)}
                />
                <Chip
                  label="≤ 5 km"
                  variant={filters.maxDistanceKm === 5 ? 'selected' : 'default'}
                  onPress={() => updateFilter('maxDistanceKm', 5)}
                />
                <Chip
                  label="≤ 10 km"
                  variant={filters.maxDistanceKm === 10 ? 'selected' : 'default'}
                  onPress={() => updateFilter('maxDistanceKm', 10)}
                />
              </View>
            </View>

            <View style={styles.modalActions}>
              <AppButton title="Clear" variant="secondary" onPress={clearFilters} />
              <AppButton title="Apply" onPress={() => setIsFilterModalOpen(false)} />
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      <NearbySettingsModal
        visible={isNearbyModalOpen}
        onClose={() => setIsNearbyModalOpen(false)}
        onSaved={(prefs) => {
          setNearbyPrefs(prefs);
        }}
      />
    </View>
  );
}

export function ShopListingScreen({ route, navigation }: Props) {
  const { categoryId, title } = route.params ?? {};

  return (
    <Screen>
      <AppHeader />
      <ShopListingContent
        categoryId={categoryId}
        title={title}
        onShopPress={(shopId) => navigation.navigate('ShopDetails', { shopId })}
      />
    </Screen>
  );
}

export { ShopListingContent };

const styles = StyleSheet.create({
  contentWrap: {
    flex: 1,
  },
  headerBlock: {
    marginTop: -4,
    marginBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    paddingBottom: 10,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: '#111827',
  },
  subtitle: {
    marginTop: 4,
    fontSize: 13,
    color: '#6B7280',
  },
  nearbyRow: {
    marginTop: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  nearbyChip: {
    borderWidth: 1,
    borderColor: '#BBF7D0',
    borderRadius: 999,
    backgroundColor: '#ECFDF3',
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  nearbyChipText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#166534',
  },
  nearbyChangeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#22A55D',
  },
  controlsRow: {
    paddingVertical: 2,
    paddingRight: 8,
    gap: 8,
  },
  controlsWrap: {
    zIndex: 10,
    elevation: 4,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    marginBottom: 8,
  },
  filtersButton: {
    minHeight: 36,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    paddingHorizontal: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F9FAFB',
  },
  filtersButtonText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#374151',
  },
  list: {
    flex: 1,
  },
  listContent: {
    paddingTop: 4,
    paddingBottom: 16,
  },
  columnWrapper: {
    justifyContent: 'space-between',
    gap: 10,
  },
  cardColumn: {
    width: '48.5%',
  },
  emptyWrap: {
    flex: 1,
    minHeight: 320,
    justifyContent: 'center',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: '#00000066',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 18,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 10,
  },
  modalSection: {
    marginTop: 8,
  },
  modalSectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  modalChipsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  modalActions: {
    marginTop: 16,
    flexDirection: 'row',
    gap: 10,
  },
});
