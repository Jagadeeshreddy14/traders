import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  MapPin,
  Plus,
  Tag,
  CheckCircle2,
  AlertCircle,
  Truck,
  ShieldCheck,
  ArrowLeft,
  X,
  Edit2,
  Trash2,
  CreditCard,
  Banknote,
  ArrowRight,
} from 'lucide-react';
import { useCart } from '../context/CartContext';
import { addressService } from '../services/addressService';
import { couponService } from '../services/couponService';
import { checkoutService } from '../services/checkoutService';
import { orderService } from '../services/orderService';
import { paymentService } from '../services/paymentService';
import { IAddress, ICoupon, ICheckoutPreview } from '../types/phase3';

export const CheckoutPage: React.FC = () => {
  const navigate = useNavigate();
  const { cartItems, totalItems, refreshCart } = useCart();

  const [addresses, setAddresses] = useState<IAddress[]>([]);
  const [selectedAddressId, setSelectedAddressId] = useState<string>('');
  const [activeCoupons, setActiveCoupons] = useState<ICoupon[]>([]);
  const [couponInput, setCouponInput] = useState<string>('');
  const [appliedCouponCode, setAppliedCouponCode] = useState<string>('');
  const [couponMessage, setCouponMessage] = useState<{ text: string; isError: boolean } | null>(null);

  const [preview, setPreview] = useState<ICheckoutPreview | null>(null);
  const [isLoadingPreview, setIsLoadingPreview] = useState<boolean>(true);
  const [isSubmittingCoupon, setIsSubmittingCoupon] = useState<boolean>(false);

  // Phase 4: Payment Method and Order Placement State
  const [paymentMethod, setPaymentMethod] = useState<'ONLINE' | 'COD'>('ONLINE');
  const [isPlacingOrder, setIsPlacingOrder] = useState<boolean>(false);
  const [orderError, setOrderError] = useState<string | null>(null);

  // Address modal states
  const [isAddressModalOpen, setIsAddressModalOpen] = useState(false);
  const [editingAddress, setEditingAddress] = useState<IAddress | null>(null);
  const [addressForm, setAddressForm] = useState({
    fullName: '',
    phone: '',
    houseNo: '',
    street: '',
    area: '',
    landmark: '',
    city: 'Hyderabad',
    state: 'Telangana',
    pincode: '500001',
    type: 'HOME' as 'HOME' | 'WORK' | 'OTHER',
    isDefault: false,
  });
  const [addressError, setAddressError] = useState<string | null>(null);
  const [isSavingAddress, setIsSavingAddress] = useState(false);

  const isAuthenticated = !!localStorage.getItem('pt_access_token');

  // Load addresses & active coupons
  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login?redirect=/checkout');
      return;
    }

    const loadInitialData = async () => {
      try {
        const [addrList, couponsList] = await Promise.all([
          addressService.getAddresses(),
          couponService.getActiveCoupons(),
        ]);

        setAddresses(addrList);
        if (addrList.length > 0) {
          const defaultAddr = addrList.find((a) => a.isDefault) || addrList[0];
          setSelectedAddressId(defaultAddr.id || defaultAddr._id!);
        }
        setActiveCoupons(couponsList);
      } catch (e) {
        console.warn('Failed to load checkout initial data', e);
      }
    };

    loadInitialData();
  }, [isAuthenticated, navigate]);

  // Recalculate checkout preview from backend
  const fetchPreview = useCallback(async () => {
    if (!selectedAddressId || cartItems.length === 0) {
      setIsLoadingPreview(false);
      return;
    }

    try {
      setIsLoadingPreview(true);
      const data = await checkoutService.getCheckoutPreview(
        selectedAddressId,
        appliedCouponCode || undefined
      );
      setPreview(data);
    } catch (err: any) {
      console.warn('Checkout preview error', err);
    } finally {
      setIsLoadingPreview(false);
    }
  }, [selectedAddressId, appliedCouponCode, cartItems.length]);

  useEffect(() => {
    fetchPreview();
  }, [fetchPreview]);

  // Handle coupon apply
  const handleApplyCoupon = async (codeToApply?: string) => {
    const code = (codeToApply || couponInput).trim().toUpperCase();
    if (!code) {
      setCouponMessage({ text: 'Please enter a coupon code.', isError: true });
      return;
    }

    try {
      setIsSubmittingCoupon(true);
      setCouponMessage(null);
      const res = await couponService.validateCoupon(
        code,
        preview?.pricing.itemsSubtotalPaise || 0
      );

      if (res.valid) {
        setAppliedCouponCode(code);
        setCouponInput('');
        setCouponMessage({ text: res.message, isError: false });
      } else {
        setCouponMessage({ text: res.message, isError: true });
      }
    } catch (err: any) {
      setCouponMessage({
        text: err.response?.data?.message || 'Failed to validate coupon code.',
        isError: true,
      });
    } finally {
      setIsSubmittingCoupon(false);
    }
  };

  const handleRemoveCoupon = () => {
    setAppliedCouponCode('');
    setCouponMessage(null);
  };

  // Open Add/Edit Address Modal
  const openAddressModal = (addr?: IAddress) => {
    if (addr) {
      setEditingAddress(addr);
      setAddressForm({
        fullName: addr.fullName,
        phone: addr.phone,
        houseNo: addr.houseNo || '',
        street: addr.street || '',
        area: addr.area || '',
        landmark: addr.landmark || '',
        city: addr.city || 'Hyderabad',
        state: addr.state || 'Telangana',
        pincode: addr.pincode,
        type: addr.type || 'HOME',
        isDefault: addr.isDefault,
      });
    } else {
      setEditingAddress(null);
      setAddressForm({
        fullName: '',
        phone: '',
        houseNo: '',
        street: '',
        area: '',
        landmark: '',
        city: 'Hyderabad',
        state: 'Telangana',
        pincode: '500001',
        type: 'HOME',
        isDefault: addresses.length === 0,
      });
    }
    setAddressError(null);
    setIsAddressModalOpen(true);
  };

  // Save Address
  const handleSaveAddress = async (e: React.FormEvent) => {
    e.preventDefault();
    setAddressError(null);

    if (!addressForm.fullName.trim() || !addressForm.phone.trim() || !addressForm.pincode.trim()) {
      setAddressError('Full Name, Mobile Number, and PIN Code are required.');
      return;
    }

    if (!/^[6-9]\d{9}$/.test(addressForm.phone.replace(/[\s\-\+]/g, ''))) {
      setAddressError('Please enter a valid 10-digit Indian mobile number.');
      return;
    }

    if (!/^[1-9][0-9]{5}$/.test(addressForm.pincode.trim())) {
      setAddressError('Please enter a valid 6-digit Indian PIN code (e.g. 500001).');
      return;
    }

    try {
      setIsSavingAddress(true);
      if (editingAddress) {
        const updated = await addressService.updateAddress(
          editingAddress.id || editingAddress._id!,
          addressForm
        );
        setAddresses((prev) =>
          prev.map((a) => ((a.id || a._id) === (updated.id || updated._id) ? updated : a))
        );
      } else {
        const created = await addressService.createAddress(addressForm);
        setAddresses((prev) => [created, ...prev]);
        setSelectedAddressId(created.id || created._id!);
      }
      setIsAddressModalOpen(false);
    } catch (err: any) {
      setAddressError(err.response?.data?.message || 'Failed to save address.');
    } finally {
      setIsSavingAddress(false);
    }
  };

  // Delete Address
  const handleDeleteAddress = async (addrId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm('Are you sure you want to delete this delivery address?')) return;

    try {
      await addressService.deleteAddress(addrId);
      const remaining = addresses.filter((a) => (a.id || a._id) !== addrId);
      setAddresses(remaining);
      if (selectedAddressId === addrId) {
        setSelectedAddressId(remaining[0]?.id || remaining[0]?._id || '');
      }
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to delete address.');
    }
  };

  const handlePlaceOrder = async () => {
    if (!selectedAddressId || !preview?.canProceedToPayment) return;

    try {
      setIsPlacingOrder(true);
      setOrderError(null);

      const res = await orderService.createOrder({
        addressId: selectedAddressId,
        paymentMethod,
        couponCode: appliedCouponCode || undefined,
      });

      const order = res.order;
      const orderId = order.id || (order as any)._id;

      if (paymentMethod === 'COD') {
        await refreshCart();
        navigate(`/order-confirmation/${orderId}`);
      } else {
        // Initiate PhonePe Payment
        const returnUrl = `${window.location.origin}/payment/callback?orderId=${orderId}`;
        const initRes = await paymentService.initiatePhonePePayment({
          orderId,
          returnUrl,
        });

        if (initRes.redirectUrl) {
          window.location.href = initRes.redirectUrl;
        } else {
          navigate(`/payment/callback?orderId=${orderId}`);
        }
      }
    } catch (err: any) {
      setOrderError(
        err.response?.data?.message || 'Failed to place order. Please review your cart and try again.'
      );
      setIsPlacingOrder(false);
    }
  };

  if (cartItems.length === 0) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center py-16 px-4">
        <div className="max-w-md w-full text-center bg-white rounded-3xl p-8 border border-gray-100 shadow-sm">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Cart is empty</h2>
          <p className="text-gray-500 text-sm mb-6">You need items in your cart to checkout.</p>
          <Link
            to="/"
            className="inline-flex items-center justify-center gap-2 w-full py-3 px-6 rounded-xl bg-emerald-600 text-white font-semibold"
          >
            Go to Store
          </Link>
        </div>
      </div>
    );
  }

  const selectedAddress = addresses.find((a) => (a.id || a._id) === selectedAddressId);

  return (
    <div className="min-h-screen bg-gray-50/50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        {/* Navigation & Header */}
        <div className="flex items-center gap-4 mb-6">
          <Link
            to="/cart"
            className="p-2 rounded-xl bg-white border border-gray-200 text-gray-600 hover:text-emerald-600 hover:border-emerald-600 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900">Checkout Preview</h1>
            <p className="text-sm text-gray-500">
              City-Wide Delivery Hub • Express Delivery within 30-45 Mins
            </p>
          </div>
        </div>

        {/* Phase 3 Informational Banner */}
        <div className="mb-6 p-4 rounded-2xl bg-gradient-to-r from-emerald-900 to-emerald-800 text-white shadow-sm flex items-start sm:items-center gap-3">
          <ShieldCheck className="w-6 h-6 text-emerald-300 flex-shrink-0 mt-0.5 sm:mt-0" />
          <div className="text-xs sm:text-sm">
            <span className="font-bold text-emerald-200 uppercase tracking-wide">
              Phase 3 Checkout Verification Active:
            </span>{' '}
            Prices, delivery serviceability for your PIN code, inventory levels, and coupons are verified by the backend. Payment gateway and live order dispatch will be enabled in Phase 4.
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column: Address Selection & Coupons */}
          <div className="lg:col-span-2 space-y-6">
            {/* Step 1: Delivery Address Selection */}
            <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center font-extrabold text-sm">
                    1
                  </div>
                  <h2 className="text-lg font-bold text-gray-900">Delivery Address</h2>
                </div>
                <button
                  onClick={() => openAddressModal()}
                  className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 px-3 py-1.5 rounded-xl transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Add New Address
                </button>
              </div>

              {addresses.length === 0 ? (
                <div className="text-center py-8 border-2 border-dashed border-gray-200 rounded-2xl p-6">
                  <MapPin className="w-10 h-10 text-gray-400 mx-auto mb-2" />
                  <p className="text-sm font-semibold text-gray-800">No saved delivery addresses found</p>
                  <p className="text-xs text-gray-500 mt-1 mb-4">
                    Add your residence or office address to verify delivery serviceability.
                  </p>
                  <button
                    onClick={() => openAddressModal()}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 text-white font-semibold text-xs shadow-md shadow-emerald-600/20"
                  >
                    <Plus className="w-4 h-4" />
                    Add Address Now
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  {addresses.map((addr) => {
                    const id = (addr.id || addr._id)!;
                    const isSelected = selectedAddressId === id;

                    return (
                      <div
                        key={id}
                        onClick={() => setSelectedAddressId(id)}
                        className={`p-4 rounded-2xl border-2 transition-all cursor-pointer relative ${
                          isSelected
                            ? 'border-emerald-600 bg-emerald-50/30'
                            : 'border-gray-200 hover:border-gray-300 bg-white'
                        }`}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex items-start gap-3">
                            <input
                              type="radio"
                              name="deliveryAddress"
                              checked={isSelected}
                              onChange={() => setSelectedAddressId(id)}
                              className="mt-1 text-emerald-600 focus:ring-emerald-500 h-4 w-4"
                            />
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="font-bold text-gray-900 text-sm">{addr.fullName}</span>
                                <span className="text-[10px] font-extrabold uppercase bg-gray-100 text-gray-700 px-2 py-0.5 rounded">
                                  {addr.type || 'HOME'}
                                </span>
                                {addr.isDefault && (
                                  <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded">
                                    Default
                                  </span>
                                )}
                              </div>
                              <p className="text-xs text-gray-600 mt-1">{addr.streetAddress}</p>
                              <p className="text-xs text-gray-500 mt-0.5">
                                {addr.city}, {addr.state} — <span className="font-semibold text-gray-800">PIN: {addr.pincode}</span>
                              </p>
                              <p className="text-xs text-gray-500 mt-0.5">Phone: {addr.phone}</p>
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                openAddressModal(addr);
                              }}
                              className="p-1.5 text-gray-400 hover:text-emerald-700 rounded-lg hover:bg-gray-100"
                              title="Edit address"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={(e) => handleDeleteAddress(id, e)}
                              className="p-1.5 text-gray-400 hover:text-rose-600 rounded-lg hover:bg-gray-100"
                              title="Delete address"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Live Serviceability Feedback on Selected Address */}
              {selectedAddress && preview?.serviceability && (
                <div
                  className={`mt-4 p-3.5 rounded-xl border flex items-center gap-3 text-xs ${
                    preview.serviceability.isServiceable
                      ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                      : 'bg-rose-50 border-rose-200 text-rose-800'
                  }`}
                >
                  {preview.serviceability.isServiceable ? (
                    <>
                      <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />
                      <div>
                        <span className="font-bold">Serviceable Area: </span>
                        {preview.serviceability.message}
                      </div>
                    </>
                  ) : (
                    <>
                      <AlertCircle className="w-5 h-5 text-rose-600 flex-shrink-0" />
                      <div>
                        <span className="font-bold">Not Serviceable: </span>
                        {preview.serviceability.message}
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>

            {/* Step 2: Promotional Coupon Code */}
            <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center font-extrabold text-sm">
                  2
                </div>
                <h2 className="text-lg font-bold text-gray-900">Promotions & Coupons</h2>
              </div>

              {appliedCouponCode ? (
                <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Tag className="w-5 h-5 text-emerald-600" />
                    <div>
                      <span className="font-extrabold text-emerald-800 text-sm">
                        {appliedCouponCode} APPLIED
                      </span>
                      <p className="text-xs text-emerald-700 mt-0.5">
                        You saved {preview?.pricing.couponDiscountFormatted} on this order!
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={handleRemoveCoupon}
                    className="text-xs font-bold text-rose-600 hover:text-rose-800 hover:underline px-2 py-1"
                  >
                    Remove
                  </button>
                </div>
              ) : (
                <div>
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <input
                        type="text"
                        placeholder="Enter coupon code (e.g. WELCOME100)"
                        value={couponInput}
                        onChange={(e) => setCouponInput(e.target.value)}
                        className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 uppercase font-semibold text-sm"
                      />
                    </div>
                    <button
                      onClick={() => handleApplyCoupon()}
                      disabled={isSubmittingCoupon || !couponInput.trim()}
                      className="px-6 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:bg-gray-200 disabled:text-gray-400 text-white font-bold text-sm transition-colors shadow-md shadow-emerald-600/20"
                    >
                      {isSubmittingCoupon ? 'Checking...' : 'Apply'}
                    </button>
                  </div>

                  {couponMessage && (
                    <div
                      className={`mt-2.5 text-xs font-semibold flex items-center gap-1.5 ${
                        couponMessage.isError ? 'text-rose-600' : 'text-emerald-700'
                      }`}
                    >
                      {couponMessage.isError ? (
                        <AlertCircle className="w-4 h-4" />
                      ) : (
                        <CheckCircle2 className="w-4 h-4" />
                      )}
                      <span>{couponMessage.text}</span>
                    </div>
                  )}

                  {/* Active available coupons chips */}
                  {activeCoupons.length > 0 && (
                    <div className="mt-4 pt-4 border-t border-gray-100">
                      <span className="text-xs font-bold text-gray-500 uppercase tracking-wider block mb-2">
                        Available Coupons:
                      </span>
                      <div className="flex flex-wrap gap-2">
                        {activeCoupons.map((c) => (
                          <button
                            key={c.code}
                            onClick={() => handleApplyCoupon(c.code)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-dashed border-emerald-400 bg-emerald-50/50 hover:bg-emerald-100/50 text-emerald-800 text-xs font-bold transition-colors"
                          >
                            <Tag className="w-3 h-3 text-emerald-600" />
                            <span>{c.code}</span>
                            <span className="text-[10px] text-gray-500 font-normal">
                              ({c.discountType === 'PERCENTAGE' ? `${c.discountValue}%` : `₹${c.discountValue / 100}`})
                            </span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Step 3: Cart Items Preview */}
            <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center font-extrabold text-sm">
                    3
                  </div>
                  <h2 className="text-lg font-bold text-gray-900">
                    Grocery Items ({totalItems})
                  </h2>
                </div>
                <Link to="/cart" className="text-xs font-bold text-emerald-600 hover:underline">
                  Edit Cart
                </Link>
              </div>

              <div className="divide-y divide-gray-100 max-h-64 overflow-y-auto pr-1">
                {cartItems.map((item) => {
                  const p = item.product;
                  const price = p.discountedPrice ?? p.price;
                  return (
                    <div key={(p.id || p._id)!} className="py-2.5 flex items-center justify-between gap-3 text-sm">
                      <div className="flex items-center gap-3 min-w-0">
                        <img
                          src={p.images?.[0] || 'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=100&q=80'}
                          alt={p.name}
                          className="w-10 h-10 object-cover rounded-lg border border-gray-100 flex-shrink-0"
                        />
                        <div className="min-w-0">
                          <p className="font-semibold text-gray-900 truncate text-xs sm:text-sm">{p.name}</p>
                          <p className="text-[11px] text-gray-500">{p.unit} × {item.quantity}</p>
                        </div>
                      </div>
                      <span className="font-bold text-gray-900 flex-shrink-0 text-sm">
                        ₹{(price * item.quantity).toFixed(0)}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Right Column: Checkout Breakdown */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm sticky top-24">
              <h2 className="text-lg font-bold text-gray-900 mb-4">Payment Summary</h2>

              {isLoadingPreview ? (
                <div className="py-8 text-center text-sm text-gray-500">
                  Calculating verified store breakdown...
                </div>
              ) : preview ? (
                <>
                  <div className="space-y-3 text-sm border-b border-gray-100 pb-4">
                    <div className="flex justify-between text-gray-600">
                      <span>Items MRP Total</span>
                      <span className="font-semibold text-gray-900">
                        {preview.pricing.itemsRegularTotalFormatted}
                      </span>
                    </div>

                    {preview.pricing.productSavingsPaise > 0 && (
                      <div className="flex justify-between text-emerald-600 font-medium">
                        <span>Store Discount</span>
                        <span>- {preview.pricing.productSavingsFormatted}</span>
                      </div>
                    )}

                    <div className="flex justify-between text-gray-600">
                      <span>Subtotal</span>
                      <span className="font-semibold text-gray-900">
                        {preview.pricing.itemsSubtotalFormatted}
                      </span>
                    </div>

                    {preview.pricing.couponDiscountPaise > 0 && (
                      <div className="flex justify-between text-emerald-600 font-semibold">
                        <span>Coupon Savings ({preview.pricing.appliedCoupon?.code})</span>
                        <span>- {preview.pricing.couponDiscountFormatted}</span>
                      </div>
                    )}

                    <div className="flex justify-between text-gray-600">
                      <span>Delivery Fee</span>
                      {preview.pricing.isFreeDelivery ? (
                        <span className="text-emerald-600 font-bold uppercase text-xs bg-emerald-50 px-2 py-0.5 rounded">
                          FREE
                        </span>
                      ) : (
                        <span className="font-semibold text-gray-900">
                          {preview.pricing.deliveryChargeFormatted}
                        </span>
                      )}
                    </div>

                    <div className="flex justify-between text-gray-600">
                      <span>Eco Packaging Fee</span>
                      <span className="font-semibold text-gray-900">
                        {preview.pricing.packagingChargeFormatted}
                      </span>
                    </div>
                  </div>

                  {/* Final Total */}
                  <div className="pt-4 mb-6">
                    <div className="flex justify-between items-baseline">
                      <span className="text-base font-bold text-gray-900">Final Total Payable</span>
                      <span className="text-2xl font-extrabold text-emerald-700">
                        {preview.pricing.totalPayableFormatted}
                      </span>
                    </div>
                    {preview.pricing.totalOverallSavingsPaise > 0 && (
                      <p className="text-xs text-emerald-600 font-bold mt-1">
                        🎉 Total Savings: {preview.pricing.totalOverallSavingsFormatted}
                      </p>
                    )}
                  </div>

                  {/* Payment Method Selection */}
                  <div className="mb-6 pt-2">
                    <h4 className="text-xs font-bold text-gray-800 uppercase tracking-wider mb-2.5">
                      Select Payment Mode
                    </h4>

                    <div className="grid grid-cols-1 gap-2.5">
                      {/* PhonePe Option */}
                      <label
                        onClick={() => setPaymentMethod('ONLINE')}
                        className={`p-3.5 rounded-2xl border-2 flex items-center justify-between cursor-pointer transition-all ${
                          paymentMethod === 'ONLINE'
                            ? 'border-emerald-600 bg-emerald-50/60 shadow-sm'
                            : 'border-gray-200 bg-white hover:border-gray-300'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div
                            className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                              paymentMethod === 'ONLINE'
                                ? 'border-emerald-600 bg-emerald-600'
                                : 'border-gray-400'
                            }`}
                          >
                            {paymentMethod === 'ONLINE' && (
                              <div className="w-1.5 h-1.5 rounded-full bg-white" />
                            )}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-bold text-gray-900">
                                PhonePe Payment Gateway
                              </span>
                              <span className="text-[10px] font-bold bg-emerald-100 text-emerald-800 px-1.5 py-0.5 rounded border border-emerald-200">
                                Recommended
                              </span>
                            </div>
                            <p className="text-[11px] text-gray-500 mt-0.5">
                              UPI, Google Pay, PhonePe, Cards & Net Banking
                            </p>
                          </div>
                        </div>
                        <CreditCard className="w-5 h-5 text-emerald-600 shrink-0" />
                      </label>

                      {/* Cash on Delivery Option */}
                      <label
                        onClick={() => setPaymentMethod('COD')}
                        className={`p-3.5 rounded-2xl border-2 flex items-center justify-between cursor-pointer transition-all ${
                          paymentMethod === 'COD'
                            ? 'border-emerald-600 bg-emerald-50/60 shadow-sm'
                            : 'border-gray-200 bg-white hover:border-gray-300'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div
                            className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                              paymentMethod === 'COD'
                                ? 'border-emerald-600 bg-emerald-600'
                                : 'border-gray-400'
                            }`}
                          >
                            {paymentMethod === 'COD' && (
                              <div className="w-1.5 h-1.5 rounded-full bg-white" />
                            )}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-bold text-gray-900">
                                Cash on Delivery (COD)
                              </span>
                              <span className="text-[10px] font-semibold bg-gray-100 text-gray-700 px-1.5 py-0.5 rounded">
                                Doorstep
                              </span>
                            </div>
                            <p className="text-[11px] text-gray-500 mt-0.5">
                              Pay with exact cash or UPI QR to driver at delivery
                            </p>
                          </div>
                        </div>
                        <Banknote className="w-5 h-5 text-gray-500 shrink-0" />
                      </label>
                    </div>
                  </div>

                  {/* Order Placement Error */}
                  {orderError && (
                    <div className="mb-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0" />
                      <span>{orderError}</span>
                    </div>
                  )}

                  {/* Validation Alerts */}
                  {preview.validationIssues.length > 0 && (
                    <div className="mb-4 p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs space-y-1">
                      {preview.validationIssues.map((issue, idx) => (
                        <div key={idx} className="flex items-start gap-1.5">
                          <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                          <span>{issue}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Live Place Order Button */}
                  <button
                    onClick={handlePlaceOrder}
                    disabled={!preview.canProceedToPayment || isPlacingOrder}
                    className={`w-full py-4 px-6 rounded-2xl font-bold flex items-center justify-center gap-2 transition-all shadow-lg ${
                      preview.canProceedToPayment && !isPlacingOrder
                        ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-600/25'
                        : 'bg-gray-200 text-gray-500 cursor-not-allowed shadow-none'
                    }`}
                  >
                    {isPlacingOrder ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        <span>Processing Order...</span>
                      </>
                    ) : (
                      <>
                        <span>
                          {paymentMethod === 'ONLINE'
                            ? `Pay via PhonePe (${preview.pricing.totalPayableFormatted})`
                            : `Confirm COD Order (${preview.pricing.totalPayableFormatted})`}
                        </span>
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </button>

                  <p className="text-[11px] text-gray-400 text-center mt-3 leading-relaxed">
                    Official PhonePe Merchant Gateway • 256-Bit SSL Encrypted Checkout
                  </p>
                </>
              ) : (
                <div className="text-sm text-gray-500">Select an address to view pricing breakdown.</div>
              )}

              {/* Delivery Assurance */}
              <div className="mt-6 pt-5 border-t border-gray-100 space-y-2 text-xs text-gray-500">
                <div className="flex items-center gap-2">
                  <Truck className="w-4 h-4 text-emerald-600" />
                  <span>City-Wide Delivery: Express 30-45 minutes</span>
                </div>
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  <span>100% Quality & Hygiene Inspected</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Add / Edit Address Modal */}
      {isAddressModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl relative max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setIsAddressModalOpen(false)}
              className="absolute top-6 right-6 p-2 rounded-full text-gray-400 hover:text-gray-600 hover:bg-gray-100"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-xl font-bold text-gray-900 mb-1">
              {editingAddress ? 'Edit Delivery Address' : 'Add Delivery Address'}
            </h3>
            <p className="text-xs text-gray-500 mb-6">
              Enter your complete address details for city-wide express grocery delivery.
            </p>

            {addressError && (
              <div className="mb-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0" />
                <span>{addressError}</span>
              </div>
            )}

            <form onSubmit={handleSaveAddress} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Full Name *</label>
                  <input
                    type="text"
                    required
                    value={addressForm.fullName}
                    onChange={(e) => setAddressForm({ ...addressForm, fullName: e.target.value })}
                    placeholder="Ramesh Patel"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Mobile Number *</label>
                  <input
                    type="tel"
                    required
                    value={addressForm.phone}
                    onChange={(e) => setAddressForm({ ...addressForm, phone: e.target.value })}
                    placeholder="9876543210"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">House / Flat No.</label>
                  <input
                    type="text"
                    value={addressForm.houseNo}
                    onChange={(e) => setAddressForm({ ...addressForm, houseNo: e.target.value })}
                    placeholder="Flat 302"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-gray-700 mb-1">Street / Apartment</label>
                  <input
                    type="text"
                    value={addressForm.street}
                    onChange={(e) => setAddressForm({ ...addressForm, street: e.target.value })}
                    placeholder="Sai Residency, 4th Cross"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Area / Locality</label>
                  <input
                    type="text"
                    value={addressForm.area}
                    onChange={(e) => setAddressForm({ ...addressForm, area: e.target.value })}
                    placeholder="Abids / Central Zone"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Landmark (Optional)</label>
                  <input
                    type="text"
                    value={addressForm.landmark}
                    onChange={(e) => setAddressForm({ ...addressForm, landmark: e.target.value })}
                    placeholder="Near GPO"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">PIN Code *</label>
                  <input
                    type="text"
                    required
                    maxLength={6}
                    value={addressForm.pincode}
                    onChange={(e) => setAddressForm({ ...addressForm, pincode: e.target.value })}
                    placeholder="500001"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">City</label>
                  <input
                    type="text"
                    value={addressForm.city}
                    onChange={(e) => setAddressForm({ ...addressForm, city: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">State</label>
                  <input
                    type="text"
                    value={addressForm.state}
                    onChange={(e) => setAddressForm({ ...addressForm, state: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>
              </div>

              {/* Address Tag Selection */}
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-2">Address Type</label>
                <div className="flex gap-3">
                  {(['HOME', 'WORK', 'OTHER'] as const).map((tag) => (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => setAddressForm({ ...addressForm, type: tag })}
                      className={`flex-1 py-2 rounded-xl text-xs font-bold border transition-colors ${
                        addressForm.type === tag
                          ? 'border-emerald-600 bg-emerald-50 text-emerald-800'
                          : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                      }`}
                    >
                      {tag}
                    </button>
                  ))}
                </div>
              </div>

              {/* Set as default checkbox */}
              <label className="flex items-center gap-2 cursor-pointer pt-2">
                <input
                  type="checkbox"
                  checked={addressForm.isDefault}
                  onChange={(e) => setAddressForm({ ...addressForm, isDefault: e.target.checked })}
                  className="rounded text-emerald-600 focus:ring-emerald-500 h-4 w-4"
                />
                <span className="text-xs text-gray-700 font-medium">Set as default delivery address</span>
              </label>

              <div className="pt-4 flex gap-3">
                <button
                  type="button"
                  onClick={() => setIsAddressModalOpen(false)}
                  className="flex-1 py-3 rounded-xl border border-gray-200 text-gray-700 font-bold text-sm hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSavingAddress}
                  className="flex-1 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm shadow-md shadow-emerald-600/20"
                >
                  {isSavingAddress ? 'Saving...' : 'Save Address'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
