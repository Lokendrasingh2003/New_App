export type MockCategory = {
  id: string;
  name: string;
};

export const MOCK_CATEGORIES: MockCategory[] = [
  { id: 'grocery', name: 'Grocery' },
  { id: 'fruits-vegetables', name: 'Fruits & Vegetables' },
  { id: 'dairy', name: 'Dairy' },
  { id: 'bakery', name: 'Bakery' },
  { id: 'snacks', name: 'Snacks' },
  { id: 'beverages', name: 'Beverages' },
  { id: 'household', name: 'Household' },
  { id: 'personal-care', name: 'Personal Care' },
  { id: 'pharmacy', name: 'Pharmacy' },
  { id: 'clothing', name: 'Clothing' },
];

export const getCategoryLabel = (categoryId: string) => {
  return MOCK_CATEGORIES.find((item) => item.id === categoryId)?.name ?? categoryId;
};
