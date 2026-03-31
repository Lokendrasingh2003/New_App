import { StyleSheet, View } from 'react-native';

import { SpacerBlock as SpacerBlockType } from '../../../types/homeConfig';

type Props = {
  block: SpacerBlockType;
};

export function SpacerBlock({ block }: Props) {
  return <View style={[styles.spacer, { height: Math.max(block.data.height, 0) }]} />;
}

const styles = StyleSheet.create({
  spacer: {
    width: '100%',
  },
});
