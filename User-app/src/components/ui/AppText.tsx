import { StyleSheet, Text, TextProps } from 'react-native';

type AppTextProps = TextProps;

export function AppText({ style, ...props }: AppTextProps) {
  return <Text style={[styles.text, style]} {...props} />;
}

const styles = StyleSheet.create({
  text: {
    color: '#111827',
  },
});
