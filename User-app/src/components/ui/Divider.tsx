import { StyleSheet, View, ViewStyle } from 'react-native';

type DividerProps = {
  spacingVertical?: number;
  insetHorizontal?: number;
  color?: string;
};

export function Divider({
  spacingVertical = 12,
  insetHorizontal = 0,
  color = '#E5E7EB',
}: DividerProps) {
  return (
    <View
      style={[
        styles.divider,
        {
          marginVertical: spacingVertical,
          marginHorizontal: insetHorizontal,
          backgroundColor: color,
        } satisfies ViewStyle,
      ]}
    />
  );
}

const styles = StyleSheet.create({
  divider: {
    height: 1,
    width: '100%',
  },
});
