import { NavigationProp, ParamListBase, useFocusEffect, useNavigation } from '@react-navigation/native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useCallback, useMemo, useState, useEffect } from 'react';
import { FlatList, Pressable, StyleSheet, View } from 'react-native';

import { ProductCard } from '../components/products/ProductCard';
import { AppInput } from '../components/ui/AppInput';
import { AppText } from '../components/ui/AppText';
import { Screen } from '../components/ui/Screen';
import { useCart } from '../contexts/CartContext';
import { HomeStackParamList } from '../navigation/types';
import { getShopProducts } from '../services/products/mockProducts';
import { getReviewsForTarget } from '../services/reviews/reviewService';
import { getMockShopById } from '../services/shops/mockShopDetails';

type Props = NativeStackScreenProps<HomeStackParamList, 'ShopDetails'>;

export function ShopDetailsScreen({ route, navigation }: Props) {
  const rootNavigation = useNavigation<NavigationProp<ParamListBase>>();
  const { shopId } = route.params;
  const [reviewCount, setReviewCount] = useState(0);
  const [averageRating, setAverageRating] = useState(0);
  const [shop, setShop] = useState<Awaited<ReturnType<typeof getMockShopById>>>(null);
  const [subcategorySections, setSubcategorySections] = useState<
    Array<{ id: string; name: string; products: Awaited<ReturnType<typeof getShopProducts>> }>
  >([]);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    let cancelled = false;

    const hydrate = async () => {
      const nextShop = await getMockShopById(shopId);
      if (!nextShop || cancelled) {
        return;
      }

      setShop(nextShop);

      const sections = await Promise.all(
        nextShop.subcategories.map(async (subcategory) => ({
          ...subcategory,
          products: await getShopProducts({ shopId: nextShop.id, subcategoryId: subcategory.id }),
        })),
      );

      if (!cancelled) {
        setSubcategorySections(sections);
      }
    };

    hydrate();

    return () => {
      cancelled = true;
    };
  }, [shopId]);

  const { itemCount, subtotal } = useCart();

  const normalizedSearch = useMemo(() => searchQuery.trim().toLowerCase(), [searchQuery]);

  const filteredSubcategorySections = useMemo(() => {
    if (!normalizedSearch) {
      return subcategorySections;
    }

    return subcategorySections
      .map((section) => {
        const filteredProducts = section.products.filter((product) => {
          const name = String(product.name || '').toLowerCase();
          const subtitle = String((product as { subtitle?: string }).subtitle || '').toLowerCase();
          const tags = Array.isArray((product as { tags?: string[] }).tags) ? (product as { tags?: string[] }).tags! : [];
          const tagsText = tags.map((t) => String(t).toLowerCase()).join(' ');

          return (
            name.includes(normalizedSearch) ||
            subtitle.includes(normalizedSearch) ||
            tagsText.includes(normalizedSearch)
          );
        });

        return {
          ...section,
          products: filteredProducts,
        };
      })
      .filter((section) => section.products.length > 0);
  }, [normalizedSearch, subcategorySections]);

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

  if (!shop) {
    return (
      <Screen>
        <AppText style={styles.notFound}>Shop not found.</AppText>
      </Screen>
    );
  }

  return (
    <Screen>
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

      <View style={styles.searchBlock}>
        <AppInput
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholder="Search products in this shop"
          autoCapitalize="none"
          autoCorrect={false}
          clearButtonMode="while-editing"
          returnKeyType="search"
        />
      </View>

      <FlatList
        data={filteredSubcategorySections}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        renderItem={({ item: section }) => {
          return (
          <View style={styles.subcategorySection}>
            <View style={styles.sectionHeaderRow}>
              <AppText style={styles.sectionTitle}>{section.name}</AppText>
              <Pressable
                onPress={() =>
                  navigation.navigate('SubcategoryProducts', {
                    shopId: shop.id,
                    subcategoryId: section.id,
                  })
                }
              >
                <AppText style={styles.viewAllText}>See all</AppText>
              </Pressable>
            </View>

            <FlatList
              data={section.products.slice(0, 5)}
              keyExtractor={(item) => item.id}
              horizontal
              showsHorizontalScrollIndicator={false}
              scrollEnabled={true}
              contentContainerStyle={styles.sectionRowHorizontal}
              renderItem={({ item: product }) => (
                <View style={styles.cardColumnHorizontal}>
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
        );
        }}
      />

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
  notFound: {
    marginTop: 10,
    fontSize: 16,
    color: '#4B5563',
  },
  bannerBlock: {
    marginTop: -4,
    marginBottom: 10,
  },
  searchBlock: {
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
    paddingRight: 0,
  },
  sectionRowHorizontal: {
    paddingRight: 12,
    gap: 10,
  },
  columnWrapper: {
    justifyContent: 'space-between',
    gap: 10,
  },
  cardColumn: {
    width: '48%',
    marginRight: 0,
  },
  cardColumnHorizontal: {
    width: 160,
    marginRight: 0,
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
