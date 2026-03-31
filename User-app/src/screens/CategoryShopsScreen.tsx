import { NativeStackScreenProps } from '@react-navigation/native-stack';

import { Screen } from '../components/ui/Screen';
import { HomeStackParamList } from '../navigation/types';
import { ShopListingContent } from './ShopListingScreen';

type Props = NativeStackScreenProps<HomeStackParamList, 'CategoryShops'>;

export function CategoryShopsScreen({ route, navigation }: Props) {
  const { categoryId } = route.params;

  return (
    <Screen>
      <ShopListingContent
        categoryId={categoryId}
        title="Category Shops"
        subtitle="All shops in this category"
        onShopPress={(shopId) => navigation.navigate('ShopDetails', { shopId })}
      />
    </Screen>
  );
}
