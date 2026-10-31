import mongoose from 'mongoose';
import { Cart, ICartDocument } from '../models/Cart';
import { Product, IProductDocument } from '../models/Product';
import { AppError } from '../utils/appError';

export interface ICartPopulatedItem {
  productId: string;
  name: string;
  slug: string;
  brand?: string;
  unit: string;
  image: string;
  price: number; // Regular MRP in Rupees
  discountedPrice?: number; // Selling price in Rupees
  unitSellingPrice: number; // Effective selling price
  quantity: number;
  subtotal: number; // in Rupees
  regularSubtotal: number; // in Rupees
  discountAmount: number; // in Rupees
  availableStock: number;
  isAvailable: boolean;
  isOutOfStock: boolean;
  stockWarning?: string;
}

export interface ICartDetails {
  id: string;
  userId: string;
  items: ICartPopulatedItem[];
  totalItemsCount: number;
  subtotal: number; // in Rupees
  regularSubtotal: number; // in Rupees
  totalSavings: number; // in Rupees
  subtotalPaise: number;
  regularSubtotalPaise: number;
  totalSavingsPaise: number;
  hasOutOfStockItems: boolean;
}

export class CartService {
  /**
   * Helper: calculate formatted item and cart totals from live products
   */
  private static formatCart(cart: ICartDocument): ICartDetails {
    let subtotal = 0;
    let regularSubtotal = 0;
    let totalItemsCount = 0;
    let hasOutOfStockItems = false;

    const formattedItems: ICartPopulatedItem[] = [];

    for (const item of cart.items) {
      const product = item.product as unknown as IProductDocument;
      if (!product || !product._id) continue;

      const regularPrice = product.price || 0;
      const unitSellingPrice =
        product.discountedPrice !== undefined && product.discountedPrice < regularPrice
          ? product.discountedPrice
          : regularPrice;

      const isOutOfStock = !product.isAvailable || product.stockQuantity <= 0;
      if (isOutOfStock) {
        hasOutOfStockItems = true;
      }

      let stockWarning: string | undefined;
      if (isOutOfStock) {
        stockWarning = 'Currently out of stock';
      } else if (item.quantity > product.stockQuantity) {
        stockWarning = `Only ${product.stockQuantity} units available`;
        hasOutOfStockItems = true;
      }

      const itemSubtotal = unitSellingPrice * item.quantity;
      const itemRegularSubtotal = regularPrice * item.quantity;
      const itemDiscount = itemRegularSubtotal - itemSubtotal;

      if (!isOutOfStock) {
        subtotal += itemSubtotal;
        regularSubtotal += itemRegularSubtotal;
        totalItemsCount += item.quantity;
      }

      formattedItems.push({
        productId: product._id.toString(),
        name: product.name,
        slug: product.slug,
        brand: product.brand || 'Paven Choice',
        unit: product.unit || '1 unit',
        image: product.images?.[0] || 'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=400&q=80',
        price: regularPrice,
        discountedPrice: product.discountedPrice,
        unitSellingPrice,
        quantity: item.quantity,
        subtotal: itemSubtotal,
        regularSubtotal: itemRegularSubtotal,
        discountAmount: itemDiscount,
        availableStock: product.stockQuantity,
        isAvailable: product.isAvailable,
        isOutOfStock,
        stockWarning,
      });
    }

    const totalSavings = regularSubtotal - subtotal;

    return {
      id: cart.id,
      userId: cart.user.toString(),
      items: formattedItems,
      totalItemsCount,
      subtotal,
      regularSubtotal,
      totalSavings,
      subtotalPaise: Math.round(subtotal * 100),
      regularSubtotalPaise: Math.round(regularSubtotal * 100),
      totalSavingsPaise: Math.round(totalSavings * 100),
      hasOutOfStockItems,
    };
  }

  /**
   * Get user's active cart, creating one if it doesn't exist
   */
  static async getCart(userId: string | mongoose.Types.ObjectId): Promise<ICartDetails> {
    let cart = await Cart.findOne({ user: userId }).populate('items.product');

    if (!cart) {
      cart = await Cart.create({ user: userId, items: [], totalAmount: 0 });
    }

    // Filter out deleted products if any
    const validItems = cart.items.filter((i) => i.product != null);
    if (validItems.length !== cart.items.length) {
      cart.items = validItems;
      await cart.save();
      await cart.populate('items.product');
    }

    return this.formatCart(cart);
  }

