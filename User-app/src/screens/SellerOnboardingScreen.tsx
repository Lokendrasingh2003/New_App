import { NavigationProp, ParamListBase, useNavigation } from '@react-navigation/native';
import { useEffect, useMemo, useState } from 'react';
import { Alert, Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { AppButton } from '../components/ui/AppButton';
import { AppHeader } from '../components/ui/AppHeader';
import { AppInput } from '../components/ui/AppInput';
import { AppText } from '../components/ui/AppText';
import { Chip } from '../components/ui/Chip';
import { Screen } from '../components/ui/Screen';
import { SectionHeader } from '../components/ui/SectionHeader';
import { MOCK_CATEGORIES, getCategoryLabel } from '../constants/mockCategories';
import { useCity } from '../contexts/CityContext';
import {
  getDraft,
  saveDraft,
  submitDraft,
} from '../services/shopRegistration/shopRegistrationService';
import { ShopRegistrationDraft } from '../types/shopRegistration';

const TOTAL_STEPS = 5;

const createInitialDraft = (cityId?: string): ShopRegistrationDraft => {
  const nowIso = new Date().toISOString();

  return {
    id: `shopreg_${Date.now()}_${Math.floor(Math.random() * 10000)}`,
    status: 'draft',
    shopName: '',
    description: '',
    primaryCategoryId: '',
    secondaryCategoryIds: [],
    cityId: cityId ?? '',
    addressLine1: '',
    addressLine2: '',
    landmark: '',
    area: '',
    pincode: '',
    latitude: undefined,
    longitude: undefined,
    documents: {
      businessProofUri: undefined,
      identityProofUri: undefined,
      gstNumber: '',
    },
    bank: {
      accountHolderName: '',
      accountNumber: '',
      ifsc: '',
    },
    createdAt: nowIso,
    updatedAt: nowIso,
  };
};

type FormErrors = {
  shopName?: string;
  primaryCategoryId?: string;
  addressLine1?: string;
  pincode?: string;
  cityId?: string;
  accountHolderName?: string;
  accountNumber?: string;
  ifsc?: string;
  confirmSubmit?: string;
};

export function SellerOnboardingScreen() {
  const navigation = useNavigation<NavigationProp<ParamListBase>>();
  const { city } = useCity();

  const [step, setStep] = useState(1);
  const [draft, setDraft] = useState<ShopRegistrationDraft>(createInitialDraft(city?.city_id));
  const [errors, setErrors] = useState<FormErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCategoryPickerOpen, setIsCategoryPickerOpen] = useState(false);
  const [confirmSubmit, setConfirmSubmit] = useState(false);

  useEffect(() => {
    const hydrate = async () => {
      const existingDraft = await getDraft();

      if (existingDraft) {
        setDraft(existingDraft);
        return;
      }

      setDraft(createInitialDraft(city?.city_id));
    };

    hydrate();
  }, [city?.city_id]);

  const cityName = useMemo(() => city?.name ?? 'Not selected', [city?.name]);

  const updateDraft = <K extends keyof ShopRegistrationDraft>(key: K, value: ShopRegistrationDraft[K]) => {
    setDraft((previous) => ({
      ...previous,
      [key]: value,
      updatedAt: new Date().toISOString(),
    }));
    setErrors((previous) => ({ ...previous, [key]: undefined }));
  };

  const setSecondaryCategory = (categoryId: string) => {
    setDraft((previous) => {
      const isSelected = previous.secondaryCategoryIds.includes(categoryId);

      if (isSelected) {
        return {
          ...previous,
          secondaryCategoryIds: previous.secondaryCategoryIds.filter((id) => id !== categoryId),
          updatedAt: new Date().toISOString(),
        };
      }

      if (previous.secondaryCategoryIds.length >= 5) {
        Alert.alert('Limit reached', 'You can select up to 5 secondary categories.');
        return previous;
      }

      return {
        ...previous,
        secondaryCategoryIds: [...previous.secondaryCategoryIds, categoryId],
        updatedAt: new Date().toISOString(),
      };
    });
  };

  const validateStep = () => {
    const nextErrors: FormErrors = {};

    if (step === 1) {
      if (!draft.shopName.trim()) {
        nextErrors.shopName = 'Shop name is required.';
      }

      if (!draft.primaryCategoryId) {
        nextErrors.primaryCategoryId = 'Please choose a primary category.';
      }
    }

    if (step === 2) {
      if (!draft.cityId) {
        nextErrors.cityId = 'City is required.';
      }

      if (!draft.addressLine1.trim()) {
        nextErrors.addressLine1 = 'Address line 1 is required.';
      }

      if (!/^\d{6}$/.test(draft.pincode.trim())) {
        nextErrors.pincode = 'Pincode must be 6 digits.';
      }
    }

    if (step === 4) {
      if (!draft.bank.accountHolderName.trim()) {
        nextErrors.accountHolderName = 'Account holder name is required.';
      }

      if (draft.bank.accountNumber.trim().length < 8) {
        nextErrors.accountNumber = 'Account number must be at least 8 characters.';
      }

      const ifsc = draft.bank.ifsc.trim().toUpperCase();
      if (!/^[A-Z]{4}0[A-Z0-9]{6}$/.test(ifsc)) {
        nextErrors.ifsc = 'Enter a valid IFSC (e.g. HDFC0123456).';
      }
    }

    if (step === 5 && !confirmSubmit) {
      nextErrors.confirmSubmit = 'Please confirm details before submitting.';
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleNext = async () => {
    if (!validateStep()) {
      return;
    }

    await saveDraft({
      ...draft,
      status: 'draft',
      cityId: draft.cityId || city?.city_id || '',
      updatedAt: new Date().toISOString(),
    });

    setStep((previous) => Math.min(previous + 1, TOTAL_STEPS));
  };

  const handleBack = () => {
    setStep((previous) => Math.max(previous - 1, 1));
  };

  const handleSubmit = async () => {
    if (!validateStep()) {
      return;
    }

    setIsSubmitting(true);

    const readyDraft: ShopRegistrationDraft = {
      ...draft,
      cityId: draft.cityId || city?.city_id || '',
      updatedAt: new Date().toISOString(),
    };

    await submitDraft(readyDraft);
    setIsSubmitting(false);
    navigation.navigate('SellerOnboardingSuccess', { registrationId: readyDraft.id });
  };

  const renderStepContent = () => {
    if (step === 1) {
      return (
        <View style={styles.stepWrap}>
          <AppInput
            label="Shop Name"
            value={draft.shopName}
            onChangeText={(value) => updateDraft('shopName', value)}
            placeholder="Enter your shop name"
            error={errors.shopName}
          />

          <AppInput
            label="Description (optional)"
            value={draft.description ?? ''}
            onChangeText={(value) => updateDraft('description', value)}
            placeholder="Short description"
            multiline
            numberOfLines={3}
            style={styles.multilineInput}
            textAlignVertical="top"
          />

          <View>
            <AppText style={styles.fieldLabel}>Primary Category</AppText>
            <Pressable style={styles.pickerButton} onPress={() => setIsCategoryPickerOpen(true)}>
              <AppText style={styles.pickerButtonText}>
                {draft.primaryCategoryId ? getCategoryLabel(draft.primaryCategoryId) : 'Select category'}
              </AppText>
            </Pressable>
            {errors.primaryCategoryId ? <AppText style={styles.errorText}>{errors.primaryCategoryId}</AppText> : null}
          </View>

          <View>
            <AppText style={styles.fieldLabel}>Secondary Categories (max 5)</AppText>
            <View style={styles.chipsWrap}>
              {MOCK_CATEGORIES.map((category) => (
                <Chip
                  key={category.id}
                  label={category.name}
                  variant={draft.secondaryCategoryIds.includes(category.id) ? 'selected' : 'default'}
                  onPress={() => setSecondaryCategory(category.id)}
                />
              ))}
            </View>
          </View>
        </View>
      );
    }

    if (step === 2) {
      return (
        <View style={styles.stepWrap}>
          <View style={styles.cityCard}>
            <AppText style={styles.cityLabel}>City</AppText>
            <AppText style={styles.cityValue}>{cityName}</AppText>
            <Pressable
              onPress={() => Alert.alert('Change City', 'City change flow is available from app entry.')}
            >
              <AppText style={styles.changeCityText}>Change City</AppText>
            </Pressable>
          </View>
          {errors.cityId ? <AppText style={styles.errorText}>{errors.cityId}</AppText> : null}

          <AppInput
            label="Address Line 1"
            value={draft.addressLine1}
            onChangeText={(value) => updateDraft('addressLine1', value)}
            placeholder="House / building / street"
            error={errors.addressLine1}
          />

          <AppInput
            label="Address Line 2 (optional)"
            value={draft.addressLine2 ?? ''}
            onChangeText={(value) => updateDraft('addressLine2', value)}
            placeholder="Apartment / floor"
          />

          <AppInput
            label="Area (optional)"
            value={draft.area ?? ''}
            onChangeText={(value) => updateDraft('area', value)}
            placeholder="Area or locality"
          />

          <AppInput
            label="Landmark (optional)"
            value={draft.landmark ?? ''}
            onChangeText={(value) => updateDraft('landmark', value)}
            placeholder="Nearby landmark"
          />

          <AppInput
            label="Pincode"
            value={draft.pincode}
            onChangeText={(value) => updateDraft('pincode', value.replace(/[^\d]/g, ''))}
            keyboardType="number-pad"
            maxLength={6}
            placeholder="6 digit pincode"
            error={errors.pincode}
          />

          <View style={styles.rowTwoCol}>
            <View style={styles.colHalf}>
              <AppInput
                label="Latitude (optional)"
                value={typeof draft.latitude === 'number' ? String(draft.latitude) : ''}
                onChangeText={(value) =>
                  updateDraft('latitude', value.trim() ? Number(value) : undefined)
                }
                keyboardType="decimal-pad"
                placeholder="e.g. 26.2183"
              />
            </View>
            <View style={styles.colHalf}>
              <AppInput
                label="Longitude (optional)"
                value={typeof draft.longitude === 'number' ? String(draft.longitude) : ''}
                onChangeText={(value) =>
                  updateDraft('longitude', value.trim() ? Number(value) : undefined)
                }
                keyboardType="decimal-pad"
                placeholder="e.g. 78.1828"
              />
            </View>
          </View>

          <AppButton
            title="Use current location (Coming soon)"
            variant="secondary"
            onPress={() => Alert.alert('Coming soon', 'Current location support will be added soon.')}
          />
        </View>
      );
    }

    if (step === 3) {
      return (
        <View style={styles.stepWrap}>
          <View style={styles.docCard}>
            <AppText style={styles.docTitle}>Business Proof</AppText>
            <AppText style={styles.docValue}>{draft.documents.businessProofUri ?? 'Not uploaded'}</AppText>
            <AppButton
              title="Upload"
              variant="secondary"
              onPress={() =>
                updateDraft('documents', {
                  ...draft.documents,
                  businessProofUri: 'mock://business-proof',
                })
              }
            />
          </View>

          <View style={styles.docCard}>
            <AppText style={styles.docTitle}>Identity Proof</AppText>
            <AppText style={styles.docValue}>{draft.documents.identityProofUri ?? 'Not uploaded'}</AppText>
            <AppButton
              title="Upload"
              variant="secondary"
              onPress={() =>
                updateDraft('documents', {
                  ...draft.documents,
                  identityProofUri: 'mock://identity-proof',
                })
              }
            />
          </View>

          <AppInput
            label="GST Number (optional)"
            value={draft.documents.gstNumber ?? ''}
            onChangeText={(value) =>
              updateDraft('documents', {
                ...draft.documents,
                gstNumber: value.toUpperCase(),
              })
            }
            placeholder="Enter GST number"
            autoCapitalize="characters"
          />
        </View>
      );
    }

    if (step === 4) {
      return (
        <View style={styles.stepWrap}>
          <AppInput
            label="Account Holder Name"
            value={draft.bank.accountHolderName}
            onChangeText={(value) =>
              updateDraft('bank', {
                ...draft.bank,
                accountHolderName: value,
              })
            }
            placeholder="Enter account holder name"
            error={errors.accountHolderName}
          />

          <AppInput
            label="Account Number"
            value={draft.bank.accountNumber}
            onChangeText={(value) =>
              updateDraft('bank', {
                ...draft.bank,
                accountNumber: value.replace(/[^\d]/g, ''),
              })
            }
            keyboardType="number-pad"
            placeholder="Enter account number"
            error={errors.accountNumber}
          />

          <AppInput
            label="IFSC"
            value={draft.bank.ifsc}
            onChangeText={(value) =>
              updateDraft('bank', {
                ...draft.bank,
                ifsc: value.toUpperCase(),
              })
            }
            autoCapitalize="characters"
            placeholder="e.g. HDFC0123456"
            error={errors.ifsc}
          />

          <AppText style={styles.helperText}>Bank details are stored locally for demo.</AppText>
        </View>
      );
    }

    return (
      <View style={styles.stepWrap}>
        <View style={styles.reviewCard}>
          <AppText style={styles.reviewTitle}>Basic Details</AppText>
          <AppText style={styles.reviewLine}>Shop: {draft.shopName || '--'}</AppText>
          <AppText style={styles.reviewLine}>
            Primary Category: {draft.primaryCategoryId ? getCategoryLabel(draft.primaryCategoryId) : '--'}
          </AppText>
          <AppText style={styles.reviewLine}>
            Secondary: {draft.secondaryCategoryIds.length > 0 ? draft.secondaryCategoryIds.map(getCategoryLabel).join(', ') : '--'}
          </AppText>

          <AppText style={styles.reviewTitle}>Address</AppText>
          <AppText style={styles.reviewLine}>{cityName}</AppText>
          <AppText style={styles.reviewLine}>{draft.addressLine1 || '--'}</AppText>
          <AppText style={styles.reviewLine}>Pincode: {draft.pincode || '--'}</AppText>

          <AppText style={styles.reviewTitle}>Documents</AppText>
          <AppText style={styles.reviewLine}>Business: {draft.documents.businessProofUri ?? '--'}</AppText>
          <AppText style={styles.reviewLine}>Identity: {draft.documents.identityProofUri ?? '--'}</AppText>
          <AppText style={styles.reviewLine}>GST: {draft.documents.gstNumber || '--'}</AppText>

          <AppText style={styles.reviewTitle}>Bank</AppText>
          <AppText style={styles.reviewLine}>Holder: {draft.bank.accountHolderName || '--'}</AppText>
          <AppText style={styles.reviewLine}>A/C: {draft.bank.accountNumber || '--'}</AppText>
          <AppText style={styles.reviewLine}>IFSC: {draft.bank.ifsc || '--'}</AppText>
        </View>

        <Pressable
          style={styles.confirmRow}
          onPress={() => {
            setConfirmSubmit((previous) => !previous);
            setErrors((previous) => ({ ...previous, confirmSubmit: undefined }));
          }}
        >
          <View style={[styles.checkbox, confirmSubmit ? styles.checkboxChecked : null]}>
            {confirmSubmit ? <AppText style={styles.checkmark}>✓</AppText> : null}
          </View>
          <AppText style={styles.confirmText}>I confirm details are correct</AppText>
        </Pressable>
        {errors.confirmSubmit ? <AppText style={styles.errorText}>{errors.confirmSubmit}</AppText> : null}

        <AppButton title="Submit Registration" loading={isSubmitting} onPress={handleSubmit} />
      </View>
    );
  };

  return (
    <Screen scroll>
      <AppHeader />
      <SectionHeader title="Seller Onboarding" />

      <View style={styles.progressRow}>
        <AppText style={styles.stepCountText}>Step {step} of {TOTAL_STEPS}</AppText>
        <View style={styles.progressTrack}>
          <View style={[styles.progressFill, { width: `${(step / TOTAL_STEPS) * 100}%` }]} />
        </View>
      </View>

      {renderStepContent()}

      <View style={styles.footerActions}>
        {step > 1 ? <AppButton title="Back" variant="secondary" onPress={handleBack} /> : null}
        {step < TOTAL_STEPS ? <AppButton title="Next" onPress={handleNext} /> : null}
      </View>

      <Modal visible={isCategoryPickerOpen} transparent animationType="slide" onRequestClose={() => setIsCategoryPickerOpen(false)}>
        <Pressable style={styles.modalBackdrop} onPress={() => setIsCategoryPickerOpen(false)}>
          <Pressable style={styles.modalSheet} onPress={(event) => event.stopPropagation()}>
            <AppText style={styles.modalTitle}>Select Primary Category</AppText>
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.modalListWrap}>
              {MOCK_CATEGORIES.map((category) => (
                <Pressable
                  key={category.id}
                  style={[
                    styles.categoryRow,
                    draft.primaryCategoryId === category.id ? styles.categoryRowSelected : null,
                  ]}
                  onPress={() => {
                    updateDraft('primaryCategoryId', category.id);
                    setIsCategoryPickerOpen(false);
                  }}
                >
                  <AppText
                    style={[
                      styles.categoryRowText,
                      draft.primaryCategoryId === category.id ? styles.categoryRowTextSelected : null,
                    ]}
                  >
                    {category.name}
                  </AppText>
                </Pressable>
              ))}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>
    </Screen>
  );
}

const styles = StyleSheet.create({
  progressRow: {
    marginTop: 8,
    marginBottom: 10,
    gap: 8,
  },
  stepCountText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#111827',
  },
  progressTrack: {
    height: 8,
    borderRadius: 999,
    backgroundColor: '#E5E7EB',
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#22A55D',
  },
  stepWrap: {
    marginTop: 4,
    gap: 12,
  },
  fieldLabel: {
    marginBottom: 6,
    fontSize: 14,
    color: '#374151',
    fontWeight: '600',
  },
  pickerButton: {
    minHeight: 48,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 12,
    justifyContent: 'center',
  },
  pickerButtonText: {
    fontSize: 14,
    color: '#111827',
    fontWeight: '600',
  },
  chipsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  cityCard: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    padding: 12,
    gap: 4,
  },
  cityLabel: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '600',
  },
  cityValue: {
    fontSize: 14,
    color: '#111827',
    fontWeight: '700',
  },
  changeCityText: {
    marginTop: 4,
    fontSize: 13,
    color: '#22A55D',
    fontWeight: '700',
  },
  rowTwoCol: {
    flexDirection: 'row',
    gap: 10,
  },
  colHalf: {
    flex: 1,
  },
  docCard: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    padding: 12,
    gap: 8,
  },
  docTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#111827',
  },
  docValue: {
    fontSize: 12,
    color: '#6B7280',
  },
  helperText: {
    marginTop: -4,
    fontSize: 12,
    color: '#6B7280',
  },
  reviewCard: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    padding: 12,
    gap: 6,
  },
  reviewTitle: {
    marginTop: 6,
    fontSize: 14,
    fontWeight: '700',
    color: '#111827',
  },
  reviewLine: {
    fontSize: 13,
    color: '#4B5563',
  },
  confirmRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
  },
  checkboxChecked: {
    borderColor: '#22A55D',
    backgroundColor: '#22A55D',
  },
  checkmark: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  confirmText: {
    fontSize: 14,
    color: '#111827',
    fontWeight: '600',
  },
  footerActions: {
    marginTop: 14,
    gap: 10,
    paddingBottom: 26,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: '#00000066',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 18,
    maxHeight: '70%',
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 10,
  },
  modalListWrap: {
    gap: 8,
    paddingBottom: 8,
  },
  categoryRow: {
    minHeight: 44,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 10,
    justifyContent: 'center',
    paddingHorizontal: 12,
    backgroundColor: '#FFFFFF',
  },
  categoryRowSelected: {
    borderColor: '#22A55D',
    backgroundColor: '#ECFDF3',
  },
  categoryRowText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
  },
  categoryRowTextSelected: {
    color: '#166534',
  },
  errorText: {
    marginTop: -6,
    fontSize: 12,
    color: '#DC2626',
  },
  multilineInput: {
    minHeight: 90,
    paddingTop: 12,
  },
});
