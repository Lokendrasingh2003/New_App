import { useCallback, useEffect, useRef, useState } from 'react'
import {
  getShopSettings,
  updateBusinessHours,
  updateDeliveryConfig,
  updateShopSettings,
  type ShopSettings,
  type ShopSettingsUpdateInput,
} from '../../services/shopService'
import { getShopkeeperShopId } from '../auth/authStore'
import { useShopkeeperStore } from '../store/ShopkeeperStore'

const buildFallbackSettings = (shop: ReturnType<typeof useShopkeeperStore>['shop']): ShopSettings => ({
  id: shop.id,
  shopName: shop.shopName,
  imageUrl: shop.imageUrl,
  categoryId: shop.categoryId,
  categoryName: shop.categoryName,
  ownerName: shop.ownerName,
  phone: shop.phone,
  city: shop.city,
  addressLine1: shop.addressLine1,
  area: shop.area,
  pincode: shop.pincode,
  slug: shop.slug,
  publicUrl: shop.publicUrl,
  delivery: {
    payer: shop.delivery.payer,
    chargeAmount: shop.delivery.chargeAmount,
    serviceRadiusKm: shop.delivery.serviceRadiusKm,
  },
  businessHours: {
    open: shop.businessHours.open,
    close: shop.businessHours.close,
  },
  updatedAt: shop.updatedAt,
})

export const useShopkeeper = () => {
  const { shop, updateShopSettings: updateStoreShopSettings } = useShopkeeperStore()
  const [shopSettings, setShopSettings] = useState<ShopSettings>(buildFallbackSettings(shop))
  const [isLoadingShop, setIsLoadingShop] = useState(true)
  const [isSavingShop, setIsSavingShop] = useState(false)
  const [shopError, setShopError] = useState('')
  const updateStoreShopSettingsRef = useRef(updateStoreShopSettings)

  const shopId = getShopkeeperShopId() || shop.id

  useEffect(() => {
    updateStoreShopSettingsRef.current = updateStoreShopSettings
  }, [updateStoreShopSettings])

  const syncStoreFromSettings = useCallback(
    (settings: ShopSettings) => {
      updateStoreShopSettingsRef.current({
        shopName: settings.shopName,
        imageUrl: settings.imageUrl,
        categoryId: settings.categoryId,
        categoryName: settings.categoryName,
        ownerName: settings.ownerName,
        phone: settings.phone,
        city: settings.city,
        addressLine1: settings.addressLine1,
        area: settings.area,
        pincode: settings.pincode,
        slug: settings.slug,
        publicUrl: settings.publicUrl,
        delivery: settings.delivery,
        businessHours: {
          open: settings.businessHours.open,
          close: settings.businessHours.close,
        },
      }, { syncRemote: false })
    },
    []
  )

  const loadShopData = useCallback(async () => {
    if (!shopId) {
      setShopError('Shop not found for current session.')
      setIsLoadingShop(false)
      return
    }

    try {
      setShopError('')
      setIsLoadingShop(true)
      const settings = await getShopSettings(shopId)
      setShopSettings(settings)
      syncStoreFromSettings(settings)
    } catch (error) {
      setShopError(error instanceof Error ? error.message : 'Unable to load shop settings.')
    } finally {
      setIsLoadingShop(false)
    }
  }, [shopId, syncStoreFromSettings])

  const saveShopSettings = useCallback(
    async (payload: ShopSettingsUpdateInput) => {
      if (!shopId) {
        throw new Error('Shop ID is missing.')
      }

      setIsSavingShop(true)
      setShopError('')
      try {
        const settings = await updateShopSettings(shopId, payload)
        setShopSettings(settings)
        syncStoreFromSettings(settings)
        return settings
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unable to update shop settings.'
        setShopError(message)
        throw error
      } finally {
        setIsSavingShop(false)
      }
    },
    [shopId, syncStoreFromSettings]
  )

  const saveBusinessHours = useCallback(
    async (payload: { open: string; close: string; closedDays?: string[] }) => {
      if (!shopId) {
        throw new Error('Shop ID is missing.')
      }

      setIsSavingShop(true)
      setShopError('')
      try {
        const settings = await updateBusinessHours(shopId, payload)
        setShopSettings(settings)
        syncStoreFromSettings(settings)
        return settings
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unable to update business hours.'
        setShopError(message)
        throw error
      } finally {
        setIsSavingShop(false)
      }
    },
    [shopId, syncStoreFromSettings]
  )

  const saveDeliveryConfig = useCallback(
    async (payload: { payer: 'CUSTOMER' | 'SHOP'; chargeAmount: number; serviceRadiusKm: number }) => {
      if (!shopId) {
        throw new Error('Shop ID is missing.')
      }

      setIsSavingShop(true)
      setShopError('')
      try {
        const settings = await updateDeliveryConfig(shopId, payload)
        setShopSettings(settings)
        syncStoreFromSettings(settings)
        return settings
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unable to update delivery settings.'
        setShopError(message)
        throw error
      } finally {
        setIsSavingShop(false)
      }
    },
    [shopId, syncStoreFromSettings]
  )

  useEffect(() => {
    void loadShopData()
  }, [loadShopData])

  return {
    shopId,
    shopSettings,
    isLoadingShop,
    isSavingShop,
    shopError,
    loadShopData,
    saveShopSettings,
    saveBusinessHours,
    saveDeliveryConfig,
  }
}
