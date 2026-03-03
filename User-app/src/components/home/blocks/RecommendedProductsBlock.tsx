import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Alert, Image, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { HomeStackParamList } from '../../../navigation/types';
import { RecommendedProductsBlock as RecommendedProductsBlockType } from '../../../types/homeConfig';
import { AppText } from '../../ui/AppText';
import { SectionHeader } from '../../ui/SectionHeader';

type Props = {
  block: RecommendedProductsBlockType;
};

export function RecommendedProductsBlock({ block }: Props) {
  const navigation = useNavigation<NativeStackNavigationProp<HomeStackParamList>>();

  const handleProductPress = (shopId?: string, productId?: string) => {
    const resolvedProductId = productId ?? undefined;

    if (shopId && resolvedProductId) {
      navigation.navigate('ProductDetail', { shopId, productId: resolvedProductId });
      return;
    }

    Alert.alert('Coming Soon', 'Product detail screen will be available in upcoming phase.');
  };

  if (block.data.length === 0) {
    return null;
  }

  return (
    <View style={styles.wrap}>
      <SectionHeader title={block.title ?? 'Recommended Products'} />

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.list}
      >
        {block.data.map((product) => (
          <Pressable
            key={product.id}
            style={styles.card}
            onPress={() => handleProductPress(product.shopId, product.productId ?? product.id)}
          >
            <Image source={{ uri: product.imageUrl }} style={styles.image} resizeMode="cover" />

            <View style={styles.body}>
              <AppText style={styles.name} numberOfLines={2}>
                {product.name}
              </AppText>

              <View style={styles.priceRow}>
                <AppText style={styles.price}>₹{product.price}</AppText>
                {typeof product.mrp === 'number' ? (
                  <AppText style={styles.mrp}>₹{product.mrp}</AppText>
                ) : null}
              </View>
            </View>
          </Pressable>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginBottom: 18,
  },
  list: {
    marginTop: 12,
    paddingRight: 8,
  },
  card: {
    width: 150,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#FFFFFF',
    marginRight: 10,
  },
  image: {
    width: '100%',
    height: 110,
    backgroundColor: '#F3F4F6',
  },
  body: {
    paddingHorizontal: 8,
    paddingVertical: 8,
  },
  name: {
    minHeight: 34,
    fontSize: 13,
    fontWeight: '600',
    color: '#111827',
  },
  priceRow: {
    marginTop: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  price: {
    fontSize: 15,
    fontWeight: '700',
    color: '#111827',
  },
  mrp: {
    fontSize: 12,
    color: '#9CA3AF',
    textDecorationLine: 'line-through',
  },
});
