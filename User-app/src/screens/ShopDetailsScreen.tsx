import { NavigationProp, ParamListBase, useFocusEffect, useNavigation } from '@react-navigation/native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useCallback, useMemo, useState } from 'react';
import { FlatList, Modal, Pressable, StyleSheet, View } from 'react-native';

import { ProductCard } from '../components/products/ProductCard';
import { AppHeader } from '../components/ui/AppHeader';
import { AppText } from '../components/ui/AppText';
import { Chip } from '../components/ui/Chip';
import { Screen } from '../components/ui/Screen';
import { useCart } from '../contexts/CartContext';
import { HomeStackParamList } from '../navigation/types';
import { getMockProducts } from '../services/products/mockProducts';
import { getReviewsForTarget } from '../services/reviews/reviewService';
import { getMockShopById } from '../services/shops/mockShopDetails';

type Props = NativeStackScreenProps<HomeStackParamList, 'ShopDetails'>;

type SortMode = 'recommended' | 'price_low_high' | 'price_high_low' | 'discount' | 'in_stock';

const SORT_CHIPS: { key: SortMode; label: string }[] = [
  { key: 'recommended', label: 'Recommended' },
  { key: 'price_low_high', label: 'Price ↑' },
  { key: 'price_high_low', label: 'Price ↓' },
  { key: 'discount', label: 'Discount' },
  { key: 'in_stock', label: 'In Stock' },
];

const getDiscountPercent = (price: number, mrp?: number) => {
  if (!mrp || mrp <= price) {
    return 0;
  }
  return ((mrp - price) / mrp) * 100;
};

