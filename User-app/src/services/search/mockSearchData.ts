import { DEMO_CATEGORIES } from '../../constants/demoShops';
import { getMockProducts } from '../products/mockProducts';
import { getMockShopById } from '../shops/mockShopDetails';

export type MockSearchShop = {
  id: string;
  name: string;
  categoryId: string;
  rating: number;
  eta: string;
};

export type MockSearchProduct = {
  id: string;
  productId: string;
  name: string;
  price: number;
  mrp?: number;
  shopId: string;
  categoryId: string;
};

export type MockSearchCategory = {
  id: string;
  name: string;
};

export const mockCategories: MockSearchCategory[] = DEMO_CATEGORIES.map((category) => ({
  id: category.id,
  name: category.name,
}));

export const mockShops: MockSearchShop[] = DEMO_CATEGORIES.flatMap((category) =>
  category.shops.map((shop, index) => ({
    id: shop.id,
    name: shop.name,
    categoryId: category.id,
    rating: Number((4.1 + (index % 4) * 0.2).toFixed(1)),
    eta: shop.info.includes('mins') ? shop.info.split('•')[1].trim() : '15 mins',
  })),
);

export const mockProducts: MockSearchProduct[] = DEMO_CATEGORIES.flatMap((category) =>
  category.shops.flatMap((shop) => {
    const subcategories = getMockShopById(shop.id).subcategories;

    return subcategories.flatMap((subcategory) =>
      getMockProducts({ shopId: shop.id, subcategoryId: subcategory.id }).map((product) => ({
        id: product.id,
        productId: product.id,
        name: product.name,
        price: product.price,
        mrp: product.mrp,
        shopId: shop.id,
        categoryId: category.id,
      })),
    );
  }),
);
