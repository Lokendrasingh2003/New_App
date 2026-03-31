import {
  NavigationProp,
  ParamListBase,
  RouteProp,
  useFocusEffect,
  useNavigation,
  useRoute,
} from '@react-navigation/native';
import { useCallback, useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { AppButton } from '../components/ui/AppButton';
import { AppHeader } from '../components/ui/AppHeader';
import { AppInput } from '../components/ui/AppInput';
import { AppText } from '../components/ui/AppText';
import { Screen } from '../components/ui/Screen';
import { SectionHeader } from '../components/ui/SectionHeader';
import { useCity } from '../contexts/CityContext';
import { HomeStackParamList } from '../navigation/types';
import { getAddresses, saveAddress } from '../services/address/addressService';
import { Address } from '../types/address';

type AddressFormState = {
  name: string;
  fullName: string;
  phone: string;
  line1: string;
  line2: string;
  landmark: string;
  area: string;
  city: string;
  pincode: string;
  isDefault: boolean;
};

type AddressFormErrors = Partial<Record<keyof AddressFormState, string>>;

const createAddressId = () => `addr_${Date.now()}_${Math.floor(Math.random() * 10000)}`;

const getInitialForm = (cityName?: string): AddressFormState => ({
  name: 'Home',
  fullName: '',
  phone: '',
  line1: '',
  line2: '',
  landmark: '',
  area: '',
  city: cityName ?? 'Gwalior',
  pincode: '',
  isDefault: false,
});

export function AddEditAddressScreen() {
  const route = useRoute<RouteProp<HomeStackParamList, 'AddEditAddress'>>();
  const navigation = useNavigation<NavigationProp<ParamListBase>>();
  const { city } = useCity();

  const routeParams = route.params;
  const isEditMode = Boolean(routeParams?.addressId);

  const [form, setForm] = useState<AddressFormState>(getInitialForm(city?.name));
  const [existingAddress, setExistingAddress] = useState<Address | null>(null);
  const [errors, setErrors] = useState<AddressFormErrors>({});
  const [isSaving, setIsSaving] = useState(false);

  useFocusEffect(
    useCallback(() => {
      const hydrate = async () => {
        const allAddresses = await getAddresses();

        if (!isEditMode) {
          const hasDefault = allAddresses.some((item) => item.isDefault);
          setForm((previousForm) => ({
            ...previousForm,
            city: previousForm.city || city?.name || 'Gwalior',
            isDefault: !hasDefault,
          }));
          return;
        }

        const targetAddress = allAddresses.find((item) => item.id === routeParams?.addressId) ?? null;
        setExistingAddress(targetAddress);

        if (targetAddress) {
          setForm({
            name: targetAddress.name,
            fullName: targetAddress.fullName,
            phone: targetAddress.phone,
            line1: targetAddress.line1,
            line2: targetAddress.line2 ?? '',
            landmark: targetAddress.landmark ?? '',
            area: targetAddress.area ?? '',
            city: targetAddress.city,
            pincode: targetAddress.pincode,
            isDefault: targetAddress.isDefault,
          });
        }
      };

      hydrate();
    }, [city?.name, isEditMode, routeParams?.addressId]),
  );

  const title = useMemo(() => (isEditMode ? 'Edit Address' : 'Add Address'), [isEditMode]);

  const setFormField = <K extends keyof AddressFormState>(key: K, value: AddressFormState[K]) => {
    setForm((previous) => ({ ...previous, [key]: value }));
    setErrors((previous) => ({ ...previous, [key]: undefined }));
  };

  const validateForm = (): boolean => {
    const nextErrors: AddressFormErrors = {};

    if (!form.name.trim()) {
      nextErrors.name = 'Please select a label.';
    }

    if (!form.fullName.trim()) {
      nextErrors.fullName = 'Full name is required.';
    }

    if (!/^\d{10}$/.test(form.phone.trim())) {
      nextErrors.phone = 'Phone must be 10 digits.';
    }

    if (!form.line1.trim()) {
      nextErrors.line1 = 'Address line 1 is required.';
    }

    if (!form.city.trim()) {
      nextErrors.city = 'City is required.';
    }

    if (!/^\d{6}$/.test(form.pincode.trim())) {
      nextErrors.pincode = 'Pincode must be 6 digits.';
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleSave = async () => {
    if (!validateForm()) {
      return;
    }

    setIsSaving(true);

    const nowIso = new Date().toISOString();
    const nextAddress: Address = {
      id: existingAddress?.id ?? createAddressId(),
      name: form.name.trim(),
      fullName: form.fullName.trim(),
      phone: form.phone.trim(),
      line1: form.line1.trim(),
      line2: form.line2.trim() || undefined,
      landmark: form.landmark.trim() || undefined,
      area: form.area.trim() || undefined,
      city: form.city.trim(),
      pincode: form.pincode.trim(),
      isDefault: form.isDefault,
      createdAt: existingAddress?.createdAt ?? nowIso,
      updatedAt: nowIso,
    };

    await saveAddress(nextAddress);
    setIsSaving(false);
    navigation.goBack();
  };

  return (
    <Screen scroll>
      <AppHeader />
      <SectionHeader title={title} />

      <View style={styles.formWrap}>
        <AppText style={styles.fieldLabel}>Label</AppText>
        <View style={styles.labelRow}>
          {['Home', 'Office', 'Other'].map((label) => {
            const selected = form.name === label;

            return (
              <Pressable
                key={label}
                style={[styles.labelChip, selected ? styles.labelChipActive : null]}
                onPress={() => setFormField('name', label)}
              >
                <AppText style={[styles.labelChipText, selected ? styles.labelChipTextActive : null]}>
                  {label}
                </AppText>
              </Pressable>
            );
          })}
        </View>
        {errors.name ? <AppText style={styles.errorText}>{errors.name}</AppText> : null}

        <AppInput
          label="Full Name"
          value={form.fullName}
          onChangeText={(text) => setFormField('fullName', text)}
          placeholder="Enter full name"
          error={errors.fullName}
        />

        <AppInput
          label="Phone"
          value={form.phone}
          onChangeText={(text) => setFormField('phone', text.replace(/[^\d]/g, ''))}
          keyboardType="number-pad"
          maxLength={10}
          placeholder="10 digit phone number"
          error={errors.phone}
        />

        <AppInput
          label="Address Line 1"
          value={form.line1}
          onChangeText={(text) => setFormField('line1', text)}
          placeholder="House no., building, street"
          error={errors.line1}
        />

        <AppInput
          label="Address Line 2"
          value={form.line2}
          onChangeText={(text) => setFormField('line2', text)}
          placeholder="Apartment, floor (optional)"
        />

        <AppInput
          label="Landmark"
          value={form.landmark}
          onChangeText={(text) => setFormField('landmark', text)}
          placeholder="Nearby place (optional)"
        />

        <AppInput
          label="Area"
          value={form.area}
          onChangeText={(text) => setFormField('area', text)}
          placeholder="Area or locality (optional)"
        />

        <AppInput
          label="City"
          value={form.city}
          onChangeText={(text) => setFormField('city', text)}
          placeholder="City"
          error={errors.city}
        />

        <AppInput
          label="Pincode"
          value={form.pincode}
          onChangeText={(text) => setFormField('pincode', text.replace(/[^\d]/g, ''))}
          keyboardType="number-pad"
          maxLength={6}
          placeholder="6 digit pincode"
          error={errors.pincode}
        />

        <Pressable style={styles.defaultRow} onPress={() => setFormField('isDefault', !form.isDefault)}>
          <View style={[styles.checkbox, form.isDefault ? styles.checkboxChecked : null]}>
            {form.isDefault ? <AppText style={styles.checkboxTick}>✓</AppText> : null}
          </View>
          <AppText style={styles.defaultText}>Set as default</AppText>
        </Pressable>

        <AppButton title="Save Address" loading={isSaving} onPress={handleSave} />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  formWrap: {
    marginTop: 10,
    gap: 12,
    paddingBottom: 28,
  },
  fieldLabel: {
    fontSize: 14,
    color: '#374151',
    fontWeight: '600',
    marginBottom: -4,
  },
  labelRow: {
    flexDirection: 'row',
    gap: 8,
  },
  labelChip: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#FFFFFF',
  },
  labelChipActive: {
    borderColor: '#2563EB',
    backgroundColor: '#EFF6FF',
  },
  labelChipText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#374151',
  },
  labelChipTextActive: {
    color: '#1D4ED8',
  },
  errorText: {
    marginTop: -8,
    marginBottom: 2,
    fontSize: 12,
    color: '#DC2626',
  },
  defaultRow: {
    marginTop: 2,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
  },
  checkboxChecked: {
    borderColor: '#2563EB',
    backgroundColor: '#2563EB',
  },
  checkboxTick: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 12,
  },
  defaultText: {
    fontSize: 14,
    color: '#111827',
    fontWeight: '600',
  },
});
