import { memo, useCallback, useMemo, useState } from 'react';
import { FlatList, Image, Modal, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Product } from '../../services/products/mockProducts';
import { useCart } from '../../contexts/CartContext';
import { QuantityStepper } from '../cart/QuantityStepper';
import { AppText } from '../ui/AppText';

type Props = {
  product: Product;
  shopId: string;
  onPress: () => void;
};

function ProductCardComponent({ product, shopId, onPress }: Props) {
  const insets = useSafeAreaInsets();
  const [selectedVariantId, setSelectedVariantId] = useState(product.variants[0]?.id);
  const [isVariantModalOpen, setIsVariantModalOpen] = useState(false);
  const { addItem, increment, decrement, getQuantity } = useCart();

  const selectedVariant = useMemo(
    () =>
      product.variants.find((variant) => variant.id === selectedVariantId) ?? product.variants[0],
    [product.variants, selectedVariantId],
  );

  const getCartProductId = useCallback(
    (variantId: string) => `${product.id}-${variantId}`,
    [product.id],
  );

  const quantity = selectedVariant ? getQuantity(getCartProductId(selectedVariant.id)) : 0;

  const handleAdd = useCallback(
    (variantId: string) => {
      const variant = product.variants.find((item) => item.id === variantId);
      if (!variant) {
        return;
      }

      addItem(
        {
          id: getCartProductId(variant.id),
          shopId,
          subcategoryId: product.subcategoryId,
          name: `${product.name} (${variant.label})`,
          description: product.description,
          imageUrl: product.imageUrl,
          unit: variant.label,
          price: variant.price,
          mrp: variant.mrp,
          inStock: variant.inStock,
        },
        shopId,
      );
    },
    [addItem, getCartProductId, product.description, product.imageUrl, product.name, product.subcategoryId, product.variants, shopId],
  );

  const closeVariantModal = useCallback(() => setIsVariantModalOpen(false), []);
  const openVariantModal = useCallback(() => setIsVariantModalOpen(true), []);

  const keyExtractor = useCallback((item: Product['variants'][number]) => item.id, []);

  if (!selectedVariant) {
    return null;
  }

  return (
    <Pressable style={styles.card} onPress={onPress}>
      <View style={styles.discountBadge}>
        <AppText style={styles.discountText}>{selectedVariant.discountLabel}</AppText>
      </View>

      <Image
        source={{ uri: product.imageUrl ?? `https://picsum.photos/seed/${product.id}/220/220` }}
        style={styles.image}
        resizeMode="cover"
      />

      <View style={styles.body}>
        <AppText style={styles.name} numberOfLines={2}>
          {product.name}
        </AppText>

        <Pressable
          style={styles.variantSelector}
          onPress={(event) => {
            event.stopPropagation();
            openVariantModal();
          }}
        >
          <AppText style={styles.variantSelectorText}>{selectedVariant.label}</AppText>
          <AppText style={styles.variantSelectorArrow}>⌄</AppText>
        </Pressable>

        {product.description ? (
          <AppText style={styles.description} numberOfLines={1}>
            {product.description}
          </AppText>
        ) : null}

        <View style={styles.stockWrap}>
          <AppText
            style={[styles.stockText, selectedVariant.inStock ? styles.inStock : styles.outOfStock]}
          >
            {selectedVariant.inStock ? 'In stock' : 'Out of stock'}
          </AppText>
        </View>

        <View style={styles.footerRow}>
          <View style={styles.priceWrap}>
            <AppText style={styles.price}>₹{selectedVariant.price}</AppText>
            <AppText style={styles.mrp}>₹{selectedVariant.mrp}</AppText>
          </View>

          {quantity > 0 ? (
            <Pressable onPress={(event) => event.stopPropagation()}>
              <QuantityStepper
                quantity={quantity}
                onIncrement={() => increment(getCartProductId(selectedVariant.id))}
                onDecrement={() => decrement(getCartProductId(selectedVariant.id))}
                disableIncrement={!selectedVariant.inStock}
              />
            </Pressable>
          ) : (
            <Pressable
              style={[styles.addButton, !selectedVariant.inStock ? styles.addButtonDisabled : null]}
              onPress={(event) => {
                event.stopPropagation();
                if (selectedVariant.inStock) {
                  handleAdd(selectedVariant.id);
                }
              }}
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
      </View>

      <Modal
        visible={isVariantModalOpen}
        transparent
        animationType="slide"
        onRequestClose={closeVariantModal}
      >
        <Pressable style={styles.modalBackdrop} onPress={closeVariantModal}>
          <Pressable
            style={[styles.modalSheet, { paddingBottom: Math.max(16, insets.bottom + 10) }]}
            onPress={(event) => event.stopPropagation()}
          >
            <View style={styles.dragHandleWrap}>
              <View style={styles.dragHandle} />
            </View>

            <View style={styles.modalTopRow}>
              <View style={styles.modalTopLeft}>
                <Image
                  source={{
                    uri: product.imageUrl ?? `https://picsum.photos/seed/${product.id}/220/220`,
                  }}
                  style={styles.modalImage}
                  resizeMode="cover"
                />
                <View style={styles.modalInfo}>
                  <AppText style={styles.modalName} numberOfLines={2}>
                    {product.name}
                  </AppText>
                  {product.description ? (
                    <AppText style={styles.modalDescription} numberOfLines={2}>
                      {product.description}
                    </AppText>
                  ) : null}
                </View>
              </View>

              <Pressable style={styles.closeButton} onPress={closeVariantModal}>
                <AppText style={styles.closeButtonText}>✕</AppText>
              </Pressable>
            </View>

            <AppText style={styles.modalTitle}>Choose a Pack Size</AppText>

            <FlatList
              data={product.variants}
              keyExtractor={keyExtractor}
              style={styles.modalList}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.modalListContent}
              renderItem={({ item: variant }) => {
                const variantQuantity = getQuantity(getCartProductId(variant.id));

                return (
                  <Pressable
                    style={[
                      styles.variantRow,
                      variant.id === selectedVariant.id ? styles.variantRowSelected : null,
                    ]}
                    onPress={() => setSelectedVariantId(variant.id)}
                  >
                    <View style={styles.variantMeta}>
                      <View style={styles.variantLabelRow}>
                        <AppText style={styles.variantLabel}>{variant.label}</AppText>
                        <AppText
                          style={[
                            styles.variantStockText,
                            variant.inStock ? styles.inStock : styles.outOfStock,
                          ]}
                        >
                          {variant.inStock ? 'In stock' : 'Out of stock'}
                        </AppText>
                      </View>

                      <View style={styles.variantPriceRow}>
                        <AppText style={styles.variantPrice}>₹{variant.price}</AppText>
                        <AppText style={styles.variantMrp}>₹{variant.mrp}</AppText>
                        <View style={styles.variantDiscountBadge}>
                          <AppText style={styles.variantDiscountText}>
                            {variant.discountLabel}
                          </AppText>
                        </View>
                      </View>
                    </View>

                    <View>
                      {variantQuantity > 0 ? (
                        <Pressable onPress={(event) => event.stopPropagation()}>
                          <QuantityStepper
                            quantity={variantQuantity}
                            onIncrement={() => increment(getCartProductId(variant.id))}
                            onDecrement={() => decrement(getCartProductId(variant.id))}
                            disableIncrement={!variant.inStock}
                          />
                        </Pressable>
                      ) : (
                        <Pressable
                          style={[
                            styles.modalAddButton,
                            !variant.inStock ? styles.addButtonDisabled : null,
                          ]}
                          onPress={(event) => {
                            event.stopPropagation();
                            if (variant.inStock) {
                              handleAdd(variant.id);
                              setSelectedVariantId(variant.id);
                            }
                          }}
                          disabled={!variant.inStock}
                        >
                          <AppText
                            style={[
                              styles.modalAddButtonText,
                              !variant.inStock ? styles.addButtonTextDisabled : null,
                            ]}
                          >
                            Add
                          </AppText>
                        </Pressable>
                      )}
                    </View>
                  </Pressable>
                );
              }}
            />
          </Pressable>
        </Pressable>
      </Modal>
    </Pressable>
  );
}

export const ProductCard = memo(ProductCardComponent);

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    overflow: 'hidden',
    marginBottom: 10,
    position: 'relative',
    height: 292,
  },
  discountBadge: {
    position: 'absolute',
    top: 0,
    left: 0,
    zIndex: 2,
    backgroundColor: '#22C55E',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderBottomRightRadius: 8,
  },
  discountText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '700',
  },
  image: {
    width: '100%',
    height: 104,
    backgroundColor: '#F3F4F6',
  },
  body: {
    paddingHorizontal: 8,
    paddingVertical: 7,
    flex: 1,
    justifyContent: 'space-between',
  },
  name: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
  },
  variantSelector: {
    marginTop: 6,
    minHeight: 28,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 6,
    paddingHorizontal: 7,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
  },
  variantSelectorText: {
    fontSize: 12,
    color: '#4B5563',
    fontWeight: '500',
  },
  variantSelectorArrow: {
    fontSize: 12,
    color: '#6B7280',
    lineHeight: 12,
  },
  description: {
    marginTop: 4,
    fontSize: 11,
    color: '#6B7280',
  },
  stockWrap: {
    marginTop: 4,
  },
  stockText: {
    fontSize: 11,
    fontWeight: '600',
  },
  inStock: {
    color: '#16A34A',
  },
  outOfStock: {
    color: '#DC2626',
  },
  footerRow: {
    marginTop: 7,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 6,
  },
  priceWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  price: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
  },
  mrp: {
    fontSize: 12,
    color: '#9CA3AF',
    textDecorationLine: 'line-through',
  },
  addButton: {
    width: 92,
    height: 30,
    borderRadius: 10,
    backgroundColor: '#22A55D',
    alignItems: 'center',
    justifyContent: 'center',
  },
  addButtonDisabled: {
    backgroundColor: '#E5E7EB',
  },
  addButtonText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  addButtonTextDisabled: {
    color: '#9CA3AF',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: '#00000066',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    maxHeight: '80%',
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    paddingHorizontal: 12,
    paddingTop: 8,
  },
  dragHandleWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
  },
  dragHandle: {
    width: 44,
    height: 5,
    borderRadius: 999,
    backgroundColor: '#D1D5DB',
  },
  modalTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 8,
  },
  modalTopLeft: {
    flex: 1,
    flexDirection: 'row',
    gap: 10,
  },
  modalImage: {
    width: 74,
    height: 74,
    borderRadius: 10,
    backgroundColor: '#F3F4F6',
  },
  modalInfo: {
    flex: 1,
  },
  modalName: {
    fontSize: 17,
    fontWeight: '700',
    color: '#111827',
  },
  modalDescription: {
    marginTop: 4,
    fontSize: 13,
    color: '#4B5563',
  },
  closeButton: {
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeButtonText: {
    fontSize: 18,
    color: '#6B7280',
    fontWeight: '700',
  },
  modalTitle: {
    marginTop: 10,
    marginBottom: 8,
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
  },
  modalList: {
    maxHeight: 420,
  },
  modalListContent: {
    paddingBottom: 8,
  },
  variantRow: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    padding: 10,
    marginBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  variantRowSelected: {
    backgroundColor: '#ECFDF3',
    borderColor: '#22A55D',
  },
  variantMeta: {
    flex: 1,
  },
  variantLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  variantLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
  },
  variantStockText: {
    fontSize: 11,
    fontWeight: '600',
  },
  variantPriceRow: {
    marginTop: 5,
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
  },
  variantPrice: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
  },
  variantMrp: {
    fontSize: 14,
    color: '#9CA3AF',
    textDecorationLine: 'line-through',
  },
  variantDiscountBadge: {
    backgroundColor: '#74A532',
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  variantDiscountText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  modalAddButton: {
    width: 92,
    height: 34,
    borderRadius: 10,
    backgroundColor: '#22A55D',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalAddButtonText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
