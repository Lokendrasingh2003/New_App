import { Image, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { DEMO_CATEGORIES, Shop } from '../../constants/demoShops';
import { AppText } from './AppText';

function ShopCard({ shop, onVisitShop }: { shop: Shop; onVisitShop: (shopId: string) => void }) {
  return (
    <View style={styles.card}>
      <Image source={{ uri: shop.image }} style={styles.cardImage} resizeMode="cover" />
      <View style={styles.cardBody}>
        <AppText style={styles.shopName} numberOfLines={1}>
          {shop.name}
        </AppText>
        <AppText style={styles.shopInfo}>{shop.info}</AppText>
        <AppText style={styles.shopTiming}>⏰ {shop.timing}</AppText>
        <Pressable style={styles.visitButton} onPress={() => onVisitShop(shop.id)}>
          <AppText style={styles.visitButtonText}>Visit Shop</AppText>
        </Pressable>
      </View>
    </View>
  );
}

type CategoryShopsSectionProps = {
  onVisitShop: (shopId: string) => void;
  onViewAllCategory: (categoryId: string) => void;
};

export function CategoryShopsSection({ onVisitShop, onViewAllCategory }: CategoryShopsSectionProps) {
  return (
    <View style={styles.container}>
      {DEMO_CATEGORIES.map((category) => (
        <View key={category.id} style={styles.categoryBlock}>
          <View style={styles.sectionHeader}>
            <AppText style={styles.sectionTitle}>{category.name}</AppText>
            <View style={styles.headerActions}>
              <Pressable onPress={() => onViewAllCategory(category.id)}>
                <AppText style={styles.viewAllText}>View All</AppText>
              </Pressable>
            </View>
          </View>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.cardRow}
          >
            {category.shops.map((shop) => (
              <ShopCard key={shop.id} shop={shop} onVisitShop={onVisitShop} />
            ))}
          </ScrollView>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: 4,
  },
  categoryBlock: {
    marginBottom: 18,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 26,
    fontWeight: '700',
    color: '#111827',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  viewAllText: {
    color: '#22A55D',
    fontWeight: '600',
    fontSize: 15,
    marginRight: 2,
  },
  cardRow: {
    paddingBottom: 6,
    paddingRight: 8,
  },
  card: {
    width: 170,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    overflow: 'hidden',
    marginRight: 12,
  },
  cardImage: {
    width: '100%',
    height: 110,
  },
  cardBody: {
    paddingHorizontal: 10,
    paddingVertical: 10,
  },
  shopName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  shopInfo: {
    fontSize: 13,
    color: '#6B7280',
  },
  shopTiming: {
    marginTop: 4,
    fontSize: 12,
    color: '#4B5563',
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
