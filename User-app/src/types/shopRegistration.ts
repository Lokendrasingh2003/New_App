export type ShopRegistrationStatus = 'draft' | 'submitted';

export type ShopRegistrationDraft = {
  id: string;
  status: ShopRegistrationStatus;

  shopName: string;
  description?: string;
  primaryCategoryId: string;
  secondaryCategoryIds: string[];

  cityId: string;
  addressLine1: string;
  addressLine2?: string;
  landmark?: string;
  area?: string;
  pincode: string;
  latitude?: number;
  longitude?: number;

  documents: {
    businessProofUri?: string;
    identityProofUri?: string;
    gstNumber?: string;
  };

  bank: {
    accountHolderName: string;
    accountNumber: string;
    ifsc: string;
  };

  createdAt: string;
  updatedAt: string;
};
