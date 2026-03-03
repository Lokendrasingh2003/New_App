import { useEffect, useState } from 'react';
import { ActivityIndicator, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';

import { BlockRenderer } from '../components/home/BlockRenderer';
import { AppFooter } from '../components/ui/AppFooter';
import { Screen } from '../components/ui/Screen';
import { EmptyState } from '../components/ui/EmptyState';
import { AppHeader } from '../components/ui/AppHeader';
import { getHomeConfig } from '../services/homeConfig/homeConfigService';
import { HomeConfigResponse } from '../types/homeConfig';

export function HomeScreen() {
  const [homeConfig, setHomeConfig] = useState<HomeConfigResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const loadConfig = async (forceRefresh = false) => {
    try {
      setErrorMessage(null);
      const config = await getHomeConfig({ forceRefresh });
      setHomeConfig(config);
    } catch {
      setErrorMessage('Failed to load home content. Please try again.');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    loadConfig();
  }, []);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await loadConfig(true);
  };

  return (
    <Screen>
      <AppHeader />
      {isLoading ? (
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="large" color="#22A55D" />
        </View>
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={handleRefresh}
              tintColor="#22A55D"
            />
          }
        >
          {errorMessage ? (
            <View style={styles.emptyWrap}>
              <EmptyState
                title="Home unavailable"
                description={errorMessage}
                actionLabel="Retry"
                onActionPress={() => {
                  setIsLoading(true);
                  loadConfig(true);
                }}
              />
            </View>
          ) : homeConfig ? (
            <>
              <BlockRenderer blocks={homeConfig.blocks} />
              <AppFooter />
            </>
          ) : (
            <View style={styles.emptyWrap}>
              <EmptyState
                title="No content"
                description="Home content is currently unavailable. Pull to refresh."
              />
            </View>
          )}
        </ScrollView>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  loadingWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollContent: {
    paddingBottom: 8,
  },
  emptyWrap: {
    minHeight: 300,
    justifyContent: 'center',
  },
});
