import { FlatList, Image, ImageSourcePropType, StyleSheet, useWindowDimensions, View } from 'react-native';
import { useEffect, useRef, useState } from 'react';

const DEMO_BANNERS: ImageSourcePropType[] = [
  require('../../../assets/Amazon_Banner.png'),
  require('../../../assets/youtube banner.avif'),
  require('../../../assets/banner 3.jpg'),
];

export function BannerCarousel() {
  const listRef = useRef<FlatList<ImageSourcePropType>>(null);
  const { width } = useWindowDimensions();
  const [activeIndex, setActiveIndex] = useState(0);

  const itemWidth = Math.max(width - 32, 280);

  useEffect(() => {
    const interval = setInterval(() => {
      const nextIndex = (activeIndex + 1) % DEMO_BANNERS.length;
      listRef.current?.scrollToIndex({
        index: nextIndex,
        animated: true,
      });
      setActiveIndex(nextIndex);
    }, 5000);

    return () => clearInterval(interval);
  }, [activeIndex]);

  return (
    <View>
      <FlatList
        ref={listRef}
        horizontal
        data={DEMO_BANNERS}
        keyExtractor={(_, index) => `banner-${index}`}
        showsHorizontalScrollIndicator={false}
        pagingEnabled
        decelerationRate="fast"
        getItemLayout={(_, index) => ({
          length: itemWidth,
          offset: itemWidth * index,
          index,
        })}
        onMomentumScrollEnd={(event) => {
          const nextIndex = Math.round(event.nativeEvent.contentOffset.x / itemWidth);
          setActiveIndex(nextIndex);
        }}
        renderItem={({ item }) => (
          <View style={[styles.bannerContainer, { width: itemWidth }]}> 
            <Image source={item} style={styles.bannerImage} resizeMode="cover" />
          </View>
        )}
      />

      <View style={styles.dotRow}>
        {DEMO_BANNERS.map((_, index) => (
          <View
            key={`dot-${index}`}
            style={[styles.dot, index === activeIndex ? styles.dotActive : styles.dotInactive]}
          />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  bannerContainer: {
    borderRadius: 14,
    overflow: 'hidden',
    height: 160,
  },
  bannerImage: {
    width: '100%',
    height: '100%',
  },
  dotRow: {
    marginTop: 10,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  dotActive: {
    backgroundColor: '#2563EB',
  },
  dotInactive: {
    backgroundColor: '#D1D5DB',
  },
});
