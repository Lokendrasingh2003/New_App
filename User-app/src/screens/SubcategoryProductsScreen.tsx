import { Image, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';

import { AppHeader } from '../components/ui/AppHeader';
import { AppText } from '../components/ui/AppText';
import { Screen } from '../components/ui/Screen';
import { Product, getShopSubcategoryById } from '../constants/demoShops';
import { useCart } from '../contexts/CartContext';
import { HomeStackParamList } from '../navigation/types';

type Props = NativeStackScreenProps<HomeStackParamList, 'SubcategoryProducts'>;

type ProductListCardProps = {
  product: Product;
  quantity: number;
  onAdd: () => void;
  onIncrement: () => void;
  onDecrement: () => void;
};

function ProductListCard({
  product,
  quantity,
  onAdd,
  onIncrement,
  onDecrement,
}: ProductListCardProps) {
  return (
    <View style={styles.card}>
      <View style={styles.leftPane}>
        <View style={styles.discountBadge}>
          <AppText style={styles.discountText}>{product.discountLabel}</AppText>
        </View>

        <Image source={{ uri: product.image }} style={styles.cardImage} resizeMode="cover" />
      </View>

      <View style={styles.cardBody}>
        <View style={styles.topMetaRow}>
          <AppText style={styles.brand}>{product.brand.toUpperCase()}</AppText>
          <View style={styles.metaPill}>
            <AppText style={styles.metaPillText}>3 days</AppText>
          </View>
        </View>

        <AppText style={styles.name} numberOfLines={2}>
          {product.name}
        </AppText>

        <View style={styles.unitPill}>
          <AppText style={styles.unit}>{product.unit}</AppText>
          <AppText style={styles.unitArrow}>⌄</AppText>
        </View>

        <View style={styles.bottomRow}>
          <View style={styles.priceRow}>
            <AppText style={styles.price}>₹{product.price.toFixed(2)}</AppText>
            <AppText style={styles.mrp}>₹{product.mrp.toFixed(2)}</AppText>
          </View>

          {quantity > 0 ? (
            <View style={styles.quantityWrap}>
              <Pressable style={styles.quantityButton} onPress={onDecrement}>
                <AppText style={styles.quantityButtonText}>−</AppText>
              </Pressable>

              <AppText style={styles.quantityText}>{quantity}</AppText>

              <Pressable style={styles.quantityButton} onPress={onIncrement}>
                <AppText style={styles.quantityButtonText}>+</AppText>
              </Pressable>
            </View>
          ) : (
            <Pressable style={styles.addButton} onPress={onAdd}>
              <AppText style={styles.addButtonText}>Add</AppText>
            </Pressable>
          )}
        </View>
      </View>
    </View>
  );
}

export function SubcategoryProductsScreen({ route }: Props) {
  const { shopId, subcategoryId } = route.params;
  const data = getShopSubcategoryById(shopId, subcategoryId);
  const { addItem, getItemQuantity, incrementQuantity, decrementQuantity } = useCart();

  if (!data) {
    return (
      <Screen>
        <AppHeader />
        <AppText style={styles.notFound}>Products not found.</AppText>
      </Screen>
    );
  }

  return (
    <Screen>
      <AppHeader />

      <View style={styles.headerBlock}>
        <AppText style={styles.shopName}>{data.shop.name}</AppText>
        <AppText style={styles.subcategoryName}>{data.subcategory.name}</AppText>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.listContent}>
        {data.subcategory.products.map((product) => (
          <ProductListCard
            key={product.id}
            product={product}
            quantity={getItemQuantity(product.id)}
            onAdd={() => addItem(product)}
            onIncrement={() => incrementQuantity(product.id)}
            onDecrement={() => decrementQuantity(product.id)}
          />
        ))}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  headerBlock: {
    marginBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    paddingBottom: 10,
  },
  shopName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
  },
  subcategoryName: {
    marginTop: 4,
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '600',
  },
  listContent: {
    paddingBottom: 12,
  },
  card: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 10,
    overflow: 'hidden',
    backgroundColor: '#FFFFFF',
    marginBottom: 10,
    flexDirection: 'row',
    minHeight: 132,
  },
  leftPane: {
    width: 102,
    position: 'relative',
    borderRightWidth: 1,
    borderRightColor: '#F3F4F6',
  },
  discountBadge: {
    position: 'absolute',
    top: 0,
    left: 0,
    zIndex: 2,
    backgroundColor: '#22C55E',
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderBottomRightRadius: 6,
  },
  discountText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '700',
  },
  cardImage: {
    width: '100%',
    height: 130,
  },
  cardBody: {
    flex: 1,
    paddingHorizontal: 8,
    paddingVertical: 7,
    justifyContent: 'space-between',
  },
  topMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 2,
  },
  brand: {
    fontSize: 10,
    color: '#6B7280',
    fontWeight: '700',
  },
  metaPill: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 1,
  },
  metaPillText: {
    fontSize: 9,
    color: '#6B7280',
  },
  name: {
    marginTop: 1,
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
  },
  unitPill: {
    marginTop: 6,
    height: 30,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 6,
    paddingHorizontal: 7,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  unit: {
    fontSize: 12,
    color: '#4B5563',
  },
  unitArrow: {
    fontSize: 12,
    color: '#6B7280',
    lineHeight: 12,
  },
  bottomRow: {
    marginTop: 6,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  price: {
    fontSize: 22,
    fontWeight: '700',
    color: '#111827',
  },
  mrp: {
    fontSize: 11,
    color: '#9CA3AF',
    textDecorationLine: 'line-through',
  },
  addButton: {
    width: 96,
    height: 34,
    borderRadius: 4,
    backgroundColor: '#E96A6A',
    alignItems: 'center',
    justifyContent: 'center',
  },
  addButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  quantityWrap: {
    width: 96,
    height: 34,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    overflow: 'hidden',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  quantityButton: {
    width: 30,
    height: 34,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F9FAFB',
  },
  quantityButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#111827',
  },
  quantityText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#111827',
  },
  notFound: {
    marginTop: 10,
    fontSize: 16,
    color: '#4B5563',
  },
});
