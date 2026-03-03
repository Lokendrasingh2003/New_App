import type { Order } from '../types/order'

const indianNames = [
  'Rajesh Kumar',
  'Priya Sharma',
  'Amit Singh',
  'Neha Patel',
  'Vikram Nair',
  'Anjali Gupta',
  'Arjun Verma',
  'Deepika Reddy',
  'Sanjay Yadav',
  'Isha Chopra',
  'Rohan Agarwal',
  'Pooja Malhotra',
  'Karan Bhat',
  'Divya Iyer',
  'Mohit Joshi',
]

const getRandomName = () => indianNames[Math.floor(Math.random() * indianNames.length)]

const getRandomPhone = () => {
  const prefix = Math.random() > 0.5 ? '9' : '8'
  const remaining = Math.floor(Math.random() * 1000000000)
    .toString()
    .padStart(9, '0')
  return `+91${prefix}${remaining}`
}

const getRandomTotal = () => {
  const basePrice = Math.floor(Math.random() * 3000) + 200
  return basePrice
}

const getRandomItemsCount = () => Math.floor(Math.random() * 8) + 1

const statuses = ['NEW', 'ACCEPTED', 'PREPARING', 'READY', 'DISPATCHED', 'DELIVERED', 'CANCELLED'] as const

const getRandomStatus = () => statuses[Math.floor(Math.random() * statuses.length)]

const paymentModes = ['COD', 'ONLINE'] as const

const getRandomPaymentMode = () => paymentModes[Math.floor(Math.random() * paymentModes.length)]

const generateMockOrders = (count: number): Order[] => {
  const orders: Order[] = []
  const now = new Date()

  for (let i = 0; i < count; i++) {
    // Generate dates within the last 7 days for realism
    const daysAgo = Math.floor(Math.random() * 7)
    const hoursAgo = Math.floor(Math.random() * 24)
    const minutesAgo = Math.floor(Math.random() * 60)

    const createdDate = new Date(now)
    createdDate.setDate(createdDate.getDate() - daysAgo)
    createdDate.setHours(createdDate.getHours() - hoursAgo)
    createdDate.setMinutes(createdDate.getMinutes() - minutesAgo)

    orders.push({
      id: `ORD-${1000000 + i}`,
      shortId: `#${9000 + i}`,
      customerName: getRandomName(),
      customerPhone: getRandomPhone(),
      total: getRandomTotal(),
      paymentMode: getRandomPaymentMode(),
      status: getRandomStatus(),
      createdAt: createdDate.toISOString(),
      itemsCount: getRandomItemsCount(),
    })
  }

  // Sort by createdAt descending (most recent first)
  return orders.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
}

export const mockOrders = generateMockOrders(20)
