import { NativeStackScreenProps } from '@react-navigation/native-stack';

import { AppHeader } from '../components/ui/AppHeader';
import { Screen } from '../components/ui/Screen';
import { getCategoryById } from '../constants/demoShops';
import { HomeStackParamList } from '../navigation/types';
import { ShopListingContent } from './ShopListingScreen';

type Props = NativeStackScreenProps<HomeStackParamList, 'CategoryShops'>;

export function CategoryShopsScreen({ route, navigation }: Props) {
  const { categoryId } = route.params;
  const category = getCategoryById(categoryId);

  return (
    <Screen>
      <AppHeader />
      <ShopListingContent
        categoryId={categoryId}
        title={category?.name}
        subtitle="All shops in this category"
        onShopPress={(shopId) => navigation.navigate('ShopDetails', { shopId })}
      />
    </Screen>
  );
}
