import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { IProduct } from '../types';
import { secureStorage } from '../services/storage';
import { mobileApi } from '../services/api';

export interface ICartItem {
  product: IProduct;
  quantity: number;
  stockWarning?: string;
  isOutOfStock?: boolean;
}

interface CartContextType {
  cartItems: ICartItem[];
  addToCart: (product: IProduct, quantity?: number) => Promise<void>;
  removeFromCart: (productId: string) => Promise<void>;
  updateQuantity: (productId: string, quantity: number) => Promise<void>;
  getItemQuantity: (productId: string) => number;
  totalItems: number;
  totalPrice: number;
  clearCart: () => Promise<void>;
  refreshCart: () => Promise<void>;
  error: string | null;
  clearError: () => void;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export const CartProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [cartItems, setCartItems] = useState<ICartItem[]>([]);
  const [error, setError] = useState<string | null>(null);

  const clearError = () => setError(null);

  const refreshCart = useCallback(async () => {
    try {
      const token = await secureStorage.getItem('access_token');
      if (token) {
        const res = await mobileApi.get('/cart');
        if (res.data?.data?.cart?.items) {
          const items: ICartItem[] = res.data.data.cart.items.map((i: any) => ({
            product: {
              id: i.productId,
              _id: i.productId,
              name: i.name,
              slug: i.slug,
              brand: i.brand,
              unit: i.unit,
              price: i.price,
              discountedPrice: i.discountedPrice,
              stockQuantity: i.availableStock,
              isAvailable: i.isAvailable,
              images: [i.image],
              category: '',
              isFeatured: false,
              tags: [],
            },
            quantity: i.quantity,
            stockWarning: i.stockWarning,
            isOutOfStock: i.isOutOfStock,
          }));
          setCartItems(items);
          await secureStorage.setItem('mobile_cart', JSON.stringify(items));
          return;
        }
      }

      // Guest fallback
      const saved = await secureStorage.getItem('mobile_cart');
      if (saved) {
        setCartItems(JSON.parse(saved));
      }
    } catch (e) {
      console.warn('Failed to refresh mobile cart', e);
    }
  }, []);

  useEffect(() => {
    refreshCart();
  }, [refreshCart]);

  const saveLocalCart = async (items: ICartItem[]) => {
    try {
      await secureStorage.setItem('mobile_cart', JSON.stringify(items));
    } catch (e) {
      console.warn('Failed to save mobile cart', e);
    }
  };

  const addToCart = async (product: IProduct, quantity = 1) => {
    const pId = product.id || product._id!;
    setError(null);

    const token = await secureStorage.getItem('access_token');
    if (token) {
      try {
        await mobileApi.post('/cart/items', { productId: pId, quantity });
        await refreshCart();
      } catch (err: any) {
        setError(err.response?.data?.message || 'Cannot add item to cart.');
      }
    } else {
      // Local fallback
      setCartItems((prev) => {
        const existing = prev.find((item) => (item.product.id || item.product._id) === pId);
        let updated: ICartItem[];
        if (existing) {
          const newQty = existing.quantity + quantity;
          if (product.stockQuantity && newQty > product.stockQuantity) {
            setError(`Only ${product.stockQuantity} units available.`);
            return prev;
          }
          updated = prev.map((item) =>
            (item.product.id || item.product._id) === pId
              ? { ...item, quantity: newQty }
              : item
          );
        } else {
          updated = [...prev, { product, quantity }];
        }
        saveLocalCart(updated);
        return updated;
      });
    }
  };

  const removeFromCart = async (productId: string) => {
    setError(null);
    const token = await secureStorage.getItem('access_token');
    if (token) {
      try {
        await mobileApi.delete(`/cart/items/${productId}`);
        await refreshCart();
      } catch (err: any) {
        setError(err.response?.data?.message || 'Failed to remove item.');
      }
    } else {
      setCartItems((prev) => {
        const updated = prev.filter((item) => (item.product.id || item.product._id) !== productId);
        saveLocalCart(updated);
        return updated;
      });
    }
  };

  const updateQuantity = async (productId: string, quantity: number) => {
    setError(null);
    if (quantity <= 0) {
      await removeFromCart(productId);
      return;
    }

    const token = await secureStorage.getItem('access_token');
    if (token) {
      try {
        await mobileApi.put(`/cart/items/${productId}`, { quantity });
        await refreshCart();
      } catch (err: any) {
        setError(err.response?.data?.message || 'Cannot update quantity.');
      }
    } else {
      setCartItems((prev) => {
        const updated = prev.map((item) =>
          (item.product.id || item.product._id) === productId
            ? { ...item, quantity }
            : item
        );
        saveLocalCart(updated);
        return updated;
      });
    }
  };

  const clearCart = async () => {
    setError(null);
    const token = await secureStorage.getItem('access_token');
    if (token) {
      try {
        await mobileApi.delete('/cart');
      } catch {
        // Fallback
      }
    }
    setCartItems([]);
    saveLocalCart([]);
  };

  const getItemQuantity = (productId: string) => {
    const item = cartItems.find((i) => (i.product.id || i.product._id) === productId);
    return item ? item.quantity : 0;
  };

  const totalItems = cartItems.reduce((acc, item) => acc + item.quantity, 0);

  const totalPrice = cartItems.reduce((acc, item) => {
    const price = item.product.discountedPrice ?? item.product.price;
    return acc + price * item.quantity;
  }, 0);

  return (
    <CartContext.Provider
      value={{
        cartItems,
        addToCart,
        removeFromCart,
        updateQuantity,
        getItemQuantity,
        totalItems,
        totalPrice,
        clearCart,
        refreshCart,
        error,
        clearError,
      }}
    >
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
};