  /**
   * Add a product to the cart with inventory validation
   */
  static async addItem(
    userId: string | mongoose.Types.ObjectId,
    productId: string,
    quantityToAdd: number = 1
  ): Promise<ICartDetails> {
    if (quantityToAdd <= 0) {
      throw AppError.badRequest('Quantity must be at least 1');
    }

    const product = await Product.findById(productId);
    if (!product) {
      throw AppError.notFound('Product not found');
    }

    if (!product.isAvailable) {
      throw AppError.badRequest(`"${product.name}" is currently unavailable`);
    }

    if (product.stockQuantity <= 0) {
      throw AppError.badRequest(`"${product.name}" is out of stock`);
    }

    let cart = await Cart.findOne({ user: userId });
    if (!cart) {
      cart = new Cart({ user: userId, items: [] });
    }

    const existingIndex = cart.items.findIndex(
      (item) => item.product.toString() === productId.toString()
    );

    const currentQtyInCart = existingIndex >= 0 ? cart.items[existingIndex].quantity : 0;
    const totalDesiredQty = currentQtyInCart + quantityToAdd;

    if (totalDesiredQty > product.stockQuantity) {
      throw AppError.badRequest(
        `Cannot add ${quantityToAdd} more. Only ${product.stockQuantity} units of "${product.name}" in stock (${currentQtyInCart} already in your cart).`
      );
    }

    const unitSellingPrice = product.discountedPrice ?? product.price;

    if (existingIndex >= 0) {
      cart.items[existingIndex].quantity = totalDesiredQty;
      cart.items[existingIndex].unitPrice = unitSellingPrice;
    } else {
      cart.items.push({
        product: product._id as mongoose.Types.ObjectId,
        quantity: quantityToAdd,
        unitPrice: unitSellingPrice,
      });
    }

    await cart.save();
    return this.getCart(userId);
  }

  /**
   * Update item quantity (or remove if quantity <= 0)
   */
  static async updateItemQuantity(
    userId: string | mongoose.Types.ObjectId,
    productId: string,
    newQuantity: number
  ): Promise<ICartDetails> {
    let cart = await Cart.findOne({ user: userId });
    if (!cart) {
      cart = new Cart({ user: userId, items: [] });
    }

    const existingIndex = cart.items.findIndex(
      (item) => item.product.toString() === productId.toString()
    );

    if (existingIndex < 0) {
      throw AppError.notFound('Item is not in your cart');
    }

    if (newQuantity <= 0) {
      cart.items.splice(existingIndex, 1);
      await cart.save();
      return this.getCart(userId);
    }

    const product = await Product.findById(productId);
    if (!product) {
      cart.items.splice(existingIndex, 1);
      await cart.save();
      throw AppError.notFound('Product is no longer available');
    }

    if (!product.isAvailable || product.stockQuantity <= 0) {
      throw AppError.badRequest(`"${product.name}" is currently out of stock`);
    }

    if (newQuantity > product.stockQuantity) {
      throw AppError.badRequest(
        `Requested quantity (${newQuantity}) exceeds available stock (${product.stockQuantity} units available)`
      );
    }

    const unitSellingPrice = product.discountedPrice ?? product.price;
    cart.items[existingIndex].quantity = newQuantity;
    cart.items[existingIndex].unitPrice = unitSellingPrice;

    await cart.save();
    return this.getCart(userId);
  }

  /**
   * Remove a specific item from cart
   */
  static async removeItem(
    userId: string | mongoose.Types.ObjectId,
    productId: string
  ): Promise<ICartDetails> {
    const cart = await Cart.findOne({ user: userId });
    if (!cart) {
      return this.getCart(userId);
    }

    cart.items = cart.items.filter((item) => item.product.toString() !== productId.toString());
    await cart.save();
    return this.getCart(userId);
  }

  /**
   * Clear all items in cart
   */
  static async clearCart(userId: string | mongoose.Types.ObjectId): Promise<ICartDetails> {
    let cart = await Cart.findOne({ user: userId });
    if (cart) {
      cart.items = [];
      cart.totalAmount = 0;
      await cart.save();
    }
    return this.getCart(userId);
  }

  /**
   * Synchronize guest / local items into authenticated persistent cart
   */
  static async syncGuestCart(
    userId: string | mongoose.Types.ObjectId,
    guestItems: Array<{ productId: string; quantity: number }>
  ): Promise<ICartDetails> {
    if (!guestItems || !Array.isArray(guestItems) || guestItems.length === 0) {
      return this.getCart(userId);
    }

    let cart = await Cart.findOne({ user: userId });
    if (!cart) {
      cart = new Cart({ user: userId, items: [] });
    }

    for (const guestItem of guestItems) {
      if (!guestItem.productId || !guestItem.quantity || guestItem.quantity <= 0) continue;

      try {
        const product = await Product.findById(guestItem.productId);
        if (!product || !product.isAvailable || product.stockQuantity <= 0) continue;

        const existingIndex = cart.items.findIndex(
          (i) => i.product.toString() === guestItem.productId.toString()
        );

        const unitSellingPrice = product.discountedPrice ?? product.price;

        if (existingIndex >= 0) {
          // Merge by taking max or sum capped at stock
          const mergedQty = Math.min(
            Math.max(cart.items[existingIndex].quantity, guestItem.quantity),
            product.stockQuantity
          );
          cart.items[existingIndex].quantity = mergedQty;
          cart.items[existingIndex].unitPrice = unitSellingPrice;
        } else {
          const qty = Math.min(guestItem.quantity, product.stockQuantity);
          cart.items.push({
            product: product._id as mongoose.Types.ObjectId,
            quantity: qty,
            unitPrice: unitSellingPrice,
          });
        }
      } catch {
        // Skip any unparseable guest item
      }
    }

    await cart.save();
    return this.getCart(userId);
  }
}
