import { NavigationProp, ParamListBase, useNavigation } from '@react-navigation/native';
import { useEffect, useMemo, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { AppHeader } from '../components/ui/AppHeader';
import { AppText } from '../components/ui/AppText';
import { Chip } from '../components/ui/Chip';
import { EmptyState } from '../components/ui/EmptyState';
import { Screen } from '../components/ui/Screen';
import { SectionHeader } from '../components/ui/SectionHeader';
import {
  clearRecentSearches,
  addRecentSearch,
  getRecentSearches,
} from '../services/search/recentSearchesService';
import { MockSearchProduct } from '../services/search/mockSearchData';
import { SearchSuggestionType, searchAll } from '../services/search/searchService';

const TRENDING_SEARCHES = [
  'Medicine',
  'Daily Needs',
  'Milk',
  'Bread',
  'Vegetables',
  'Pharmacy',
  'Fruits',
  'Snacks',
];

type SearchViewMode = 'suggestions' | 'results';

const iconBySuggestionType: Record<SearchSuggestionType, string> = {
  Shop: '🏪',
  Product: '🛍️',
  Category: '🏷️',
};

export function SearchScreen() {
  const navigation = useNavigation<NavigationProp<ParamListBase>>();
  const [query, setQuery] = useState('');
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [mode, setMode] = useState<SearchViewMode>('suggestions');

  const trimmedQuery = query.trim();
  const isEmptyQuery = trimmedQuery.length === 0;
  const searchResult = useMemo(() => searchAll(trimmedQuery), [trimmedQuery]);

  useEffect(() => {
    const loadRecents = async () => {
      const values = await getRecentSearches();
      setRecentSearches(values);
    };

    loadRecents();
  }, []);

  const handleInputChange = (value: string) => {
    setQuery(value);
    setMode('suggestions');
  };

  const executeSearch = async (value: string) => {
    const normalized = value.trim();
    if (!normalized) {
      return;
    }

    setQuery(normalized);
    setMode('results');
    await addRecentSearch(normalized);
    const updatedRecents = await getRecentSearches();
    setRecentSearches(updatedRecents);
  };

  const handleSuggestionPress = async (label: string) => {
    await executeSearch(label);
  };

  const handleShopPress = async (shopId: string, shopName: string) => {
    await executeSearch(shopName);
    navigation.navigate('Home', {
      screen: 'ShopDetails',
      params: { shopId },
    });
  };

  const handleCategoryPress = async (categoryId: string, categoryName: string) => {
    await executeSearch(categoryName);
    navigation.navigate('Home', {
      screen: 'CategoryShops',
      params: { categoryId },
    });
  };

  const handleProductPress = async (product: MockSearchProduct) => {
    await executeSearch(product.name);

    if (product.shopId && product.productId) {
      navigation.navigate('Home', {
        screen: 'ProductDetail',
        params: {
          shopId: product.shopId,
          productId: product.productId,
        },
      });
      return;
    }

    Alert.alert('Coming soon', 'Product detail coming soon');
  };

  const handleClearRecent = async () => {
    await clearRecentSearches();
    setRecentSearches([]);
  };

  const showSuggestions = !isEmptyQuery && mode === 'suggestions';
  const showResults = !isEmptyQuery && mode === 'results';
  const hasResults =
    searchResult.shops.length > 0 ||
    searchResult.products.length > 0 ||
    searchResult.categories.length > 0;

  return (
    <Screen>
      <AppHeader
        enableSearchInput
        searchValue={query}
        searchPlaceholder="Search shops, products, categories"
        searchAutoFocus
        onSearchChangeText={handleInputChange}
        onSearchSubmit={executeSearch}
        onSearchClear={() => handleInputChange('')}
      />

      <ScrollView style={styles.contentWrap} showsVerticalScrollIndicator={false}>
        {isEmptyQuery ? (
          <>
            <View style={styles.sectionWrap}>
              <SectionHeader title="Trending Searches" />
              <View style={styles.chipsWrap}>
                {TRENDING_SEARCHES.map((term) => (
                  <Chip key={term} label={term} onPress={() => executeSearch(term)} />
                ))}
              </View>
            </View>

            <View style={styles.sectionWrap}>
              <SectionHeader
                title="Recent Searches"
                actionLabel="Clear"
                onActionPress={handleClearRecent}
              />
              {recentSearches.length === 0 ? (
                <View style={styles.emptyRecentWrap}>
                  <EmptyState
                    title="No recent searches"
                    description="Your recent searches will appear here."
                  />
                </View>
              ) : (
                <View style={styles.chipsWrap}>
                  {recentSearches.map((term) => (
                    <Chip key={term} label={term} onPress={() => executeSearch(term)} />
                  ))}
                </View>
              )}
            </View>
          </>
        ) : null}

        {showSuggestions ? (
          <View style={styles.sectionWrap}>
            <SectionHeader title="Suggestions" />

            {searchResult.suggestions.length === 0 ? (
              <View style={styles.emptyRecentWrap}>
                <EmptyState title="No suggestions" description="Try typing a different keyword." />
              </View>
            ) : (
              <View style={styles.suggestionList}>
                {searchResult.suggestions.slice(0, 6).map((suggestion) => (
                  <Pressable
                    key={suggestion.id}
                    style={styles.suggestionRow}
                    onPress={() => handleSuggestionPress(suggestion.label)}
                  >
                    <AppText style={styles.suggestionIcon}>
                      {iconBySuggestionType[suggestion.type]}
                    </AppText>
                    <AppText style={styles.suggestionLabel}>{suggestion.label}</AppText>
                    <View style={styles.typeBadge}>
                      <AppText style={styles.typeBadgeText}>{suggestion.type}</AppText>
                    </View>
                  </Pressable>
                ))}
              </View>
            )}
          </View>
        ) : null}

        {showResults ? (
          <View style={styles.sectionWrap}>
            {!hasResults ? (
              <View style={styles.emptyResultsWrap}>
                <EmptyState
                  title="No results found"
                  description="Try searching with a different term."
                />
              </View>
            ) : (
              <>
                <View style={styles.resultSection}>
                  <SectionHeader
                    title="Shops"
                    actionLabel={searchResult.shops.length > 5 ? 'View all' : undefined}
                    onActionPress={() => Alert.alert('Coming soon', 'View all shops coming soon')}
                  />
                  {searchResult.shops.slice(0, 5).map((shop) => (
                    <Pressable
                      key={shop.id}
                      style={styles.resultRow}
                      onPress={() => handleShopPress(shop.id, shop.name)}
                    >
                      <AppText style={styles.resultPrimary}>🏪 {shop.name}</AppText>
                      <AppText style={styles.resultSecondary}>
                        ⭐ {shop.rating.toFixed(1)} • {shop.eta}
                      </AppText>
                    </Pressable>
                  ))}
                </View>

                <View style={styles.resultSection}>
                  <SectionHeader
                    title="Products"
                    actionLabel={searchResult.products.length > 5 ? 'View all' : undefined}
                    onActionPress={() =>
                      Alert.alert('Coming soon', 'View all products coming soon')
                    }
                  />
                  {searchResult.products.slice(0, 5).map((product) => (
                    <Pressable
                      key={product.id}
                      style={styles.resultRow}
                      onPress={() => handleProductPress(product)}
                    >
                      <AppText style={styles.resultPrimary}>🛍️ {product.name}</AppText>
                      <AppText style={styles.resultSecondary}>
                        ₹{product.price}
                        {typeof product.mrp === 'number' ? ` • MRP ₹${product.mrp}` : ''}
                      </AppText>
                    </Pressable>
                  ))}
                </View>

                <View style={styles.resultSection}>
                  <SectionHeader
                    title="Categories"
                    actionLabel={searchResult.categories.length > 5 ? 'View all' : undefined}
                    onActionPress={() =>
                      Alert.alert('Coming soon', 'View all categories coming soon')
                    }
                  />
                  {searchResult.categories.slice(0, 5).map((category) => (
                    <Pressable
                      key={category.id}
                      style={styles.resultRow}
                      onPress={() => handleCategoryPress(category.id, category.name)}
                    >
                      <AppText style={styles.resultPrimary}>🏷️ {category.name}</AppText>
                    </Pressable>
                  ))}
                </View>
              </>
            )}
          </View>
        ) : null}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  contentWrap: {
    flex: 1,
    paddingBottom: 8,
  },
  sectionWrap: {
    marginTop: 8,
    marginBottom: 12,
  },
  chipsWrap: {
    marginTop: 10,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  emptyRecentWrap: {
    minHeight: 180,
    justifyContent: 'center',
  },
  suggestionList: {
    marginTop: 10,
    gap: 8,
  },
  suggestionRow: {
    minHeight: 48,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 10,
    flexDirection: 'row',
    alignItems: 'center',
  },
  suggestionIcon: {
    fontSize: 16,
    marginRight: 8,
  },
  suggestionLabel: {
    flex: 1,
    fontSize: 14,
    color: '#111827',
    fontWeight: '600',
  },
  typeBadge: {
    borderRadius: 12,
    backgroundColor: '#EEF2FF',
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  typeBadgeText: {
    fontSize: 11,
    color: '#3730A3',
    fontWeight: '700',
  },
  emptyResultsWrap: {
    minHeight: 260,
    justifyContent: 'center',
  },
  resultSection: {
    marginBottom: 16,
  },
  resultRow: {
    marginTop: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 10,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 10,
    paddingVertical: 10,
  },
  resultPrimary: {
    fontSize: 14,
    color: '#111827',
    fontWeight: '600',
  },
  resultSecondary: {
    marginTop: 3,
    fontSize: 12,
    color: '#6B7280',
  },
});
