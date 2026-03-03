import { useEffect, useRef, useState } from 'react';
import { FlatList, Image, StyleSheet, useWindowDimensions, View } from 'react-native';

import { AppText } from '../../ui/AppText';
import { BannerCarouselBlock as BannerCarouselBlockType } from '../../../types/homeConfig';

type Props = {
  block: BannerCarouselBlockType;
};

export function BannerCarouselBlock({ block }: Props) {
  const [index, setIndex] = useState(0);
  const listRef = useRef<FlatList<(typeof block.data)[number]>>(null);
  const { width } = useWindowDimensions();

  const itemWidth = Math.max(width - 32, 280);

  useEffect(() => {
    if (block.data.length <= 1) {
      return;
    }

    const timer = setInterval(() => {
      setIndex((prev) => {
        const nextIndex = (prev + 1) % block.data.length;
        listRef.current?.scrollToIndex({ index: nextIndex, animated: true });
        return nextIndex;
      });
    }, 2600);

    return () => clearInterval(timer);
  }, [block.data.length]);

  if (block.data.length === 0) {
    return null;
  }

  return (
    <View style={styles.wrap}>
      <FlatList
        ref={listRef}
        horizontal
        data={block.data}
        keyExtractor={(item) => item.id}
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        getItemLayout={(_, itemIndex) => ({
          length: itemWidth,
          offset: itemWidth * itemIndex,
          index: itemIndex,
        })}
        onMomentumScrollEnd={(event) => {
          const nextIndex = Math.round(event.nativeEvent.contentOffset.x / itemWidth);
          setIndex(nextIndex);
        }}
        renderItem={({ item }) => (
          <View style={[styles.bannerWrap, { width: itemWidth }]}>
            <Image source={{ uri: item.imageUrl }} style={styles.bannerImage} resizeMode="cover" />
          </View>
        )}
      />

      <View style={styles.dotRow}>
        {block.data.map((item, dotIndex) => (
          <View key={item.id} style={[styles.dot, dotIndex === index ? styles.dotActive : null]} />
        ))}
      </View>

      {block.title ? <AppText style={styles.hiddenTitle}>{block.title}</AppText> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginBottom: 16,
  },
  bannerWrap: {
    borderRadius: 14,
    overflow: 'hidden',
    height: 160,
  },
  bannerImage: {
    width: '100%',
    height: '100%',
    marginRight: 10,
    backgroundColor: '#F3F4F6',
  },
  dotRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
    marginTop: 10,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#D1D5DB',
  },
  dotActive: {
    backgroundColor: '#2563EB',
  },
  hiddenTitle: {
    height: 0,
    opacity: 0,
  },
});
