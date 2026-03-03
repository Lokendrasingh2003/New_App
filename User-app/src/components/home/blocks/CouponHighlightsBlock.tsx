import { StyleSheet, View } from 'react-native';

import { CouponHighlightsBlock as CouponHighlightsBlockType } from '../../../types/homeConfig';
import { AppText } from '../../ui/AppText';
import { SectionHeader } from '../../ui/SectionHeader';

type Props = {
  block: CouponHighlightsBlockType;
};

export function CouponHighlightsBlock({ block }: Props) {
  if (block.data.length === 0) {
    return null;
  }

  return (
    <View style={styles.wrap}>
      <SectionHeader title={block.title ?? 'Coupon Highlights'} />

      <View style={styles.list}>
        {block.data.map((coupon) => (
          <View key={coupon.id} style={styles.card}>
            <AppText style={styles.code}>{coupon.code}</AppText>
            <AppText style={styles.description}>{coupon.description}</AppText>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginBottom: 18,
  },
  list: {
    marginTop: 12,
    gap: 8,
  },
  card: {
    borderWidth: 1,
    borderColor: '#A7F3D0',
    backgroundColor: '#ECFDF5',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  code: {
    fontSize: 14,
    fontWeight: '800',
    color: '#166534',
  },
  description: {
    marginTop: 4,
    fontSize: 13,
    color: '#14532D',
  },
});
