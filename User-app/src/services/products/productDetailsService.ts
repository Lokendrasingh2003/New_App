import { getMockShopById } from '../shops/mockShopDetails';
import { getMockProducts, Product } from './mockProducts';

export function getProductById(shopId: string, productId: string): Product | null {
  const shop = getMockShopById(shopId);

  for (const subcategory of shop.subcategories) {
    const products = getMockProducts({ shopId, subcategoryId: subcategory.id });
    const found = products.find((product) => product.id === productId);

    if (found) {
      return found;
    }
  }

  return null;
}
