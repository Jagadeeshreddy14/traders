import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ShoppingBag,
  Trash2,
  Plus,
  Minus,
  ArrowRight,
  ShieldCheck,
  Truck,
  Sparkles,
  AlertCircle,
} from 'lucide-react';
import { useCart } from '../context/CartContext';

export const ShoppingCartPage: React.FC = () => {
  const navigate = useNavigate();
  const {
    cartItems,
    updateQuantity,
    removeFromCart,
    clearCart,
    totalItems,
    totalPrice,
    regularTotalPrice,
    totalSavings,
    error,
    clearError,
  } = useCart();

  const freeDeliveryThreshold = 499;
  const isFreeDelivery = totalPrice >= freeDeliveryThreshold;
  const amountNeededForFree = Math.max(0, freeDeliveryThreshold - totalPrice);
  const freeDeliveryProgress = Math.min(100, (totalPrice / freeDeliveryThreshold) * 100);

  const deliveryCharge = isFreeDelivery ? 0 : 40;
  const packagingCharge = 15;
  const estimatedPayable = totalPrice + deliveryCharge + packagingCharge;

  const hasOutOfStock = cartItems.some((item) => item.isOutOfStock || (item.product.stockQuantity && item.quantity > item.product.stockQuantity));

  if (cartItems.length === 0) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center py-16 px-4">
        <div className="max-w-md w-full text-center bg-white rounded-3xl p-8 border border-gray-100 shadow-sm">
          <div className="w-24 h-24 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-6">
            <ShoppingBag className="w-12 h-12" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Your grocery cart is empty</h2>
          <p className="text-gray-500 text-sm mb-8">
            Explore fresh farm vegetables, daily essentials, and staples from Paven Traders.
          </p>
          <Link
            to="/"
            className="inline-flex items-center justify-center gap-2 w-full py-3.5 px-6 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold transition-colors shadow-lg shadow-emerald-600/20"
          >
            Start Grocery Shopping
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50/50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        {/* Breadcrumb / Title */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900">Your Shopping Cart</h1>
            <p className="text-sm text-gray-500 mt-1">
              {totalItems} item{totalItems > 1 ? 's' : ''} from Paven Traders Hub
            </p>
          </div>
          <button
            onClick={() => clearCart()}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-rose-600 hover:text-rose-700 hover:bg-rose-50 px-3 py-2 rounded-lg transition-colors self-start sm:self-auto"
          >
            <Trash2 className="w-3.5 h-3.5" />
            Clear Entire Cart
          </button>
        </div>

        {error && (
          <div className="mb-6 p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-sm flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-5 h-5 flex-shrink-0 text-rose-600" />
              <span>{error}</span>
            </div>
            <button
              onClick={clearError}
              className="text-xs font-semibold text-rose-700 underline hover:text-rose-900"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Free Delivery Threshold Progress Bar */}
        <div className="bg-white rounded-2xl p-4 sm:p-5 border border-gray-100 shadow-sm mb-6">
          <div className="flex items-center justify-between text-xs sm:text-sm font-semibold mb-2">
            <div className="flex items-center gap-2">
              <Truck className="w-4 h-4 text-emerald-600" />
              {isFreeDelivery ? (
                <span className="text-emerald-700 font-bold">
                  🎉 Congratulations! You unlocked FREE City-Wide Delivery!
                </span>
              ) : (
                <span className="text-gray-700">
                  Add <span className="text-emerald-700 font-bold">₹{amountNeededForFree.toFixed(0)}</span> more for FREE delivery
                </span>
              )}
            </div>
            <span className="text-gray-500">₹{totalPrice.toFixed(0)} / ₹{freeDeliveryThreshold}</span>
          </div>
          <div className="w-full bg-gray-100 rounded-full h-2.5 overflow-hidden">
            <div
              className="bg-emerald-500 h-2.5 rounded-full transition-all duration-500"
              style={{ width: `${freeDeliveryProgress}%` }}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Items List */}
          <div className="lg:col-span-2 space-y-4">
            {cartItems.map((item) => {
              const p = item.product;
              const pId = (p.id || p._id)!;
              const unitSellingPrice = p.discountedPrice ?? p.price;
              const itemTotal = unitSellingPrice * item.quantity;
              const isItemOutOfStock = item.isOutOfStock || (p.stockQuantity !== undefined && p.stockQuantity <= 0);

              return (
                <div
                  key={pId}
                  className={`bg-white rounded-2xl p-4 sm:p-5 border transition-all ${
                    isItemOutOfStock ? 'border-rose-200 bg-rose-50/20' : 'border-gray-100 shadow-sm'
                  }`}
                >
                  <div className="flex gap-4 sm:gap-6">
                    <img
                      src={p.images?.[0] || 'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=300&q=80'}
                      alt={p.name}
                      className="w-20 h-20 sm:w-24 sm:h-24 object-cover rounded-xl border border-gray-100 flex-shrink-0"
                    />

                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          {p.brand && (
                            <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md">
                              {p.brand}
                            </span>
                          )}
                          <h3 className="text-base font-bold text-gray-900 mt-1 line-clamp-1">{p.name}</h3>
                          <p className="text-xs text-gray-500 mt-0.5">{p.unit || 'Standard pack'}</p>
                        </div>
                        <button
                          onClick={() => removeFromCart(pId)}
                          className="text-gray-400 hover:text-rose-600 p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
                          title="Remove item"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>

                      {/* Stock Warning */}
                      {isItemOutOfStock ? (
                        <div className="mt-2 text-xs font-semibold text-rose-600 flex items-center gap-1">
                          <AlertCircle className="w-3.5 h-3.5" />
                          Currently out of stock. Please remove before checkout.
                        </div>
                      ) : item.stockWarning ? (
                        <div className="mt-2 text-xs font-semibold text-amber-600 flex items-center gap-1">
                          <AlertCircle className="w-3.5 h-3.5" />
                          {item.stockWarning}
                        </div>
                      ) : null}

                      {/* Pricing and Stepper */}
                      <div className="flex items-center justify-between mt-4">
                        <div className="flex items-baseline gap-2">
                          <span className="text-base sm:text-lg font-extrabold text-gray-900">
                            ₹{itemTotal.toFixed(0)}
                          </span>
                          {p.discountedPrice && p.discountedPrice < p.price && (
                            <span className="text-xs text-gray-400 line-through">
                              ₹{(p.price * item.quantity).toFixed(0)}
                            </span>
                          )}
                          <span className="text-xs text-gray-500">
                            (₹{unitSellingPrice.toFixed(0)} / unit)
                          </span>
                        </div>

                        {/* Quantity Stepper */}
                        <div className="flex items-center border border-gray-200 rounded-xl bg-gray-50 overflow-hidden">
                          <button
                            onClick={() => updateQuantity(pId, item.quantity - 1)}
                            className="p-1.5 sm:p-2 text-gray-600 hover:bg-gray-200 transition-colors"
                            aria-label="Decrease quantity"
                          >
                            <Minus className="w-3.5 h-3.5" />
                          </button>
                          <span className="px-3 text-xs sm:text-sm font-bold text-gray-900 min-w-[28px] text-center">
                            {item.quantity}
                          </span>
                          <button
                            onClick={() => updateQuantity(pId, item.quantity + 1)}
                            className="p-1.5 sm:p-2 text-gray-600 hover:bg-gray-200 transition-colors"
                            aria-label="Increase quantity"
                            disabled={p.stockQuantity !== undefined && item.quantity >= p.stockQuantity}
                          >
                            <Plus className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Bill Summary Sidebar */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm sticky top-24">
              <h2 className="text-lg font-bold text-gray-900 mb-4">Order Summary</h2>

              <div className="space-y-3 text-sm border-b border-gray-100 pb-4">
                <div className="flex justify-between text-gray-600">
                  <span>Items MRP</span>
                  <span className="font-semibold text-gray-900">₹{regularTotalPrice.toFixed(0)}</span>
                </div>

                {totalSavings > 0 && (
                  <div className="flex justify-between text-emerald-600 font-medium">
                    <span>Store Discount</span>
                    <span>- ₹{totalSavings.toFixed(0)}</span>
                  </div>
                )}

                <div className="flex justify-between text-gray-600">
                  <span>Items Subtotal</span>
                  <span className="font-semibold text-gray-900">₹{totalPrice.toFixed(0)}</span>
                </div>

                <div className="flex justify-between text-gray-600">
                  <span>Delivery Charge</span>
                  {isFreeDelivery ? (
                    <span className="text-emerald-600 font-semibold uppercase text-xs bg-emerald-50 px-2 py-0.5 rounded">
                      FREE
                    </span>
                  ) : (
                    <span className="font-semibold text-gray-900">₹{deliveryCharge}</span>
                  )}
                </div>

                <div className="flex justify-between text-gray-600">
                  <span>Eco Packaging Charge</span>
                  <span className="font-semibold text-gray-900">₹{packagingCharge}</span>
                </div>
              </div>

              {/* Total Payable */}
              <div className="pt-4 mb-6">
                <div className="flex justify-between items-baseline">
                  <span className="text-base font-bold text-gray-900">Estimated Total</span>
                  <span className="text-2xl font-extrabold text-emerald-700">
                    ₹{estimatedPayable.toFixed(0)}
                  </span>
                </div>
                {totalSavings > 0 && (
                  <p className="text-xs text-emerald-600 font-semibold mt-1">
                    🎉 You will save ₹{totalSavings.toFixed(0)} on this order
                  </p>
                )}
              </div>

              {/* Checkout Button */}
              <button
                onClick={() => navigate('/checkout')}
                disabled={hasOutOfStock}
                className={`w-full py-4 px-6 rounded-2xl font-bold flex items-center justify-center gap-2 transition-all shadow-lg ${
                  hasOutOfStock
                    ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-600/25 hover:shadow-emerald-600/35'
                }`}
              >
                Proceed to Checkout
                <ArrowRight className="w-5 h-5" />
              </button>

              {hasOutOfStock && (
                <p className="text-xs text-rose-600 text-center mt-2 font-medium">
                  Please resolve out-of-stock items above to proceed.
                </p>
              )}

              {/* Assurance Badges */}
              <div className="mt-6 pt-5 border-t border-gray-100 space-y-2.5">
                <div className="flex items-center gap-2 text-xs text-gray-500">
                  <ShieldCheck className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                  <span>100% Quality & Fresh Farm produce guaranteed</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-gray-500">
                  <Sparkles className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                  <span>Verified prices recalculated securely by store hub</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
