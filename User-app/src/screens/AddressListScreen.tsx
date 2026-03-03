import { NavigationProp, ParamListBase, useFocusEffect, useNavigation } from '@react-navigation/native';
import { useCallback, useState } from 'react';
import { Alert, Pressable, StyleSheet, View } from 'react-native';

import { AppButton } from '../components/ui/AppButton';
import { AppHeader } from '../components/ui/AppHeader';
import { AppText } from '../components/ui/AppText';
import { EmptyState } from '../components/ui/EmptyState';
import { Screen } from '../components/ui/Screen';
import { SectionHeader } from '../components/ui/SectionHeader';
import { deleteAddress, getAddresses, setDefaultAddress } from '../services/address/addressService';
import { Address } from '../types/address';

export function AddressListScreen() {
  const navigation = useNavigation<NavigationProp<ParamListBase>>();
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [loadingAddressId, setLoadingAddressId] = useState<string | null>(null);

  const loadAddresses = useCallback(async () => {
    const nextAddresses = await getAddresses();
    setAddresses(nextAddresses);
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadAddresses();
    }, [loadAddresses]),
  );

  const handleSetDefault = async (addressId: string) => {
    setLoadingAddressId(addressId);
    await setDefaultAddress(addressId);
    await loadAddresses();
    setLoadingAddressId(null);
  };

  const handleDeleteAddress = (address: Address) => {
    Alert.alert('Delete address?', `Remove ${address.name} address?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          await deleteAddress(address.id);
          await loadAddresses();
        },
      },
    ]);
  };

  return (
    <Screen scroll>
      <AppHeader />
      <SectionHeader title="My Addresses" />

      <View style={styles.contentWrap}>
        {addresses.length === 0 ? (
          <View style={styles.emptyWrap}>
            <EmptyState title="No addresses yet" description="Add an address for faster checkout." />
            <View style={styles.addFirstButtonWrap}>
              <AppButton
                title="Add New Address"
                onPress={() => navigation.navigate('AddEditAddress')}
              />
            </View>
          </View>
        ) : (
          <>
            {addresses.map((address) => (
              <View key={address.id} style={styles.card}>
                <View style={styles.cardHeaderRow}>
                  <AppText style={styles.addressName}>{address.name}</AppText>
                  {address.isDefault ? <AppText style={styles.defaultBadge}>Default</AppText> : null}
                </View>

                <AppText style={styles.fullName}>{address.fullName}</AppText>
                <AppText style={styles.addressText}>
                  {address.line1}
                  {address.line2 ? `, ${address.line2}` : ''}
                  {address.area ? `, ${address.area}` : ''}
                  {address.landmark ? `, Landmark: ${address.landmark}` : ''}
                  {`\n${address.city} - ${address.pincode}`}
                </AppText>
                <AppText style={styles.phoneText}>Phone: {address.phone}</AppText>

                <View style={styles.actionsRow}>
                  <Pressable
                    style={styles.actionPill}
                    onPress={() => navigation.navigate('AddEditAddress', { addressId: address.id })}
                  >
                    <AppText style={styles.actionText}>Edit</AppText>
                  </Pressable>

                  <Pressable style={styles.actionPill} onPress={() => handleDeleteAddress(address)}>
                    <AppText style={styles.actionTextDanger}>Delete</AppText>
                  </Pressable>

                  {!address.isDefault ? (
                    <Pressable
                      style={styles.actionPill}
                      disabled={loadingAddressId === address.id}
                      onPress={() => handleSetDefault(address.id)}
                    >
                      <AppText style={styles.actionTextPrimary}>
                        {loadingAddressId === address.id ? 'Setting...' : 'Set Default'}
                      </AppText>
                    </Pressable>
                  ) : null}
                </View>
              </View>
            ))}

            <AppButton
              title="Add New Address"
              onPress={() => navigation.navigate('AddEditAddress')}
            />
          </>
        )}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  contentWrap: {
    marginTop: 10,
    gap: 10,
    paddingBottom: 28,
  },
  emptyWrap: {
    marginTop: 16,
    gap: 14,
  },
  addFirstButtonWrap: {
    marginTop: 4,
  },
  card: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    padding: 12,
    gap: 6,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  addressName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
  },
  defaultBadge: {
    fontSize: 12,
    fontWeight: '700',
    color: '#166534',
    backgroundColor: '#DCFCE7',
    borderRadius: 999,
    paddingVertical: 4,
    paddingHorizontal: 10,
  },
  fullName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
  },
  addressText: {
    fontSize: 13,
    color: '#4B5563',
    lineHeight: 19,
  },
  phoneText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#111827',
  },
  actionsRow: {
    marginTop: 2,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
  actionPill: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#FFFFFF',
  },
  actionText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#111827',
  },
  actionTextPrimary: {
    fontSize: 12,
    fontWeight: '600',
    color: '#2563EB',
  },
  actionTextDanger: {
    fontSize: 12,
    fontWeight: '600',
    color: '#DC2626',
  },
});
