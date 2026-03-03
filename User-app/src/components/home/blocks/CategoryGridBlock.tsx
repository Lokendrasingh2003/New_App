import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Image, Pressable, StyleSheet, View } from 'react-native';

import { HomeStackParamList } from '../../../navigation/types';
import { CategoryGridBlock as CategoryGridBlockType } from '../../../types/homeConfig';
import { AppText } from '../../ui/AppText';
import { SectionHeader } from '../../ui/SectionHeader';

type Props = {
  block: CategoryGridBlockType;
};

export function CategoryGridBlock({ block }: Props) {
  const navigation = useNavigation<NativeStackNavigationProp<HomeStackParamList>>();

  if (block.data.length === 0) {
    return null;
  }

  return (
    <View style={styles.wrap}>
      <SectionHeader title={block.title ?? 'Categories'} />

      <View style={styles.grid}>
        {block.data.map((item) => (
          <Pressable
            key={item.id}
            style={styles.card}
            onPress={() => navigation.navigate('CategoryShops', { categoryId: item.id })}
          >
            <Image source={{ uri: item.imageUrl }} style={styles.image} resizeMode="cover" />
            <AppText style={styles.label} numberOfLines={1}>
              {item.name}
            </AppText>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginBottom: 18,
  },
  grid: {
    marginTop: 12,
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 10,
  },
  card: {
    width: '23%',
    alignItems: 'center',
  },
  image: {
    width: '100%',
    aspectRatio: 1,
    borderRadius: 10,
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  label: {
    marginTop: 6,
    fontSize: 12,
    color: '#1F2937',
    fontWeight: '600',
    textAlign: 'center',
  },
});
