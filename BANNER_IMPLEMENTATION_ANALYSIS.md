# Banner Implementation Analysis

## Current Banner Implementation

### 1. **Storage & Definition**

#### User-App (React Native)
- **Location**: `User-app/src/services/homeConfig/homeConfigService.ts`
- **Storage Method**: Currently hardcoded in-memory with placeholder images
- **Data Structure**: Part of `HomeConfigResponse` which contains blocks array
- **Banner Block Structure**:
  ```typescript
  {
    id: 'block-banner-1',
    type: 'banner_carousel',
    data: [
      { id: 'banner-1', imageUrl: 'https://picsum.photos/id/401/1200/420' },
      { id: 'banner-2', imageUrl: 'https://picsum.photos/id/402/1200/420' },
      { id: 'banner-3', imageUrl: 'https://picsum.photos/id/403/1200/420' },
    ],
  }
  ```

#### Types Definition
- **File**: `User-app/src/types/homeConfig.ts`
- **Type**: `BannerCarouselItem`
  ```typescript
  export type BannerCarouselItem = {
    id: string;
    imageUrl: string;
  };
  ```
- **Block Type**: `BannerCarouselBlock = HomeBlockBase<'banner_carousel', BannerCarouselItem[]>`

#### Static Assets
- **Location**: `User-app/assets/`
- **Files**: 
  - Amazon_Banner.png
  - youtube banner.avif
  - banner 3.jpg
- **Note**: Currently used in BannerCarousel component demo

---

### 2. **Frontend Display Implementation**

#### User-App Component
- **File**: `User-app/src/components/ui/BannerCarousel.tsx`
- **Features**:
  - Auto-rotating carousel (5-second interval)
  - Horizontal scrolling with pagination
  - Dot indicators showing active banner
  - Fully responsive width
  - Uses React Native FlatList for efficient rendering
- **Images**: Currently uses predefined static DEMO_BANNERS array
- **Styling**: Custom styles with borderRadius (14px), auto height (160px)

#### Home Config Service
- **File**: `User-app/src/services/homeConfig/homeConfigService.ts`
- **Method**: `getHomeConfig(options?: GetHomeConfigOptions)`
- **Current Flow**:
  1. Checks AsyncStorage cache first (STORAGE_KEYS.HOME_CONFIG_CACHE)
  2. If forceRefresh=true, fetches fresh data from API
  3. Currently returns hardcoded banner data
  4. Constructs home blocks dynamically based on categories, shops, and coupons

#### Storage Management
- **Cache Key**: `@user_app/home_config_cache` 
- **Location**: `User-app/src/constants/storage.ts`
- **Type**: Full `HomeConfigResponse` cached as JSON

---

### 3. **Backend Architecture & Patterns**

#### Configuration Management Pattern
- **Model**: `Backend/models/Config.js`
  - Schema fields: `key`, `value`, `category`, `description`, `lastModifiedBy`, `lastModifiedAt`
  - Categories: GENERAL, PAYMENT, COMMISSION, DELIVERY, SUBSCRIPTION, OTP, CART, REVIEW, ORDER, REFUND
  - Indexed by: category, key, lastModifiedAt

- **Controller**: `Backend/controllers/adminConfigController.js`
  - Key Methods:
    - `ensureDefaults()` - Initialize default configs
    - `listConfig()` - Get configs with optional category filter
    - `getConfigByKey()` - Fetch single config
    - `updateConfigByKey()` - Update config value
    - `resetConfigToDefault()` - Reset to default
  - Audit Logging: All changes logged via `logAudit()`

- **Routes**: `Backend/routes/adminConfigRoutes.js`
  - `/admin/config` endpoint
  - Requires: `verifySuperAdmin`, `requireAdmin` middleware
  - Methods: GET, PUT, POST (reset)

#### Example: Categories Controller Pattern
- **File**: `Backend/controllers/adminCategoriesController.js`
- **CRUD Operations**:
  - `createCategory()` - Create new category with validation
  - `listCategories()` - List with filters and pagination
  - `getCategoryById()` - Fetch single category
  - `updateCategory()` - Update category data
  - `deleteCategory()` - Soft delete
  - `toggleCategoryActive()` - Toggle active status
  - `publishCategory()` - Publish category
  - Subcategory operations (add, update, delete)
- **Validation**: Input validation via middleware
- **Error Handling**: ApiError wrapper with HTTP status codes
- **Audit Trail**: All operations logged

#### Routes Pattern (Categories)
- **File**: `Backend/routes/adminCategoriesRoutes.js`
- **Middleware**: `verifySuperAdmin`, `requireAdmin`
- **Validation Middleware**: Separate validators for each endpoint
- **Methods**:
  - POST `/` - Create
  - GET `/` - List
  - GET `/:id` - Get by ID
  - PUT `/:id` - Update
  - DELETE `/:id` - Delete
  - PATCH `/:id/toggle-active` - Toggle
  - POST `/:id/publish` - Publish
  - Nested routes for subcategories

---

### 4. **Frontend Admin Dashboard**

#### Admin Structure
- **Location**: `Frontend/src/superadmin-dashboard/`
- **Sub-folders**:
  - `pages/` - Admin page components (CategoriesPage, CouponsPage, ConfigPage, etc.)
  - `modules/` - Feature-specific modules (categories/, cities/)
  - `services/` - API service layer
  - `types/` - TypeScript types
  - `store/` - Zustand state management (SuperAdminStore)
  - `ui/` - Reusable UI components

