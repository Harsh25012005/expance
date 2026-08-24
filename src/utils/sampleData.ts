import { ExpenseItem } from '../types/expense';

export const INITIAL_SAMPLE_EXPENSES: ExpenseItem[] = [
  {
    id: 'sample-1',
    remark: 'Starbucks Caramel Frappuccino & Cookie',
    amount: 450,
    category: 'food',
    date: new Date(Date.now() - 1000 * 60 * 35).toISOString(), // 35 mins ago
    timestamp: Date.now() - 1000 * 60 * 35,
    syncedToSheet: true,
    paymentMethod: 'UPI',
  },
  {
    id: 'sample-2',
    remark: 'Uber Premier to Client Office',
    amount: 320,
    category: 'transport',
    date: new Date(Date.now() - 1000 * 60 * 60 * 3).toISOString(), // 3 hours ago
    timestamp: Date.now() - 1000 * 60 * 60 * 3,
    syncedToSheet: true,
    paymentMethod: 'UPI',
  },
  {
    id: 'sample-3',
    remark: 'Nature Basket Organic Groceries & Milk',
    amount: 1250,
    category: 'groceries',
    date: new Date(Date.now() - 1000 * 60 * 60 * 22).toISOString(), // Yesterday
    timestamp: Date.now() - 1000 * 60 * 60 * 22,
    syncedToSheet: true,
    paymentMethod: 'Card',
  },
  {
    id: 'sample-4',
    remark: 'High-speed Fiber Internet Bill',
    amount: 899,
    category: 'bills',
    date: new Date(Date.now() - 1000 * 60 * 60 * 48).toISOString(), // 2 days ago
    timestamp: Date.now() - 1000 * 60 * 60 * 48,
    syncedToSheet: false,
    paymentMethod: 'Online',
  },
  {
    id: 'sample-5',
    remark: 'Nike Air Max Running Shoes',
    amount: 4299,
    category: 'shopping',
    date: new Date(Date.now() - 1000 * 60 * 60 * 96).toISOString(), // 4 days ago
    timestamp: Date.now() - 1000 * 60 * 60 * 96,
    syncedToSheet: true,
    paymentMethod: 'Card',
  },
  {
    id: 'sample-6',
    remark: 'IMAX Cinema Tickets - Interstellar Re-release',
    amount: 750,
    category: 'entertainment',
    date: new Date(Date.now() - 1000 * 60 * 60 * 140).toISOString(),
    timestamp: Date.now() - 1000 * 60 * 60 * 140,
    syncedToSheet: true,
    paymentMethod: 'UPI',
  },
];
