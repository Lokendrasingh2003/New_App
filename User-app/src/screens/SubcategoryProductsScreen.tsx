import { useEffect, useState, useMemo } from 'react';
import { FlatList, StyleSheet, View } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';

import { ProductCard } from '../components/products/ProductCard';
import { AppInput } from '../components/ui/AppInput';
import { AppText } from '../components/ui/AppText';
import { Screen } from '../components/ui/Screen';
import { Product, getShopProducts } from '../services/products/mockProducts';
import { HomeStackParamList } from '../navigation/types';
import { getMockShopById } from '../services/shops/mockShopDetails';

type Props = NativeStackScreenProps<HomeStackParamList, 'SubcategoryProducts'>;

export function SubcategoryProductsScreen({ route, navigation }: Props) {
  const { shopId, subcategoryId } = route.params;
  const [shopName, setShopName] = useState('Shop');
  const [subcategoryName, setSubcategoryName] = useState('Products');
  const [products, setProducts] = useState<Product[]>([]);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    let cancelled = false;

    const hydrate = async () => {
      const [shop, productList] = await Promise.all([
        getMockShopById(shopId),
        getShopProducts({ shopId, subcategoryId }),
      ]);

      if (cancelled) {
        return;
      }

      setProducts(productList);
      if (shop) {
        setShopName(shop.name);
        const match = shop.subcategories.find((item) => item.id === subcategoryId);
        setSubcategoryName(match?.name || subcategoryId);
      }
    };

    hydrate();

    return () => {
      cancelled = true;
    };
  }, [shopId, subcategoryId]);

  const normalizedSearch = useMemo(() => searchQuery.trim().toLowerCase(), [searchQuery]);

  const filteredProducts = useMemo(() => {
    if (!normalizedSearch) {
      return products;
    }

    return products.filter((product) => {
      const name = String(product.name || '').toLowerCase();
      const description = String(product.description || '').toLowerCase();
      return name.includes(normalizedSearch) || description.includes(normalizedSearch);
    });
  }, [normalizedSearch, products]);

  return (
    <Screen>
      <View style={styles.headerBlock}>
        <AppText style={styles.shopName}>{shopName}</AppText>
        <AppText style={styles.subcategoryName}>{subcategoryName}</AppText>
      </View>

      <View style={styles.searchContainer}>
        <AppInput
          placeholder="Search products..."
          value={searchQuery}
          onChangeText={setSearchQuery}
          style={styles.searchInput}
        />
      </View>

      {filteredProducts.length === 0 ? (
        <AppText style={styles.notFound}>No products found matching your search.</AppText>
      ) : (
        <FlatList
          data={filteredProducts}
          keyExtractor={(item) => item.id}
          numColumns={2}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.listContent}
          columnWrapperStyle={styles.columnWrapper}
          renderItem={({ item: product }) => (
            <View style={styles.cardColumn}>
              <ProductCard
                product={product}
                shopId={shopId}
                onPress={() =>
                  navigation.navigate('ProductDetail', {
                    shopId,
                    productId: product.id,
                  })
                }
              />
            </View>
          )}
        />
      )}
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
  searchContainer: {
    marginBottom: 12,
  },
  searchInput: {
    height: 40,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    paddingHorizontal: 12,
    backgroundColor: '#FFFFFF',
    fontSize: 14,
    color: '#111827',
  },
  listContent: {
    paddingBottom: 16,
  },
  columnWrapper: {
    justifyContent: 'space-between',
    gap: 10,
  },
  cardColumn: {
    width: '48%',
  },
  notFound: {
    marginTop: 10,
    fontSize: 16,
    color: '#4B5563',
  },
});
