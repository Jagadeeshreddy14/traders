import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Minus, Check, ImageOff } from 'lucide-react';
import { IProduct } from '../types/catalog';
import { useCart } from '../context/CartContext';

interface ProductCardProps {
  product: IProduct;
}

export const ProductCard: React.FC<ProductCardProps> = ({ product }) => {
  const { getItemQuantity, addToCart, updateQuantity } = useCart();
  const [imageError, setImageError] = useState(false);

  const productId = product.id || product._id || '';
  const quantity = getItemQuantity(productId);

  const originalPrice = product.price;
  const sellingPrice = product.discountedPrice ?? originalPrice;
  const hasDiscount = originalPrice > sellingPrice;
  const discountPercent = hasDiscount
    ? Math.round(((originalPrice - sellingPrice) / originalPrice) * 100)
    : 0;

  const displayImage =
    product.images && product.images.length > 0
      ? product.images[0]
      : 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=500&auto=format&fit=crop&q=80';

  const isOutOfStock = !product.isAvailable || product.stockQuantity <= 0;

  return (
    <div className="group bg-white rounded-2xl p-3.5 sm:p-4 border border-slate-200/80 hover:border-brand-500/40 hover:shadow-card-hover transition-all duration-200 flex flex-col justify-between relative">
      {/* Discount Badge */}
      {hasDiscount && (
        <div className="absolute top-3 left-3 z-10 bg-brand-600 text-white text-[10px] font-extrabold px-2 py-0.5 rounded-md shadow-sm">
          {discountPercent}% OFF
        </div>
      )}

      {/* Product Image Clickable Link */}
      <div>
        <Link
          to={`/product/${product.slug || productId}`}
          className="block relative aspect-square rounded-xl overflow-hidden bg-slate-50 mb-3"
        >
          {imageError ? (
            <div className="w-full h-full flex flex-col items-center justify-center text-slate-300">
              <ImageOff className="w-8 h-8 mb-1" />
              <span className="text-[10px]">No image</span>
            </div>
          ) : (
            <img
              src={displayImage}
              alt={product.name}
              onError={() => setImageError(true)}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
              loading="lazy"
            />
          )}

          {isOutOfStock && (
            <div className="absolute inset-0 bg-white/70 backdrop-blur-[2px] flex items-center justify-center">
              <span className="bg-slate-900 text-white text-[10px] font-bold px-2.5 py-1 rounded-full">
                Out of Stock
              </span>
            </div>
          )}
        </Link>

        {/* Brand & Weight */}
        <div className="flex items-center justify-between text-[11px] font-semibold text-slate-400 mb-1">
          <span className="uppercase tracking-wider text-brand-700 bg-brand-50 px-1.5 py-0.5 rounded">
            {product.brand || 'Paven Choice'}
          </span>
          <span className="text-slate-500">{product.unit}</span>
        </div>

        {/* Product Name */}
        <Link to={`/product/${product.slug || productId}`} className="block">
          <h3 className="font-bold text-xs sm:text-sm text-slate-800 line-clamp-2 leading-snug group-hover:text-brand-700 transition-colors">
            {product.name}
          </h3>
        </Link>
      </div>

      {/* Bottom Price & Add to Cart Controls */}
      <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between">
        <div>
          <div className="flex items-baseline space-x-1.5">
            <span className="text-sm sm:text-base font-extrabold text-slate-900">
              ₹{sellingPrice}
            </span>
            {hasDiscount && (
              <span className="text-[11px] text-slate-400 line-through">₹{originalPrice}</span>
            )}
          </div>
          <span className="text-[10px] text-emerald-600 font-semibold flex items-center space-x-0.5">
            <Check className="w-2.5 h-2.5" />
            <span>Store In Stock</span>
          </span>
        </div>

        {/* Action Button: Add or Stepper */}
        {isOutOfStock ? (
          <button
            disabled
            className="px-3 py-1.5 rounded-lg bg-slate-100 text-slate-400 text-xs font-bold cursor-not-allowed"
          >
            Unavailable
          </button>
        ) : quantity === 0 ? (
          <button
            onClick={() => addToCart(product, 1)}
            className="flex items-center space-x-1 bg-brand-600 hover:bg-brand-700 text-white text-xs font-bold px-3 py-1.5 rounded-xl shadow-sm hover:shadow transition-all"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add</span>
          </button>
        ) : (
          <div className="flex items-center bg-brand-600 text-white rounded-xl overflow-hidden shadow-sm">
            <button
              onClick={() => updateQuantity(productId, quantity - 1)}
              className="p-1.5 hover:bg-brand-700 transition-colors"
            >
              <Minus className="w-3.5 h-3.5" />
            </button>
            <span className="px-2 text-xs font-bold">{quantity}</span>
            <button
              onClick={() => updateQuantity(productId, quantity + 1)}
              className="p-1.5 hover:bg-brand-700 transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