#### State Management
- **File**: `Frontend/src/superadmin-dashboard/store/SuperAdminStore.tsx`
- **Pattern**: Zustand store with context
- **Storage Keys**: Separate keys for each entity (SA_CATEGORIES_KEY, SA_COUPONS_KEY, etc.)
- **Key Methods in Store**:
  - `syncCategories()` - Fetch from API
  - `addCategory()` - Add new
  - `updateCategory()` - Edit existing
  - `publishCategories()` - Publish changes
  - Similar patterns for all admin entities

#### Admin Pages Example
- **File**: `Frontend/src/superadmin-dashboard/pages/CategoriesPage.tsx`
- **Features**:
  - DataGrid table with sortable columns
  - Search and filter functionality
  - Add/Edit/Delete operations
  - Form dialog for CRUD
  - Status indicators (Active/Inactive)
  - Publish button for batch operations
  - CSV export functionality
  - Confirmation dialogs for destructive actions

---

### 5. **Current Limitations**

1. **Backend**:
   - No Banner model exists
   - No admin banner endpoints
   - Banners are hardcoded in `homeConfigService.ts`
   - No database persistence for banner data

2. **Frontend**:
   - Banners part of larger homeConfig (not independently manageable)
   - No admin UI for managing banners
   - Banner image URLs are static placeholders

3. **User-App**:
   - Static demo banners from local assets
   - No dynamic banner loading from server
   - Limited styling customization options

---

## Recommended Banner System Design

### Backend Implementation
```
Models/Banner.js
├── Fields:
│   ├── id (unique)
│   ├── title
│   ├── imageUrl
│   ├── linkUrl (optional)
│   ├── position (display order)
│   ├── isActive
│   ├── startDate
│   ├── endDate
│   ├── createdAt
│   └── lastModifiedAt

Controllers/adminBannerController.js
├── createBanner()
├── listBanners()
├── getBannerById()
├── updateBanner()
├── deleteBanner()
├── toggleBannerActive()
└── reorderBanners()

Routes/adminBannerRoutes.js
├── POST /admin/banners
├── GET /admin/banners
├── GET /admin/banners/:id
├── PUT /admin/banners/:id
├── DELETE /admin/banners/:id
├── PATCH /admin/banners/:id/toggle-active
└── PATCH /admin/banners/reorder

Public Routes/bannersRoutes.js
├── GET /banners (public read-only)
```

### Frontend Admin Dashboard
```
superadmin-dashboard/pages/BannersPage.tsx
├── List view with DataGrid
├── Add/Edit banner dialog
├── Drag-to-reorder functionality
├── Image upload integration
├── Date range selectors
└── Status toggle

superadmin-dashboard/modules/banners/
├── BannerFormDialog.tsx
├── BannerImageUpload.tsx
└── BannerReorderDialog.tsx

superadmin-dashboard/services/
└── adminBannersService.ts
   ├── createBanner()
   ├── updateBanner()
   ├── deleteBanner()
   ├── reorderBanners()
   └── listBanners()

superadmin-dashboard/store/
└── SuperAdminStore.tsx (add banner methods)
   ├── banners[]
   ├── syncBanners()
   ├── addBanner()
   ├── updateBanner()
   └── deleteBanner()
```

### User-App Updates
```
services/homeConfig/homeConfigService.ts
├── Fetch banners from /api/banners endpoint
├── Include in homeConfig blocks
└── Cache banner data

types/homeConfig.ts
├── Update BannerCarouselItem if needed
└── Ensure compatibility

components/ui/BannerCarousel.tsx
├── Support dynamic banner URLs
├── Add click handler for navigation
└── Improve loading states
```

---

## File References Summary

### Backend Files
| Purpose | File Location |
|---------|---------------|
| Config Model | `Backend/models/Config.js` |
| Admin Config Controller | `Backend/controllers/adminConfigController.js` |
| Admin Config Routes | `Backend/routes/adminConfigRoutes.js` |
| Admin Categories Controller | `Backend/controllers/adminCategoriesController.js` |
| Admin Categories Routes | `Backend/routes/adminCategoriesRoutes.js` |
| Routes Index | `Backend/routes/index.js` |

### Frontend Files
| Purpose | File Location |
|---------|---------------|
| Admin Dashboard Store | `Frontend/src/superadmin-dashboard/store/SuperAdminStore.tsx` |
| Categories Admin Page | `Frontend/src/superadmin-dashboard/pages/CategoriesPage.tsx` |
| Admin Pages | `Frontend/src/superadmin-dashboard/pages/` |
| Admin Modules | `Frontend/src/superadmin-dashboard/modules/` |

### User-App Files
| Purpose | File Location |
|---------|---------------|
| Banner Component | `User-app/src/components/ui/BannerCarousel.tsx` |
| Home Config Service | `User-app/src/services/homeConfig/homeConfigService.ts` |
| Home Config Types | `User-app/src/types/homeConfig.ts` |
| Storage Constants | `User-app/src/constants/storage.ts` |
| Banner Assets | `User-app/assets/` (Amazon_Banner.png, etc.) |

---

## Key Patterns to Follow

1. **Validation**: Use separate validation middleware functions
2. **Error Handling**: Use ApiError wrapper with proper HTTP status codes
3. **Audit Logging**: Log all admin actions with actor, metadata, before/after values
4. **Middleware Chain**: verifySuperAdmin → requireAdmin → validate → controller
5. **State Management**: Zustand store with persistence
6. **API Service Layer**: Separate service files for API calls
7. **UI Components**: Reusable components with clear props and separation of concerns
8. **Type Safety**: Strong TypeScript types for all data structures
9. **Form Dialogs**: Separate dialog components for add/edit operations
10. **Audit Events**: Define and use AUDIT_EVENT_TYPES constants

---

