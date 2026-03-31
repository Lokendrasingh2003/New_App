export type ShopRegistrationStatus = 'draft' | 'submitted' | 'PENDING' | 'APPROVED' | 'REJECTED' | 'SUSPENDED';

export type ShopRegistrationDraft = {
  id: string;
  status: ShopRegistrationStatus;

  shopName: string;
  description?: string;
  categoryId: string;
  categoryName?: string;

  phone: string;
  openingTime: string;
  closingTime: string;
  shopImageUrl: string;

  cityId: string;
  cityName?: string;
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
    gstNumber: string;
  };

  bank: {
    accountHolderName: string;
    accountNumber: string;
    ifsc: string;
  };

  rejectionReason?: string | null;
  reviewedAt?: string | null;

  createdAt: string;
  updatedAt: string;
};
