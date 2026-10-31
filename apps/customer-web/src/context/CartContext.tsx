import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { IProduct } from '../types/catalog';
import { cartService } from '../services/cartService';

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
  clearCart: () => Promise<void>;
  getItemQuantity: (productId: string) => number;
  totalItems: number;
  totalPrice: number;
  regularTotalPrice: number;
  totalSavings: number;
  isCartOpen: boolean;
  setIsCartOpen: (open: boolean) => void;
  isLoading: boolean;
  error: string | null;
  clearError: () => void;
  refreshCart: () => Promise<void>;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export const CartProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [cartItems, setCartItems] = useState<ICartItem[]>(() => {
    try {
      const saved = localStorage.getItem('pt_cart');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const clearError = () => setError(null);

  const isAuthenticated = () => !!localStorage.getItem('pt_access_token');

  // Synchronize cart with backend if authenticated
  const refreshCart = useCallback(async () => {
    if (!isAuthenticated()) return;
    try {
      setIsLoading(true);
      const remoteCart = await cartService.getCart();
      if (remoteCart && remoteCart.items) {
        const formatted: ICartItem[] = remoteCart.items.map((item) => ({
          product: {
            id: item.productId,
            _id: item.productId,
            name: item.name,
            slug: item.slug,
            brand: item.brand,
            unit: item.unit,
            price: item.price,
            discountedPrice: item.discountedPrice,
            stockQuantity: item.availableStock,
            isAvailable: item.isAvailable,
            images: [item.image],
            category: '',
            isFeatured: false,
            tags: [],
          },
          quantity: item.quantity,
          stockWarning: item.stockWarning,
          isOutOfStock: item.isOutOfStock,
        }));
        setCartItems(formatted);
      }
    } catch (e: any) {
      console.warn('Could not sync remote cart', e);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Sync on initial mount or when token is detected
  useEffect(() => {
    const handleAuthChange = async () => {
      if (isAuthenticated()) {
        try {
          const localSaved = localStorage.getItem('pt_cart');
          const localItems: ICartItem[] = localSaved ? JSON.parse(localSaved) : [];
          if (localItems.length > 0) {
            await cartService.syncCart(
              localItems.map((i) => ({
                productId: (i.product.id || i.product._id)!,
                quantity: i.quantity,
              }))
            );
          }
          await refreshCart();
        } catch {
          await refreshCart();
        }
      }
    };

    handleAuthChange();
  }, [refreshCart]);

  // Persist local storage for guest
  useEffect(() => {
    try {
      localStorage.setItem('pt_cart', JSON.stringify(cartItems));
    } catch (e) {
      console.error('Failed to save cart to localStorage', e);
    }
  }, [cartItems]);

  const addToCart = async (product: IProduct, quantity = 1) => {
    const pId = (product.id || product._id)!;
    setError(null);

    if (isAuthenticated()) {
      try {
        setIsLoading(true);
        await cartService.addItem(pId, quantity);
        await refreshCart();
      } catch (err: any) {
        const msg = err.response?.data?.message || 'Failed to add item to cart.';
        setError(msg);
      } finally {
        setIsLoading(false);
      }
    } else {
      // Guest local state
      setCartItems((prev) => {
        const existing = prev.find((item) => (item.product.id || item.product._id) === pId);
        if (existing) {
          const newQty = existing.quantity + quantity;
          if (product.stockQuantity && newQty > product.stockQuantity) {
            setError(`Cannot add more. Only ${product.stockQuantity} units available in stock.`);
            return prev;
          }
          return prev.map((item) =>
            (item.product.id || item.product._id) === pId
              ? { ...item, quantity: newQty }
              : item
          );
        }
        return [...prev, { product, quantity }];
      });
    }
  };

  const removeFromCart = async (productId: string) => {
    setError(null);
    if (isAuthenticated()) {
      try {
        setIsLoading(true);
        await cartService.removeItem(productId);
        await refreshCart();
      } catch (err: any) {
        setError(err.response?.data?.message || 'Failed to remove item.');
      } finally {
        setIsLoading(false);
      }
    } else {
      setCartItems((prev) =>
        prev.filter((item) => (item.product.id || item.product._id) !== productId)
      );
    }
  };

  const updateQuantity = async (productId: string, quantity: number) => {
    setError(null);
    if (quantity <= 0) {
      await removeFromCart(productId);
      return;
    }

    if (isAuthenticated()) {
      try {
        setIsLoading(true);
        await cartService.updateQuantity(productId, quantity);
        await refreshCart();
      } catch (err: any) {
        setError(err.response?.data?.message || 'Failed to update quantity.');
      } finally {
        setIsLoading(false);
      }
    } else {
      setCartItems((prev) =>
        prev.map((item) =>
          (item.product.id || item.product._id) === productId
            ? { ...item, quantity }
            : item
        )
      );
    }
  };

  const clearCart = async () => {
    setError(null);
    if (isAuthenticated()) {
      try {
        setIsLoading(true);
        await cartService.clearCart();
        setCartItems([]);
      } catch (err: any) {
        setError(err.response?.data?.message || 'Failed to clear cart.');
      } finally {
        setIsLoading(false);
      }
    } else {
      setCartItems([]);
    }
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

  const regularTotalPrice = cartItems.reduce((acc, item) => {
    return acc + (item.product.price || 0) * item.quantity;
  }, 0);

  const totalSavings = Math.max(0, regularTotalPrice - totalPrice);

  return (
    <CartContext.Provider
      value={{
        cartItems,
        addToCart,
        removeFromCart,
        updateQuantity,
        clearCart,
        getItemQuantity,
        totalItems,
        totalPrice,
        regularTotalPrice,
        totalSavings,
        isCartOpen,
        setIsCartOpen,
        isLoading,
        error,
        clearError,
        refreshCart,
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
