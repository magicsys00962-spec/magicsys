import { create } from 'zustand';
import type { CartItem, Product, Customer, InvoiceStatus } from '../types';

interface CartState {
  items: CartItem[];
  customer: Customer | null;
  invoiceType: InvoiceStatus;
  creditDays: number;
  notes: string;
  appliedPriceType: 'retail' | 'wholesale' | 'craftsman';

  addItem: (product: Product, quantity: number, userType?: 'CRAFTSMAN' | 'WALK_IN' | 'COMPANY') => void;
  updateQuantity: (productId: string, quantity: number, userType?: 'CRAFTSMAN' | 'WALK_IN' | 'COMPANY') => void;
  updateDiscount: (productId: string, discount: number, note: string) => void;
  removeItem: (productId: string) => void;
  setCustomer: (customer: Customer | null) => void;
  setInvoiceType: (type: InvoiceStatus) => void;
  setCreditDays: (days: number) => void;
  setNotes: (notes: string) => void;
  calculatePrice: (product: Product, quantity: number, userType?: 'CRAFTSMAN' | 'WALK_IN' | 'COMPANY') => { price: number; type: 'retail' | 'wholesale' | 'craftsman' };
  getTotals: () => { subtotal: number; discountTotal: number; netTotal: number };
  clearCart: () => void;
}

const determinePriceType = (
  product: Product,
  _quantity: number,
  userType?: 'CRAFTSMAN' | 'WALK_IN' | 'COMPANY'
): { price: number; type: 'retail' | 'wholesale' | 'craftsman' } => {
  // Craftsman gets craftsman price only if explicitly a craftsman customer
  if (userType === 'CRAFTSMAN' && product.craftsman_price) {
    return { price: product.craftsman_price, type: 'craftsman' };
  }
  // Default to retail for everyone else
  return { price: product.retail_price, type: 'retail' };
};

export const useCartStore = create<CartState>((set, get) => ({
  items: [],
  customer: null,
  invoiceType: 'PAID',
  creditDays: 30,
  notes: '',
  appliedPriceType: 'retail',

  calculatePrice: (product, quantity, userType) => {
    return determinePriceType(product, quantity, userType);
  },

  addItem: (product, quantity, userType) => {
    set((state) => {
      const existingIndex = state.items.findIndex((item) => item.product.id === product.id);

      if (existingIndex >= 0) {
        // Update existing item
        const updatedItems = [...state.items];
        const existingItem = updatedItems[existingIndex];
        const newQuantity = existingItem.quantity + quantity;
        const { price, type } = determinePriceType(product, newQuantity, userType);

        // Validate minimum price
        const finalPrice = Math.max(price, product.minimum_price);

        updatedItems[existingIndex] = {
          ...existingItem,
          quantity: newQuantity,
          applied_price: finalPrice,
          price_type: type,
        };

        return {
          items: updatedItems,
          appliedPriceType: type,
        };
      }

      // Add new item
      const { price, type } = determinePriceType(product, quantity, userType);
      const finalPrice = Math.max(price, product.minimum_price);

      const newItem: CartItem = {
        product,
        quantity,
        discount: 0,
        discount_note: '',
        applied_price: finalPrice,
        price_type: type,
      };

      return {
        items: [...state.items, newItem],
        appliedPriceType: type,
      };
    });
  },

  updateQuantity: (productId, quantity, userType) => {
    set((state) => {
      const itemIndex = state.items.findIndex((item) => item.product.id === productId);

      if (itemIndex < 0) return state;

      const updatedItems = [...state.items];
      const item = updatedItems[itemIndex];
      const { price, type } = determinePriceType(item.product, quantity, userType);
      const finalPrice = Math.max(price, item.product.minimum_price);

      updatedItems[itemIndex] = {
        ...item,
        quantity,
        applied_price: finalPrice,
        price_type: type,
      };

      return { items: updatedItems, appliedPriceType: type };
    });
  },

  updateDiscount: (productId, discount, note) => {
    set((state) => {
      const itemIndex = state.items.findIndex((item) => item.product.id === productId);

      if (itemIndex < 0) return state;

      const updatedItems = [...state.items];
      const item = updatedItems[itemIndex];

      // Validate that discounted price doesn't go below minimum
      const discountedPrice = item.applied_price - discount;
      if (discountedPrice < item.product.minimum_price) {
        // Cap discount at minimum price
        const maxDiscount = item.applied_price - item.product.minimum_price;
        updatedItems[itemIndex] = {
          ...item,
          discount: maxDiscount,
          discount_note: `تم الوصول للحد الأدنى للسعر`,
        };
        return { items: updatedItems };
      }

      updatedItems[itemIndex] = {
        ...item,
        discount,
        discount_note: note,
      };

      return { items: updatedItems };
    });
  },

  removeItem: (productId) => {
    set((state) => ({
      items: state.items.filter((item) => item.product.id !== productId),
    }));
  },

  setCustomer: (customer) => set({ customer }),
  setInvoiceType: (type) => set({ invoiceType: type }),
  setCreditDays: (days) => set({ creditDays: days }),
  setNotes: (notes) => set({ notes }),

  getTotals: () => {
    const state = get();
    let subtotal = 0;
    let discountTotal = 0;

    for (const item of state.items) {
      const itemSubtotal = item.applied_price * item.quantity;
      subtotal += itemSubtotal;
      discountTotal += item.discount * item.quantity;
    }

    return {
      subtotal,
      discountTotal,
      netTotal: subtotal - discountTotal,
    };
  },

  clearCart: () =>
    set({
      items: [],
      customer: null,
      invoiceType: 'PAID',
      creditDays: 30,
      notes: '',
      appliedPriceType: 'retail',
    }),
}));

// Unit display helper
export const getUnitLabel = (unit: string): string => {
  const units: Record<string, string> = {
    piece: 'قطعة',
    box: 'صندوق',
    meter: 'متر',
    kg: 'كيلو',
  };
  return units[unit] || unit;
};

// Format price helper
export const formatPrice = (price: number): string => {
  return price.toFixed(3);
};