export function ShopDetailsScreen({ route, navigation }: Props) {
  const rootNavigation = useNavigation<NavigationProp<ParamListBase>>();
  const { shopId } = route.params;
  const [expandedSubcategoryId, setExpandedSubcategoryId] = useState<string | null>(null);
  const [sortMode, setSortMode] = useState<SortMode>('recommended');
  const [reviewCount, setReviewCount] = useState(0);
  const [averageRating, setAverageRating] = useState(0);

  const shop = useMemo(() => getMockShopById(shopId), [shopId]);

  const { itemCount, subtotal } = useCart();

  const subcategorySections = useMemo(
    () =>
      shop.subcategories.map((subcategory) => ({
        ...subcategory,
        products: getMockProducts({ shopId: shop.id, subcategoryId: subcategory.id }),
      })),
    [shop.id, shop.subcategories],
  );

  const expandedSubcategory = useMemo(
    () => subcategorySections.find((section) => section.id === expandedSubcategoryId) ?? null,
    [expandedSubcategoryId, subcategorySections],
  );

  const sortedExpandedProducts = useMemo(() => {
    if (!expandedSubcategory) {
      return [];
    }

    const products = [...expandedSubcategory.products];

    switch (sortMode) {
      case 'price_low_high':
        products.sort((left, right) => left.price - right.price);
        break;
      case 'price_high_low':
        products.sort((left, right) => right.price - left.price);
        break;
      case 'discount':
        products.sort(
          (left, right) =>
            getDiscountPercent(right.price, right.mrp) - getDiscountPercent(left.price, left.mrp),
        );
        break;
      case 'in_stock':
        products.sort((left, right) => {
          if (left.inStock === right.inStock) {
            return left.price - right.price;
          }
          return left.inStock ? -1 : 1;
        });
        break;
      default:
        break;
    }

    return products;
  }, [expandedSubcategory, sortMode]);

  const loadShopReviews = useCallback(async () => {
    const shopReviews = await getReviewsForTarget('shop', shopId);

    if (!shopReviews.length) {
      setReviewCount(0);
      setAverageRating(0);
      return;
    }

    const totalRating = shopReviews.reduce((sum, review) => sum + review.rating, 0);
    setReviewCount(shopReviews.length);
    setAverageRating(totalRating / shopReviews.length);
  }, [shopId]);

  useFocusEffect(
    useCallback(() => {
      loadShopReviews();
    }, [loadShopReviews]),
  );

  return (
    <Screen>
      <AppHeader />

      <View style={styles.bannerBlock}>
        <View style={styles.bannerBackground}>
          <AppText style={styles.bannerTitle}>{shop.name}</AppText>
          <AppText style={styles.bannerMeta}>
            {`⭐ ${shop.rating.toFixed(1)} • 📍 ${shop.distanceKm.toFixed(1)} km • ⏱️ ${shop.etaMinutes} min`}
          </AppText>

          <View style={styles.reviewsRow}>
            <AppText style={styles.reviewsText}>
              {reviewCount > 0
                ? `Reviews: ${averageRating.toFixed(1)} ★ (${reviewCount})`
                : 'No reviews yet'}
            </AppText>
            <Pressable
              onPress={() =>
                navigation.navigate('AddEditReview', {
                  targetType: 'shop',
                  targetId: shop.id,
                })
              }
            >
              <AppText style={styles.writeReviewText}>Write Review</AppText>
            </Pressable>
          </View>

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
            <View style={[styles.openBadge, shop.isOpenNow ? styles.openNow : styles.closedNow]}>
              <AppText
                style={[
                  styles.openText,
                  shop.isOpenNow ? styles.openTextOpen : styles.openTextClosed,
                ]}
              >
                {shop.isOpenNow ? 'Open now' : 'Closed'}
              </AppText>
            </View>
          </View>
        </View>
      </View>

      <FlatList
        data={subcategorySections}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        renderItem={({ item: section }) => (
          <View style={styles.subcategorySection}>
            <View style={styles.sectionHeaderRow}>
              <AppText style={styles.sectionTitle}>{section.name}</AppText>
              <View style={styles.sectionHeaderRight}>
                <Pressable
                  onPress={() => {
                    setSortMode('recommended');
                    setExpandedSubcategoryId(section.id);
                  }}
                >
                  <AppText style={styles.viewAllText}>View All</AppText>
                </Pressable>
              </View>
            </View>

            <FlatList
              data={section.products.slice(0, 8)}
              keyExtractor={(item) => item.id}
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.sectionRow}
              initialNumToRender={4}
              maxToRenderPerBatch={6}
              windowSize={5}
              removeClippedSubviews
              renderItem={({ item: product }) => (
                <View style={styles.cardColumn}>
                  <ProductCard
                    product={product}
                    shopId={shop.id}
                    onPress={() =>
                      navigation.navigate('ProductDetail', {
                        shopId: shop.id,
                        productId: product.id,
                      })
                    }
                  />
                </View>
              )}
            />
          </View>
        )}
      />

      <Modal
        visible={Boolean(expandedSubcategory)}
        transparent
        animationType="slide"
        onRequestClose={() => {
          setExpandedSubcategoryId(null);
          setSortMode('recommended');
        }}
      >
        <Pressable
          style={styles.modalBackdrop}
          onPress={() => {
            setExpandedSubcategoryId(null);
            setSortMode('recommended');
          }}
        >
          <Pressable style={styles.modalSheet} onPress={() => undefined}>
            <View style={styles.modalHeaderRow}>
              <AppText style={styles.modalTitle}>{expandedSubcategory?.name ?? 'Products'}</AppText>
              <Pressable
                onPress={() => {
                  setExpandedSubcategoryId(null);
                  setSortMode('recommended');
                }}
              >
                <AppText style={styles.modalClose}>✕</AppText>
              </Pressable>
            </View>

            <FlatList
              data={SORT_CHIPS}
              keyExtractor={(item) => item.key}
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.sortRow}
              renderItem={({ item }) => (
                <Chip
                  label={item.label}
                  variant={sortMode === item.key ? 'selected' : 'default'}
                  onPress={() => setSortMode(item.key)}
                />
              )}
            />

            <FlatList
              data={sortedExpandedProducts}
              keyExtractor={(item) => item.id}
              numColumns={2}
              showsVerticalScrollIndicator={false}
              columnWrapperStyle={styles.modalGridRow}
              contentContainerStyle={styles.modalGridContent}
              renderItem={({ item: product }) => (
                <View style={styles.modalCardColumn}>
                  <ProductCard
                    product={product}
                    shopId={shop.id}
                    onPress={() =>
                      navigation.navigate('ProductDetail', {
                        shopId: shop.id,
                        productId: product.id,
                      })
                    }
                  />
                </View>
              )}
            />
          </Pressable>
        </Pressable>
      </Modal>

      {itemCount > 0 ? (
        <Pressable style={styles.viewCartBar} onPress={() => rootNavigation.navigate('Cart')}>
          <View>
            <AppText style={styles.viewCartTitle}>{itemCount} items in cart</AppText>
            <AppText style={styles.viewCartSubtitle}>₹{subtotal} • Tap to view cart</AppText>
          </View>
          <AppText style={styles.viewCartAction}>View Cart</AppText>
        </Pressable>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  bannerBlock: {
    marginTop: -4,
    marginBottom: 10,
  },
  bannerBackground: {
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 12,
    backgroundColor: '#ECFDF3',
    borderWidth: 1,
    borderColor: '#CBE8D7',
  },
  bannerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
  },
  bannerMeta: {
    marginTop: 4,
    fontSize: 12,
    color: '#374151',
    fontWeight: '500',
  },
  reviewsRow: {
    marginTop: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  reviewsText: {
    fontSize: 12,
    color: '#374151',
    fontWeight: '600',
  },
  writeReviewText: {
    fontSize: 12,
    color: '#22A55D',
    fontWeight: '700',
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
    backgroundColor: '#DCFCE7',
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
  openBadge: {
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  openNow: {
    backgroundColor: '#DCFCE7',
  },
  closedNow: {
    backgroundColor: '#FEE2E2',
  },
  openText: {
    fontSize: 11,
    fontWeight: '700',
  },
  openTextOpen: {
    color: '#166534',
  },
  openTextClosed: {
    color: '#991B1B',
  },
  listContent: {
    paddingBottom: 84,
  },
  subcategorySection: {
    marginBottom: 14,
  },
  sectionHeaderRow: {
    marginBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sectionHeaderRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
  },
  viewAllText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#22A55D',
  },
  sectionRow: {
    paddingRight: 8,
  },
  cardColumn: {
    width: 170,
    marginRight: 10,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: '#00000066',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    maxHeight: '85%',
    paddingHorizontal: 12,
    paddingTop: 12,
  },
  modalHeaderRow: {
    marginBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
  },
  modalClose: {
    fontSize: 18,
    fontWeight: '700',
    color: '#6B7280',
  },
  sortRow: {
    paddingBottom: 10,
    paddingRight: 8,
    gap: 8,
  },
  modalGridRow: {
    justifyContent: 'space-between',
    gap: 10,
  },
  modalGridContent: {
    paddingBottom: 96,
  },
  modalCardColumn: {
    width: '48.5%',
  },
  viewCartBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 12,
    paddingVertical: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  viewCartTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#111827',
  },
  viewCartSubtitle: {
    marginTop: 2,
    fontSize: 12,
    color: '#4B5563',
  },
  viewCartAction: {
    fontSize: 14,
    fontWeight: '700',
    color: '#22A55D',
  },
});
