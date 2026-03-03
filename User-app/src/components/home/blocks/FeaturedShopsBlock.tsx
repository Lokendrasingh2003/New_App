import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Image, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { HomeStackParamList } from '../../../navigation/types';
import { FeaturedShopsBlock as FeaturedShopsBlockType } from '../../../types/homeConfig';
import { AppText } from '../../ui/AppText';
import { SectionHeader } from '../../ui/SectionHeader';

type Props = {
  block: FeaturedShopsBlockType;
};

export function FeaturedShopsBlock({ block }: Props) {
  const navigation = useNavigation<NativeStackNavigationProp<HomeStackParamList>>();

  if (block.data.length === 0) {
    return null;
  }

  return (
    <View style={styles.wrap}>
      <SectionHeader
        title={block.title ?? 'Featured Shops'}
        actionLabel={block.categoryId ? 'View All' : undefined}
        onActionPress={
          block.categoryId
            ? () => navigation.navigate('CategoryShops', { categoryId: block.categoryId as string })
            : undefined
        }
      />

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.list}
      >
        {block.data.map((shop) => (
          <View key={shop.id} style={styles.card}>
            <View style={styles.imageWrap}>
              <Image source={{ uri: shop.imageUrl }} style={styles.image} resizeMode="cover" />
              <View style={styles.ratingBadge}>
                <AppText style={styles.ratingBadgeText}>★ {shop.rating.toFixed(1)}</AppText>
              </View>
            </View>

            <View style={styles.cardBody}>
              <AppText style={styles.name} numberOfLines={1}>
                {shop.name}
              </AppText>
              <AppText style={styles.meta}>Top rated local shop</AppText>
              <AppText style={styles.timing}>⏰ {shop.timing ?? 'Available today'}</AppText>

              <Pressable
                style={styles.visitButton}
                onPress={() => navigation.navigate('ShopDetails', { shopId: shop.id })}
              >
                <AppText style={styles.visitButtonText}>Visit Shop</AppText>
              </Pressable>
            </View>
          </View>
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
    marginTop: 10,
    paddingRight: 8,
    paddingBottom: 6,
  },
  card: {
    width: 170,
    borderWidth: 1,
    borderColor: '#D9E7CB',
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#FFFFFF',
    marginRight: 10,
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
    height: 110,
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
  meta: {
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
