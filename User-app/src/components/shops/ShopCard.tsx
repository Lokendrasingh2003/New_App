import { Image, Pressable, StyleSheet, View } from 'react-native';

import { DiscoveryShop } from '../../services/shops/mockShops';
import { AppText } from '../ui/AppText';

type Props = {
  shop: DiscoveryShop;
  onPress: () => void;
};

export function ShopCard({ shop, onPress }: Props) {
  const etaLabel = `${Math.max(shop.etaMinutes - 5, 5)}-${shop.etaMinutes} min`;
  const imageUrl = `https://picsum.photos/seed/${shop.id}/600/360`;

  return (
    <View style={styles.card}>
      <View style={styles.imageWrap}>
        <Image source={{ uri: imageUrl }} style={styles.image} resizeMode="cover" />
        <View style={styles.ratingBadge}>
          <AppText style={styles.ratingBadgeText}>★ {shop.rating.toFixed(1)}</AppText>
        </View>
      </View>

      <View style={styles.cardBody}>
        <AppText style={styles.name} numberOfLines={1}>
          {shop.name}
        </AppText>

        <AppText style={styles.info} numberOfLines={1}>
          📍 {shop.distanceKm.toFixed(1)} km away
        </AppText>

        <AppText style={styles.timing} numberOfLines={1}>
          ⏰ {etaLabel}
        </AppText>

        <View style={styles.badgesRow}>
          {shop.isVerified ? (
            <View style={styles.verifiedBadge}>
              <AppText style={styles.verifiedText}>Verified</AppText>
            </View>
          ) : null}

          {shop.isPremium ? (
            <View style={styles.premiumBadge}>
              <AppText style={styles.premiumText}>Premium</AppText>
            </View>
          ) : null}

          {!shop.isOpenNow ? (
            <View style={styles.closedBadge}>
              <AppText style={styles.closedText}>Closed</AppText>
            </View>
          ) : null}
        </View>

        <Pressable style={styles.visitButton} onPress={onPress}>
          <AppText style={styles.visitButtonText}>Visit Shop</AppText>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    marginBottom: 10,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 2,
  },
  imageWrap: {
    position: 'relative',
  },
  image: {
    width: '100%',
    height: 120,
    backgroundColor: '#F3F4F6',
  },
  ratingBadge: {
    position: 'absolute',
    top: 8,
    left: 8,
    borderRadius: 10,
    backgroundColor: '#111827CC',
    paddingHorizontal: 7,
    paddingVertical: 3,
  },
  ratingBadgeText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },
  cardBody: {
    paddingHorizontal: 10,
    paddingVertical: 10,
  },
  name: {
    fontSize: 15,
    fontWeight: '600',
    color: '#111827',
  },
  info: {
    marginTop: 4,
    fontSize: 12,
    color: '#6B7280',
  },
  timing: {
    marginTop: 4,
    fontSize: 12,
    color: '#4B5563',
    fontWeight: '500',
  },
  badgesRow: {
    marginTop: 8,
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
  },
  verifiedBadge: {
    borderRadius: 12,
    backgroundColor: '#ECFDF3',
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  verifiedText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#166534',
  },
  premiumBadge: {
    borderRadius: 12,
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  premiumText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#92400E',
  },
  closedBadge: {
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: '#FEE2E2',
  },
  closedText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#991B1B',
  },
  visitButton: {
    marginTop: 8,
    height: 34,
    borderRadius: 8,
    backgroundColor: '#22A55D',
    alignItems: 'center',
    justifyContent: 'center',
  },
  visitButtonText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
  },
});
