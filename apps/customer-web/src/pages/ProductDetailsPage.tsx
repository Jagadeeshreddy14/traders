import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  ShieldCheck,
  Truck,
  Plus,
  Minus,
  Check,
  ChevronRight,
} from 'lucide-react';
import { api } from '../services/api';
import { IProduct } from '../types/catalog';
import { useCart } from '../context/CartContext';
import { ProductCard } from '../components/ProductCard';

export const ProductDetailsPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { addToCart, getItemQuantity } = useCart();

  const [product, setProduct] = useState<IProduct | null>(null);
  const [relatedProducts, setRelatedProducts] = useState<IProduct[]>([]);
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchProduct = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await api.get(`/products/${id}`);
        if (res.data?.data) {
          setProduct(res.data.data.product);
          setRelatedProducts(res.data.data.relatedProducts || []);
          setActiveImageIndex(0);
          setQuantity(1);
        }
      } catch (err: any) {
        setError(err.response?.data?.message || 'Product not found');
      } finally {
        setLoading(false);
      }
    };

    fetchProduct();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [id]);

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-16 flex flex-col items-center justify-center min-h-[60vh]">
        <div className="w-10 h-10 border-4 border-brand-500 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-xs font-semibold text-slate-500 mt-3">Loading fresh grocery details...</p>
      </div>
    );
  }

  if (error || !product) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-16 text-center">
        <h2 className="text-xl font-bold text-slate-900">Product Not Available</h2>
        <p className="text-xs text-slate-500 mt-1">{error || 'This item could not be found in our store inventory.'}</p>
        <Link
          to="/products"
          className="mt-4 inline-block px-5 py-2.5 rounded-xl bg-brand-600 text-white font-bold text-xs shadow-md"
        >
          Back to Groceries
        </Link>
      </div>
    );
  }

  const productId = product.id || product._id || '';
  const cartQty = getItemQuantity(productId);

  const originalPrice = product.price;
  const sellingPrice = product.discountedPrice ?? originalPrice;
  const hasDiscount = originalPrice > sellingPrice;
  const discountPercent = hasDiscount
    ? Math.round(((originalPrice - sellingPrice) / originalPrice) * 100)
    : 0;

  const images = product.images && product.images.length > 0
    ? product.images
    : ['https://images.unsplash.com/photo-1542838132-92c53300491e?w=800&auto=format&fit=crop&q=80'];

  const categoryName = typeof product.category === 'object' ? product.category.name : 'Groceries';
  const categorySlug = typeof product.category === 'object' ? product.category.slug : 'products';

  const handleAddToCart = () => {
    addToCart(product, quantity);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-12">
      {/* Breadcrumb Navigation */}
      <nav className="flex items-center space-x-2 text-xs font-semibold text-slate-500">
        <Link to="/" className="hover:text-brand-600 transition-colors">Home</Link>
        <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
        <Link to={`/category/${categorySlug}`} className="hover:text-brand-600 transition-colors">
          {categoryName}
        </Link>
        <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
        <span className="text-slate-900 font-bold truncate max-w-xs">{product.name}</span>
      </nav>

      {/* Main Product Details Card */}
      <div className="bg-white rounded-3xl p-6 sm:p-10 border border-slate-200/80 shadow-card grid grid-cols-1 lg:grid-cols-12 gap-10">
        {/* Left: Image Gallery */}
        <div className="lg:col-span-6 space-y-4">
          <div className="relative aspect-square rounded-3xl overflow-hidden bg-slate-50 border border-slate-200/60">
            {hasDiscount && (
              <span className="absolute top-4 left-4 z-10 bg-brand-600 text-white text-xs font-extrabold px-3 py-1 rounded-lg shadow-sm">
                {discountPercent}% OFF
              </span>
            )}
            <img
              src={images[activeImageIndex]}
              alt={product.name}
              className="w-full h-full object-cover transition-all duration-300"
            />
          </div>

          {/* Thumbnail Gallery */}
          {images.length > 1 && (
            <div className="flex space-x-3 overflow-x-auto pb-2">
              {images.map((img, idx) => (
                <button
                  key={idx}
                  onClick={() => setActiveImageIndex(idx)}
                  className={`w-16 h-16 rounded-xl overflow-hidden border-2 transition-all shrink-0 ${
                    activeImageIndex === idx ? 'border-brand-600 shadow-md scale-105' : 'border-slate-200'
                  }`}
                >
                  <img src={img} alt={`${product.name} thumbnail ${idx + 1}`} className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Right: Product Specification & Add to Cart */}
        <div className="lg:col-span-6 flex flex-col justify-between space-y-6">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-extrabold text-brand-700 bg-brand-50 px-3 py-1 rounded-lg uppercase tracking-wider">
                {product.brand || 'Paven Choice'}
              </span>

              <span className="inline-flex items-center space-x-1 text-xs font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
                <Check className="w-3.5 h-3.5" />
                <span>In Stock ({product.stockQuantity} units)</span>
              </span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight leading-snug">
              {product.name}
            </h1>

            <p className="text-xs font-semibold text-slate-500">
              Pack Size: <strong className="text-slate-800">{product.unit}</strong>
            </p>

            {/* Price section */}
            <div className="flex items-baseline space-x-3 pt-2">
              <span className="text-3xl sm:text-4xl font-extrabold text-slate-900">
                ₹{sellingPrice}
              </span>
              {hasDiscount && (
                <>
                  <span className="text-lg text-slate-400 line-through">₹{originalPrice}</span>
                  <span className="text-xs font-extrabold text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-md">
                    Save ₹{originalPrice - sellingPrice}
                  </span>
                </>
              )}
            </div>

            <p className="text-xs text-slate-400">Inclusive of all local taxes</p>

            {/* Delivery Guarantee Info Box */}
            <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-4 space-y-2.5">
              <div className="flex items-center space-x-2.5 text-xs text-slate-700 font-semibold">
                <Truck className="w-4 h-4 text-brand-600 shrink-0" />
                <span>City-Wide Express: Delivered within <strong>30-45 Mins</strong></span>
              </div>
              <div className="flex items-center space-x-2.5 text-xs text-slate-700 font-semibold">
                <ShieldCheck className="w-4 h-4 text-brand-600 shrink-0" />
                <span>Single Store Verified: Handpicked from centralized store</span>
              </div>
            </div>

            {/* Quantity Selector & Add to Cart */}
            <div className="pt-4 flex items-center space-x-4">
              <div className="flex items-center border border-slate-200 rounded-2xl bg-slate-50 p-1">
                <button
                  onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                  className="w-10 h-10 rounded-xl bg-white text-slate-700 flex items-center justify-center shadow-xs hover:bg-slate-100 transition-colors"
                >
                  <Minus className="w-4 h-4" />
                </button>
                <span className="w-12 text-center font-extrabold text-sm text-slate-800">{quantity}</span>
                <button
                  onClick={() => setQuantity((q) => q + 1)}
                  className="w-10 h-10 rounded-xl bg-white text-slate-700 flex items-center justify-center shadow-xs hover:bg-slate-100 transition-colors"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>

              <button
                onClick={handleAddToCart}
                className="flex-1 flex items-center justify-center space-x-2 bg-brand-600 hover:bg-brand-700 text-white font-extrabold py-3.5 px-6 rounded-2xl shadow-lg shadow-brand-600/30 hover:shadow-xl transition-all text-sm"
              >
                <Plus className="w-5 h-5" />
                <span>Add {quantity} to Cart (₹{sellingPrice * quantity})</span>
              </button>
            </div>

            {cartQty > 0 && (
              <p className="text-xs font-semibold text-emerald-600">
                ✓ Currently {cartQty} in your cart
              </p>
            )}
          </div>

          {/* Description & Store Details */}
          <div className="pt-6 border-t border-slate-100 space-y-3">
            <h3 className="font-extrabold text-sm text-slate-900">About this product</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              {product.description || 'Premium grocery staple sourced directly by Paven Traders for maximum freshness, cleanliness, and value.'}
            </p>
          </div>
        </div>
      </div>

      {/* Related Products Carousel */}
      {relatedProducts.length > 0 && (
        <section className="space-y-6 pt-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-extrabold text-slate-900 tracking-tight">Similar Products in this Category</h2>
              <p className="text-xs text-slate-500">Other shoppers also ordered these items</p>
            </div>
            <Link to={`/category/${categorySlug}`} className="text-xs font-bold text-brand-600 hover:text-brand-700">
              View More in {categoryName} →
            </Link>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {relatedProducts.map((prod) => (
              <ProductCard key={prod.id || prod._id} product={prod} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
};
