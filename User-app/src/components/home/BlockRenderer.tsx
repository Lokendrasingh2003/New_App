import { StyleSheet, View } from 'react-native';

import { HomeBlock } from '../../types/homeConfig';
import { AppText } from '../ui/AppText';
import { BannerCarouselBlock } from './blocks/BannerCarouselBlock';
import { CategoryGridBlock } from './blocks/CategoryGridBlock';
import { CouponHighlightsBlock } from './blocks/CouponHighlightsBlock';
import { FeaturedShopsBlock } from './blocks/FeaturedShopsBlock';
import { RecommendedProductsBlock } from './blocks/RecommendedProductsBlock';
import { SpacerBlock } from './blocks/SpacerBlock';

type Props = {
  blocks: HomeBlock[];
};

export function BlockRenderer({ blocks }: Props) {
  // Remove trailing spacer blocks to avoid a blank area right above the footer.
  const trimmedBlocks = (() => {
    let lastNonSpacerIndex = blocks.length - 1;
    while (lastNonSpacerIndex >= 0 && blocks[lastNonSpacerIndex]?.type === 'spacer') {
      lastNonSpacerIndex -= 1;
    }
    return blocks.slice(0, Math.max(lastNonSpacerIndex + 1, 0));
  })();

  return (
    <View>
      {trimmedBlocks.map((block, index) => {
        const isLast = index === trimmedBlocks.length - 1;
        switch (block.type) {
          case 'banner_carousel':
            return <BannerCarouselBlock key={block.id} block={block} isLast={isLast} />;
          case 'category_grid':
            return <CategoryGridBlock key={block.id} block={block} isLast={isLast} />;
          case 'featured_shops':
            return <FeaturedShopsBlock key={block.id} block={block} isLast={isLast} />;
          case 'recommended_products':
            return <RecommendedProductsBlock key={block.id} block={block} isLast={isLast} />;
          case 'coupon_highlights':
            return <CouponHighlightsBlock key={block.id} block={block} isLast={isLast} />;
          case 'spacer':
            return <SpacerBlock key={block.id} block={block} />;
          default: {
            const unknownBlock = block as unknown as { id: string; type: string };
            return (
              <View key={unknownBlock.id} style={styles.unknownBlock}>
                <AppText style={styles.unknownText}>Unsupported block: {unknownBlock.type}</AppText>
              </View>
            );
          }
        }
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  unknownBlock: {
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#FCA5A5',
    backgroundColor: '#FEF2F2',
    paddingHorizontal: 10,
    paddingVertical: 8,
    marginBottom: 12,
  },
  unknownText: {
    color: '#991B1B',
    fontSize: 12,
    fontWeight: '600',
  },
});
