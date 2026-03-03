const toRadians = (value) => (value * Math.PI) / 180;

const haversineDistanceKm = (lat1, lng1, lat2, lng2) => {
  const earthRadiusKm = 6371;

  const dLat = toRadians(lat2 - lat1);
  const dLng = toRadians(lng2 - lng1);

  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) * Math.sin(dLng / 2) ** 2;

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return earthRadiusKm * c;
};

const parseTimeToMinutes = (value) => {
  if (!value || typeof value !== 'string') {
    return null;
  }

  const [hours, minutes] = value.split(':').map(Number);

  if (!Number.isInteger(hours) || !Number.isInteger(minutes)) {
    return null;
  }

  return hours * 60 + minutes;
};

const isOpenNow = (businessHours, now = new Date()) => {
  if (!businessHours?.open || !businessHours?.close) {
    return false;
  }

  const closedDays = Array.isArray(businessHours.closedDays) ? businessHours.closedDays : [];
  const dayName = now.toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();

  if (closedDays.map((item) => String(item).toLowerCase()).includes(dayName)) {
    return false;
  }

  const openMinutes = parseTimeToMinutes(businessHours.open);
  const closeMinutes = parseTimeToMinutes(businessHours.close);

  if (openMinutes === null || closeMinutes === null) {
    return false;
  }

  const nowMinutes = now.getHours() * 60 + now.getMinutes();

  if (closeMinutes >= openMinutes) {
    return nowMinutes >= openMinutes && nowMinutes <= closeMinutes;
  }

  return nowMinutes >= openMinutes || nowMinutes <= closeMinutes;
};

const toDiscoveryShopResponse = (shop, distance) => {
  return {
    id: shop._id,
    shopName: shop.shopName,
    slug: shop.slug,
    category: shop.category,
    area: shop.area,
    rating: shop.stats?.rating || 0,
    reviewCount: shop.stats?.reviewCount || 0,
    imageUrl: shop.imageUrl || null,
    distance: typeof distance === 'number' ? Number(distance.toFixed(2)) : undefined,
    isOpen: isOpenNow(shop.businessHours),
    deliveryCharge: shop.delivery?.chargeAmount || 0,
  };
};

module.exports = {
  haversineDistanceKm,
  isOpenNow,
  toDiscoveryShopResponse,
};
