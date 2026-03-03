import { NavigationProp, ParamListBase, useFocusEffect, useNavigation } from '@react-navigation/native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useCallback, useMemo, useState } from 'react';
import { Image, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { QuantityStepper } from '../components/cart/QuantityStepper';
import { AppHeader } from '../components/ui/AppHeader';
import { AppText } from '../components/ui/AppText';
import { Screen } from '../components/ui/Screen';
import { useCart } from '../contexts/CartContext';
import { HomeStackParamList } from '../navigation/types';
import { getProductById } from '../services/products/productDetailsService';
import { getReviewsForTarget } from '../services/reviews/reviewService';
import { getMockShopById } from '../services/shops/mockShopDetails';

type Props = NativeStackScreenProps<HomeStackParamList, 'ProductDetail'>;

const getDiscountPercent = (price: number, mrp: number) => {
  if (!mrp || mrp <= price) {
    return 0;
  }

  return Math.round(((mrp - price) * 100) / mrp);
};

export function ProductDetailScreen({ route }: Props) {
  const rootNavigation = useNavigation<NavigationProp<ParamListBase>>();
  const { shopId, productId } = route.params;

  const shop = useMemo(() => getMockShopById(shopId), [shopId]);
  const product = useMemo(() => getProductById(shopId, productId), [productId, shopId]);

  const [selectedVariantId, setSelectedVariantId] = useState(product?.variants[0]?.id);
  const [reviewCount, setReviewCount] = useState(0);
  const [averageRating, setAverageRating] = useState(0);

  const { addItem, increment, decrement, getQuantity, itemCount, subtotal } = useCart();

  const selectedVariant = useMemo(
    () =>
      product?.variants.find((variant) => variant.id === selectedVariantId) ?? product?.variants[0],
    [product?.variants, selectedVariantId],
  );

  const loadProductReviews = useCallback(async () => {
    const productReviews = await getReviewsForTarget('product', productId);

    if (!productReviews.length) {
      setReviewCount(0);
      setAverageRating(0);
      return;
    }

    const totalRating = productReviews.reduce((sum, review) => sum + review.rating, 0);
    setReviewCount(productReviews.length);
    setAverageRating(totalRating / productReviews.length);
  }, [productId]);

  useFocusEffect(
    useCallback(() => {
      loadProductReviews();
    }, [loadProductReviews]),
  );

  if (!product || !selectedVariant) {
    return (
      <Screen>
        <AppHeader />
        <AppText style={styles.notFound}>Product not found.</AppText>
      </Screen>
    );
  }

  const cartProductId = `${product.id}-${selectedVariant.id}`;
  const quantity = getQuantity(cartProductId);
  const discountPercent = getDiscountPercent(selectedVariant.price, selectedVariant.mrp);

  const handleAdd = () => {
    addItem(
      {
        id: cartProductId,
        shopId,
        subcategoryId: product.subcategoryId,
        name: `${product.name} (${selectedVariant.label})`,
        description: product.description,
        imageUrl: product.imageUrl,
        unit: selectedVariant.label,
        price: selectedVariant.price,
        mrp: selectedVariant.mrp,
        inStock: selectedVariant.inStock,
      },
      shopId,
    );
  };

  return (
    <Screen>
      <AppHeader />

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Image
          source={{ uri: product.imageUrl ?? `https://picsum.photos/seed/${product.id}/640/420` }}
          style={styles.image}
          resizeMode="cover"
        />

        <View style={styles.headerMeta}>
          <AppText style={styles.shopName}>{shop.name}</AppText>
          <AppText style={styles.name}>{product.name}</AppText>
          {product.description ? (
            <AppText style={styles.description}>{product.description}</AppText>
          ) : null}
        </View>

        <View style={styles.variantSection}>
          <AppText style={styles.sectionTitle}>Select pack size</AppText>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.variantRow}
          >
            {product.variants.map((variant) => (
              <Pressable
                key={variant.id}
                style={[
                  styles.variantChip,
                  selectedVariant.id === variant.id ? styles.variantChipSelected : null,
                ]}
                onPress={() => setSelectedVariantId(variant.id)}
              >
                <AppText
                  style={[
                    styles.variantChipLabel,
                    selectedVariant.id === variant.id ? styles.variantChipLabelSelected : null,
                  ]}
                >
                  {variant.label}
                </AppText>
              </Pressable>
            ))}
          </ScrollView>
        </View>

        <View style={styles.priceRow}>
          <AppText style={styles.price}>₹{selectedVariant.price}</AppText>
          <AppText style={styles.mrp}>₹{selectedVariant.mrp}</AppText>
          {discountPercent > 0 ? (
            <View style={styles.discountBadge}>
              <AppText style={styles.discountText}>{discountPercent}% OFF</AppText>
            </View>
          ) : null}
        </View>

        <AppText
          style={[styles.stockText, selectedVariant.inStock ? styles.inStock : styles.outOfStock]}
        >
          {selectedVariant.inStock ? 'In stock' : 'Out of stock'}
        </AppText>

        <View style={styles.reviewRow}>
          <AppText style={styles.reviewSummaryText}>
            {reviewCount > 0
              ? `Rating ${averageRating.toFixed(1)} ★ (${reviewCount} reviews)`
              : 'No reviews yet'}
          </AppText>
          <Pressable
            onPress={() =>
              rootNavigation.navigate('AddEditReview', {
                targetType: 'product',
                targetId: product.id,
              })
            }
          >
            <AppText style={styles.writeReviewText}>Write Review</AppText>
          </Pressable>
        </View>
      </ScrollView>

      {itemCount > 0 ? (
        <Pressable style={styles.viewCartBar} onPress={() => rootNavigation.navigate('Cart')}>
          <View>
            <AppText style={styles.viewCartTitle}>{itemCount} items in cart</AppText>
            <AppText style={styles.viewCartSubtitle}>₹{subtotal} • Tap to view cart</AppText>
          </View>
          <AppText style={styles.viewCartAction}>View Cart</AppText>
        </Pressable>
      ) : null}

      <View style={styles.stickyBar}>
        <View>
          <AppText style={styles.stickyPrice}>₹{selectedVariant.price}</AppText>
          <AppText style={styles.stickyUnit}>{selectedVariant.label}</AppText>
        </View>

        {quantity > 0 ? (
          <QuantityStepper
            quantity={quantity}
            onIncrement={() => increment(cartProductId)}
            onDecrement={() => decrement(cartProductId)}
            disableIncrement={!selectedVariant.inStock}
          />
        ) : (
          <Pressable
            style={[styles.addButton, !selectedVariant.inStock ? styles.addButtonDisabled : null]}
            onPress={handleAdd}
            disabled={!selectedVariant.inStock}
          >
            <AppText
              style={[
                styles.addButtonText,
                !selectedVariant.inStock ? styles.addButtonTextDisabled : null,
              ]}
            >
              Add
            </AppText>
          </Pressable>
        )}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingBottom: 150,
  },
  image: {
    width: '100%',
    height: 240,
    borderRadius: 14,
    backgroundColor: '#F3F4F6',
  },
  headerMeta: {
    marginTop: 12,
  },
  shopName: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6B7280',
  },
  name: {
    marginTop: 4,
    fontSize: 22,
    fontWeight: '700',
    color: '#111827',
  },
  description: {
    marginTop: 6,
    fontSize: 14,
    color: '#4B5563',
  },
  variantSection: {
    marginTop: 16,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#111827',
  },
  variantRow: {
    marginTop: 10,
    gap: 8,
    paddingRight: 8,
  },
  variantChip: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 7,
    backgroundColor: '#FFFFFF',
  },
  variantChipSelected: {
    borderColor: '#22A55D',
    backgroundColor: '#ECFDF3',
  },
  variantChipLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#374151',
  },
  variantChipLabelSelected: {
    color: '#166534',
  },
  priceRow: {
    marginTop: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
  price: {
    fontSize: 28,
    fontWeight: '800',
    color: '#111827',
  },
  mrp: {
    fontSize: 16,
    color: '#9CA3AF',
    textDecorationLine: 'line-through',
  },
  discountBadge: {
    borderRadius: 6,
    backgroundColor: '#74A532',
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  discountText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  stockText: {
    marginTop: 8,
    fontSize: 13,
    fontWeight: '600',
  },
  inStock: {
    color: '#16A34A',
  },
  outOfStock: {
    color: '#DC2626',
  },
  reviewRow: {
    marginTop: 14,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    paddingTop: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  reviewSummaryText: {
    flex: 1,
    fontSize: 13,
    color: '#374151',
    fontWeight: '600',
  },
  writeReviewText: {
    fontSize: 13,
    color: '#2563EB',
    fontWeight: '700',
  },
  stickyBar: {
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
  stickyPrice: {
    fontSize: 20,
    fontWeight: '800',
    color: '#111827',
  },
  stickyUnit: {
    marginTop: 2,
    fontSize: 12,
    color: '#6B7280',
  },
  addButton: {
    width: 110,
    height: 36,
    borderRadius: 8,
    backgroundColor: '#22A55D',
    alignItems: 'center',
    justifyContent: 'center',
  },
  addButtonDisabled: {
    backgroundColor: '#E5E7EB',
  },
  addButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  addButtonTextDisabled: {
    color: '#9CA3AF',
  },
  viewCartBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 58,
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
  notFound: {
    marginTop: 10,
    fontSize: 16,
    color: '#4B5563',
  },
});
