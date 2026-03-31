import { NavigationProp, ParamListBase, useNavigation } from '@react-navigation/native';
import { useEffect, useMemo, useState } from 'react';
import { Alert, Image, Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import * as ImagePicker from 'expo-image-picker';

import { AppButton } from '../components/ui/AppButton';
import { AppHeader } from '../components/ui/AppHeader';
import { AppInput } from '../components/ui/AppInput';
import { AppText } from '../components/ui/AppText';
import { Screen } from '../components/ui/Screen';
import { SectionHeader } from '../components/ui/SectionHeader';
import { getCategories } from '../services/categories/categoryService';
import { getCities } from '../services/cities/cityService';
import {
  getDraft,
  saveDraft,
  submitDraft,
  uploadRegistrationAsset,
} from '../services/shopRegistration/shopRegistrationService';
import { getMyProfile } from '../services/users/userProfileService';
import { ShopRegistrationDraft } from '../types/shopRegistration';

const TOTAL_STEPS = 5;

type CategoryOption = { id: string; name: string };
type CityOption = { id: string; name: string };

const createInitialDraft = (cityId?: string, phone = ''): ShopRegistrationDraft => {
  const nowIso = new Date().toISOString();

  return {
    id: `shopreg_${Date.now()}_${Math.floor(Math.random() * 10000)}`,
    status: 'draft',
    shopName: '',
    description: '',
    categoryId: '',
    categoryName: '',
    phone,
    openingTime: '09:00',
    closingTime: '21:00',
    shopImageUrl: '',
    cityId: cityId ?? '',
    cityName: '',
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
  categoryId?: string;
  phone?: string;
  openingTime?: string;
  closingTime?: string;
  shopImageUrl?: string;
  addressLine1?: string;
  area?: string;
  pincode?: string;
  cityId?: string;
  businessProofUri?: string;
  identityProofUri?: string;
  gstNumber?: string;
  accountHolderName?: string;
  accountNumber?: string;
  ifsc?: string;
  confirmSubmit?: string;
};

export function SellerOnboardingScreen() {
  const navigation = useNavigation<NavigationProp<ParamListBase>>();

  const [step, setStep] = useState(1);
  const [draft, setDraft] = useState<ShopRegistrationDraft>(createInitialDraft());
  const [errors, setErrors] = useState<FormErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCategoryPickerOpen, setIsCategoryPickerOpen] = useState(false);
  const [isCityPickerOpen, setIsCityPickerOpen] = useState(false);
  const [categories, setCategories] = useState<CategoryOption[]>([]);
  const [cities, setCities] = useState<CityOption[]>([]);
  const [confirmSubmit, setConfirmSubmit] = useState(false);
  const [uploadingField, setUploadingField] = useState<'shopImage' | 'businessProof' | 'identityProof' | null>(null);

  useEffect(() => {
    const hydrate = async () => {
      const [existingDraft, profile, categoryList, cityList] = await Promise.all([
        getDraft(),
        getMyProfile(),
        getCategories().catch(() => []),
        getCities().catch(() => []),
      ]);

      setCategories(categoryList.map((item) => ({ id: item._id, name: item.name })));
      setCities(cityList.map((item) => ({ id: item._id, name: item.name })));

      if (existingDraft) {
        setDraft({
          ...existingDraft,
          phone: existingDraft.phone || profile?.phone || '',
          cityId: existingDraft.cityId || cityList[0]?._id || '',
        });
        return;
      }

      setDraft(createInitialDraft(cityList[0]?._id, profile?.phone || ''));
    };

    hydrate();
  }, []);

  const cityName = useMemo(
    () => cities.find((item) => item.id === draft.cityId)?.name || 'Not selected',
    [cities, draft.cityId],
  );

  const categoryName = useMemo(
    () => categories.find((item) => item.id === draft.categoryId)?.name || 'Select category',
    [categories, draft.categoryId],
  );

  const updateDraft = <K extends keyof ShopRegistrationDraft>(key: K, value: ShopRegistrationDraft[K]) => {
    setDraft((previous) => ({
      ...previous,
      [key]: value,
      updatedAt: new Date().toISOString(),
    }));
    setErrors((previous) => ({ ...previous, [key]: undefined }));
  };

  const validateStep = () => {
    const nextErrors: FormErrors = {};

    if (step === 1) {
      if (!draft.shopName.trim()) {
        nextErrors.shopName = 'Shop name is required.';
      }

      if (!draft.categoryId) {
        nextErrors.categoryId = 'Please choose a category.';
      }

      if (!/^\d{10}$/.test(draft.phone.trim())) {
        nextErrors.phone = 'Valid phone is required.';
      }

      if (!/^([01]\d|2[0-3]):([0-5]\d)$/.test(draft.openingTime.trim())) {
        nextErrors.openingTime = 'Opening time must be HH:MM.';
      }

      if (!/^([01]\d|2[0-3]):([0-5]\d)$/.test(draft.closingTime.trim())) {
        nextErrors.closingTime = 'Closing time must be HH:MM.';
      }

      if (!draft.shopImageUrl.trim()) {
        nextErrors.shopImageUrl = 'Shop image URL is required.';
      }
    }

    if (step === 2) {
      if (!draft.cityId) {
        nextErrors.cityId = 'City is required.';
      }

      if (!draft.addressLine1.trim()) {
        nextErrors.addressLine1 = 'Address line 1 is required.';
      }

      if (!draft.area?.trim()) {
        nextErrors.area = 'Area is required.';
      }

      if (!/^\d{6}$/.test(draft.pincode.trim())) {
        nextErrors.pincode = 'Pincode must be 6 digits.';
      }
    }

    if (step === 3) {
      if (!draft.documents.businessProofUri?.trim()) {
        nextErrors.businessProofUri = 'Business proof is required.';
      }

      if (!draft.documents.identityProofUri?.trim()) {
        nextErrors.identityProofUri = 'Identity proof is required.';
      }

      if (!draft.documents.gstNumber?.trim()) {
        nextErrors.gstNumber = 'GST number is required.';
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

    try {
      const readyDraft: ShopRegistrationDraft = {
        ...draft,
        updatedAt: new Date().toISOString(),
      };

      const registrationId = await submitDraft(readyDraft);
      setIsSubmitting(false);
      navigation.navigate('SellerOnboardingSuccess', { registrationId });
    } catch (error) {
      setIsSubmitting(false);
      Alert.alert('Unable to submit registration', error instanceof Error ? error.message : 'Please try again.');
    }
  };

  const pickAndUploadAsset = async (field: 'shopImage' | 'businessProof' | 'identityProof') => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Permission required', 'Please allow gallery access to upload images.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      quality: 0.8,
    });

    if (result.canceled || !result.assets?.length) {
      return;
    }

    const selected = result.assets[0];
    const assetType =
      field === 'shopImage'
        ? 'SHOP_IMAGE'
        : field === 'businessProof'
          ? 'BUSINESS_PROOF'
          : 'IDENTITY_PROOF';

    try {
      setUploadingField(field);
      const uploadedUrl = await uploadRegistrationAsset({
        assetType,
        uri: selected.uri,
        fileName: selected.fileName,
      });

      if (field === 'shopImage') {
        updateDraft('shopImageUrl', uploadedUrl);
      }

      if (field === 'businessProof') {
        updateDraft('documents', {
          ...draft.documents,
          businessProofUri: uploadedUrl,
        });
      }

      if (field === 'identityProof') {
        updateDraft('documents', {
          ...draft.documents,
          identityProofUri: uploadedUrl,
        });
      }
    } catch (error) {
      Alert.alert('Upload failed', error instanceof Error ? error.message : 'Please try again.');
    } finally {
      setUploadingField(null);
    }
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
            <AppText style={styles.fieldLabel}>Category</AppText>
            <Pressable style={styles.pickerButton} onPress={() => setIsCategoryPickerOpen(true)}>
              <AppText style={styles.pickerButtonText}>
                {categoryName}
              </AppText>
            </Pressable>
            {errors.categoryId ? <AppText style={styles.errorText}>{errors.categoryId}</AppText> : null}
          </View>

          <AppInput
            label="Phone Number"
            value={draft.phone}
            onChangeText={(value) => updateDraft('phone', value.replace(/[^\d]/g, '').slice(0, 10))}
            keyboardType="number-pad"
            maxLength={10}
            error={errors.phone}
          />

          <View style={styles.rowTwoCol}>
            <View style={styles.colHalf}>
              <AppInput
                label="Opening Time"
                value={draft.openingTime}
                onChangeText={(value) => updateDraft('openingTime', value)}
                placeholder="09:00"
                error={errors.openingTime}
              />
            </View>
            <View style={styles.colHalf}>
              <AppInput
                label="Closing Time"
                value={draft.closingTime}
                onChangeText={(value) => updateDraft('closingTime', value)}
                placeholder="21:00"
                error={errors.closingTime}
              />
            </View>
          </View>

          <View style={styles.docCard}>
            <AppText style={styles.docTitle}>Shop Image</AppText>
            {draft.shopImageUrl ? (
              <Image source={{ uri: draft.shopImageUrl }} style={styles.previewImage} resizeMode="cover" />
            ) : (
              <View style={styles.placeholderPreview}>
                <AppText style={styles.placeholderPreviewText}>No image uploaded yet</AppText>
              </View>
            )}

            <AppButton
              title={uploadingField === 'shopImage' ? 'Uploading...' : draft.shopImageUrl ? 'Change Image' : 'Upload from Gallery'}
              onPress={() => {
                void pickAndUploadAsset('shopImage');
              }}
              loading={uploadingField === 'shopImage'}
            />
            {errors.shopImageUrl ? <AppText style={styles.errorText}>{errors.shopImageUrl}</AppText> : null}
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
            <Pressable onPress={() => setIsCityPickerOpen(true)}>
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
            label="Area"
            value={draft.area ?? ''}
            onChangeText={(value) => updateDraft('area', value)}
            placeholder="Area or locality"
            error={errors.area}
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

        </View>
      );
    }

    if (step === 3) {
      return (
        <View style={styles.stepWrap}>
          <View style={styles.docCard}>
            <AppText style={styles.docTitle}>Business Proof</AppText>
            {draft.documents.businessProofUri ? (
              <Image source={{ uri: draft.documents.businessProofUri }} style={styles.previewImage} resizeMode="cover" />
            ) : (
              <View style={styles.placeholderPreview}>
                <AppText style={styles.placeholderPreviewText}>No proof uploaded yet</AppText>
              </View>
            )}
            <AppButton
              title={
                uploadingField === 'businessProof'
                  ? 'Uploading...'
                  : draft.documents.businessProofUri
                    ? 'Change Proof'
                    : 'Upload from Gallery'
              }
              onPress={() => {
                void pickAndUploadAsset('businessProof');
              }}
              loading={uploadingField === 'businessProof'}
            />
            {errors.businessProofUri ? <AppText style={styles.errorText}>{errors.businessProofUri}</AppText> : null}
          </View>

          <View style={styles.docCard}>
            <AppText style={styles.docTitle}>Identity Proof</AppText>
            {draft.documents.identityProofUri ? (
              <Image source={{ uri: draft.documents.identityProofUri }} style={styles.previewImage} resizeMode="cover" />
            ) : (
              <View style={styles.placeholderPreview}>
                <AppText style={styles.placeholderPreviewText}>No proof uploaded yet</AppText>
              </View>
            )}
            <AppButton
              title={
                uploadingField === 'identityProof'
                  ? 'Uploading...'
                  : draft.documents.identityProofUri
                    ? 'Change Proof'
                    : 'Upload from Gallery'
              }
              onPress={() => {
                void pickAndUploadAsset('identityProof');
              }}
              loading={uploadingField === 'identityProof'}
            />
            {errors.identityProofUri ? <AppText style={styles.errorText}>{errors.identityProofUri}</AppText> : null}
          </View>

          <AppInput
            label="GST Number"
            value={draft.documents.gstNumber ?? ''}
            onChangeText={(value) =>
              updateDraft('documents', {
                ...draft.documents,
                gstNumber: value.toUpperCase(),
              })
            }
            placeholder="Enter GST number"
            autoCapitalize="characters"
            error={errors.gstNumber}
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

        </View>
      );
    }

    return (
      <View style={styles.stepWrap}>
        <View style={styles.reviewCard}>
          <AppText style={styles.reviewTitle}>Basic Details</AppText>
          <AppText style={styles.reviewLine}>Shop: {draft.shopName || '--'}</AppText>
          <AppText style={styles.reviewLine}>Phone: {draft.phone || '--'}</AppText>
          <AppText style={styles.reviewLine}>Open: {draft.openingTime || '--'}</AppText>
          <AppText style={styles.reviewLine}>Close: {draft.closingTime || '--'}</AppText>
          <AppText style={styles.reviewLine}>Image: {draft.shopImageUrl || '--'}</AppText>
          {draft.shopImageUrl ? <Image source={{ uri: draft.shopImageUrl }} style={styles.reviewImage} resizeMode="cover" /> : null}
          <AppText style={styles.reviewLine}>
            Category: {categoryName || '--'}
          </AppText>

          <AppText style={styles.reviewTitle}>Address</AppText>
          <AppText style={styles.reviewLine}>{cityName}</AppText>
          <AppText style={styles.reviewLine}>{draft.addressLine1 || '--'}</AppText>
          <AppText style={styles.reviewLine}>Pincode: {draft.pincode || '--'}</AppText>

          <AppText style={styles.reviewTitle}>Documents</AppText>
          <AppText style={styles.reviewLine}>Business: {draft.documents.businessProofUri ?? '--'}</AppText>
          <AppText style={styles.reviewLine}>Identity: {draft.documents.identityProofUri ?? '--'}</AppText>
          {draft.documents.businessProofUri ? (
            <Image source={{ uri: draft.documents.businessProofUri }} style={styles.reviewImage} resizeMode="cover" />
          ) : null}
          {draft.documents.identityProofUri ? (
            <Image source={{ uri: draft.documents.identityProofUri }} style={styles.reviewImage} resizeMode="cover" />
          ) : null}
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
            <AppText style={styles.modalTitle}>Select Category</AppText>
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.modalListWrap}>
              {categories.map((category) => (
                <Pressable
                  key={category.id}
                  style={[
                    styles.categoryRow,
                    draft.categoryId === category.id ? styles.categoryRowSelected : null,
                  ]}
                  onPress={() => {
                    updateDraft('categoryId', category.id);
                    setIsCategoryPickerOpen(false);
                  }}
                >
                  <AppText
                    style={[
                      styles.categoryRowText,
                      draft.categoryId === category.id ? styles.categoryRowTextSelected : null,
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

      <Modal visible={isCityPickerOpen} transparent animationType="slide" onRequestClose={() => setIsCityPickerOpen(false)}>
        <Pressable style={styles.modalBackdrop} onPress={() => setIsCityPickerOpen(false)}>
          <Pressable style={styles.modalSheet} onPress={(event) => event.stopPropagation()}>
            <AppText style={styles.modalTitle}>Select City</AppText>
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.modalListWrap}>
              {cities.map((item) => (
                <Pressable
                  key={item.id}
                  style={[
                    styles.categoryRow,
                    draft.cityId === item.id ? styles.categoryRowSelected : null,
                  ]}
                  onPress={() => {
                    updateDraft('cityId', item.id);
                    setIsCityPickerOpen(false);
                  }}
                >
                  <AppText
                    style={[
                      styles.categoryRowText,
                      draft.cityId === item.id ? styles.categoryRowTextSelected : null,
                    ]}
                  >
                    {item.name}
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
  previewImage: {
    width: '100%',
    height: 170,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    backgroundColor: '#F9FAFB',
  },
  placeholderPreview: {
    width: '100%',
    height: 110,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    backgroundColor: '#F9FAFB',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
  },
  placeholderPreviewText: {
    fontSize: 13,
    color: '#6B7280',
    fontWeight: '600',
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
  reviewImage: {
    width: '100%',
    height: 150,
    borderRadius: 10,
    marginTop: 4,
    borderWidth: 1,
    borderColor: '#E5E7EB',
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
