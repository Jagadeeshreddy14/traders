import React from 'react';
import { useNavigate } from 'react-router-dom';
import { X, ShoppingBag, Plus, Minus, Trash2, ArrowRight, Truck, ShieldCheck } from 'lucide-react';
import { useCart } from '../context/CartContext';

export const CartDrawer: React.FC = () => {
  const navigate = useNavigate();
  const { cartItems, isCartOpen, setIsCartOpen, updateQuantity, removeFromCart, totalPrice, totalItems } = useCart();

  if (!isCartOpen) return null;

  const freeDeliveryThreshold = 499;
  const deliveryFee = totalPrice >= freeDeliveryThreshold || totalPrice === 0 ? 0 : 40;
  const grandTotal = totalPrice + deliveryFee;
  const amountNeededForFreeDelivery = Math.max(0, freeDeliveryThreshold - totalPrice);
  const progressPercent = Math.min(100, Math.round((totalPrice / freeDeliveryThreshold) * 100));

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="absolute inset-0" onClick={() => setIsCartOpen(false)} />

      <div className="absolute inset-y-0 right-0 max-w-full flex pl-10">
        <div className="w-screen max-w-md bg-white shadow-2xl flex flex-col justify-between">
          {/* Header */}
          <div className="p-5 border-b border-gray-100 flex items-center justify-between bg-slate-50/80">
            <div className="flex items-center space-x-2.5">
              <div className="w-9 h-9 rounded-xl bg-brand-600 text-white flex items-center justify-center shadow-sm">
                <ShoppingBag className="w-5 h-5" />
              </div>
              <div>
                <h2 className="font-extrabold text-slate-900 text-base">Your Grocery Cart</h2>
                <p className="text-xs text-slate-500">{totalItems} {totalItems === 1 ? 'item' : 'items'} • Paven Traders</p>
              </div>
            </div>

            <button
              onClick={() => setIsCartOpen(false)}
              className="p-2 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Free Delivery Goal Bar */}
          <div className="bg-brand-50 px-5 py-3 border-b border-brand-100">
            <div className="flex items-center space-x-2 text-xs font-bold text-brand-900 mb-1.5">
              <Truck className="w-4 h-4 text-brand-600 shrink-0" />
              {deliveryFee === 0 && totalPrice > 0 ? (
                <span>🎉 You unlocked FREE city-wide express delivery!</span>
              ) : (
                <span>Add ₹{amountNeededForFreeDelivery} more for FREE city-wide delivery!</span>
              )}
            </div>
            <div className="w-full bg-emerald-200/60 rounded-full h-2 overflow-hidden">
              <div
                className="bg-brand-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>

          {/* Cart Item List */}
          <div className="flex-1 overflow-y-auto p-5 space-y-4">
            {cartItems.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center p-6 text-slate-400">
                <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mb-4">
                  <ShoppingBag className="w-8 h-8 text-slate-300" />
                </div>
                <h3 className="font-bold text-slate-800 text-base">Your cart is empty</h3>
                <p className="text-xs text-slate-500 mt-1 max-w-xs">
                  Discover fresh vegetables, fruits, and pantry staples from Paven Traders.
                </p>
                <button
                  onClick={() => setIsCartOpen(false)}
                  className="mt-6 px-6 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-700 text-white font-bold text-xs shadow-md transition-all"
                >
                  Start Shopping
                </button>
              </div>
            ) : (
              cartItems.map(({ product, quantity }) => {
                const id = product.id || product._id || '';
                const itemPrice = (product.discountedPrice ?? product.price) * quantity;
                const image = product.images?.[0] || 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=200&auto=format&fit=crop&q=80';

                return (
                  <div
                    key={id}
                    className="flex items-center justify-between p-3 rounded-2xl border border-slate-100 bg-slate-50/50 hover:bg-white hover:shadow-sm transition-all"
                  >
                    <div className="flex items-center space-x-3 min-w-0">
                      <img
                        src={image}
                        alt={product.name}
                        className="w-14 h-14 rounded-xl object-cover bg-white shrink-0 border border-slate-200"
                      />
                      <div className="min-w-0">
                        <p className="text-[10px] font-bold text-brand-700 uppercase">{product.brand || 'Paven'}</p>
                        <h4 className="font-bold text-xs text-slate-800 truncate">{product.name}</h4>
                        <p className="text-[11px] text-slate-400">{product.unit}</p>
                        <p className="text-xs font-extrabold text-slate-900 mt-1">₹{itemPrice}</p>
                      </div>
                    </div>

                    <div className="flex items-center space-x-2 shrink-0">
                      <div className="flex items-center bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">
                        <button
                          onClick={() => updateQuantity(id, quantity - 1)}
                          className="p-1.5 text-slate-500 hover:text-brand-600 hover:bg-slate-50 transition-colors"
                        >
                          <Minus className="w-3.5 h-3.5" />
                        </button>
                        <span className="px-2 text-xs font-bold text-slate-800">{quantity}</span>
                        <button
                          onClick={() => updateQuantity(id, quantity + 1)}
                          className="p-1.5 text-slate-500 hover:text-brand-600 hover:bg-slate-50 transition-colors"
                        >
                          <Plus className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      <button
                        onClick={() => removeFromCart(id)}
                        className="p-1.5 text-slate-400 hover:text-rose-600 transition-colors"
                        title="Remove item"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Footer Bill & Checkout */}
          {cartItems.length > 0 && (
            <div className="p-5 border-t border-slate-200 bg-slate-50 space-y-4">
              <div className="space-y-1.5 text-xs text-slate-600">
                <div className="flex justify-between">
                  <span>Item Subtotal</span>
                  <span className="font-bold text-slate-800">₹{totalPrice}</span>
                </div>
                <div className="flex justify-between">
                  <span>City-Wide Express Delivery</span>
                  <span className={deliveryFee === 0 ? 'text-emerald-600 font-bold' : 'text-slate-800 font-bold'}>
                    {deliveryFee === 0 ? 'FREE' : `₹${deliveryFee}`}
                  </span>
                </div>
                <div className="flex justify-between text-sm font-extrabold text-slate-900 pt-2 border-t border-slate-200">
                  <span>Grand Total</span>
                  <span className="text-brand-700">₹{grandTotal}</span>
                </div>
              </div>

              <div className="flex items-center space-x-2 text-[11px] text-slate-500">
                <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Single Store Guarantee: 100% Quality Checked</span>
              </div>

              <div className="flex space-x-2">
                <button
                  onClick={() => {
                    setIsCartOpen(false);
                    navigate('/cart');
                  }}
                  className="px-3 py-3 rounded-xl border border-slate-300 text-xs font-semibold text-slate-600 hover:bg-slate-200/60 transition-colors"
                >
                  View Cart
                </button>
                <button
                  onClick={() => {
                    setIsCartOpen(false);
                    navigate('/checkout');
                  }}
                  className="flex-1 flex items-center justify-center space-x-2 bg-brand-600 hover:bg-brand-700 text-white font-bold py-3 px-4 rounded-xl shadow-lg shadow-brand-600/25 transition-all text-sm"
                >
                  <span>Proceed to Checkout</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
