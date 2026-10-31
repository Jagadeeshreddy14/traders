import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  CheckCircle2,
  Package,
  MapPin,
  FileText,
  ArrowRight,
  Clock,
  Printer,
} from 'lucide-react';
import { orderService } from '../services/orderService';
import { IOrder } from '../types/phase4';

export const OrderConfirmationPage: React.FC = () => {
  const { orderId } = useParams<{ orderId: string }>();
  const [order, setOrder] = useState<IOrder | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchOrder = async () => {
      if (!orderId) return;
      try {
        setLoading(true);
        const data = await orderService.getOrderById(orderId);
        setOrder(data);
      } catch (err: any) {
        setError(err.response?.data?.message || 'Failed to load order confirmation details.');
      } finally {
        setLoading(false);
      }
    };
    fetchOrder();
  }, [orderId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="text-center space-y-3">
          <div className="w-10 h-10 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-sm font-semibold text-slate-600">Loading order confirmation...</p>
        </div>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl p-8 max-w-md w-full shadow-lg text-center space-y-4">
          <h2 className="text-lg font-bold text-slate-800">Order Not Found</h2>
          <p className="text-xs text-slate-500">{error || 'Unable to retrieve order details.'}</p>
          <Link
            to="/"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 text-white font-bold text-xs"
          >
            Go to Homepage
          </Link>
        </div>
      </div>
    );
  }

  const isPaid = order.paymentStatus === 'PAID' || order.paymentStatus === 'SUCCESS';
  const isCod = order.paymentMethod === 'COD';

  return (
    <div className="min-h-screen bg-slate-50 py-10 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto space-y-6">
        {/* Success Header Banner */}
        <div className="bg-white rounded-3xl p-8 shadow-sm border border-slate-100 text-center relative overflow-hidden">
          <div className="w-20 h-20 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 className="w-12 h-12" />
          </div>

          <span className="text-[11px] font-bold text-emerald-600 uppercase tracking-widest bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200">
            {isCod ? 'Order Placed (Cash on Delivery)' : isPaid ? 'Order Confirmed & Paid' : 'Payment Awaiting Confirmation'}
          </span>

          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 mt-3">
            Thank you for your order!
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Order Reference: <span className="font-mono font-extrabold text-slate-800">#{order.orderNumber}</span>
          </p>

          <div className="mt-6 inline-flex items-center gap-2 bg-slate-50 border border-slate-200 px-4 py-2 rounded-2xl text-xs text-slate-600">
            <Clock className="w-4 h-4 text-emerald-600" />
            <span>Estimated Delivery: <strong>25 - 40 mins</strong> to {order.deliveryAddress.city}</span>
          </div>

          <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
            <a
              href={`http://localhost:5000/api/v1/orders/${order.id}/invoice/html`}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-bold transition-colors"
            >
              <Printer className="w-4 h-4 text-emerald-600" />
              <span>Print Tax Invoice</span>
            </a>
            <Link
              to="/orders"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-md shadow-emerald-600/20 transition-all"
            >
              <span>View Order History</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>

        {/* Order Details Breakdown Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Delivery Address Card */}
          <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100 space-y-3">
            <h3 className="text-xs font-extrabold text-slate-400 uppercase tracking-wider flex items-center gap-2">
              <MapPin className="w-4 h-4 text-emerald-600" />
              Delivery Destination
            </h3>
            <div>
              <p className="font-bold text-slate-900 text-sm">{order.deliveryAddress.recipientName}</p>
              <p className="text-xs text-slate-600 mt-1">{order.deliveryAddress.streetAddress}</p>
              {order.deliveryAddress.landmark && (
                <p className="text-xs text-slate-500">Landmark: {order.deliveryAddress.landmark}</p>
              )}
              <p className="text-xs font-semibold text-slate-700 mt-0.5">
                {order.deliveryAddress.city}, {order.deliveryAddress.state} - {order.deliveryAddress.postalCode}
              </p>
              <p className="text-xs text-slate-500 mt-1">Phone: {order.deliveryAddress.recipientPhone}</p>
            </div>
          </div>

          {/* Payment & Status Card */}
          <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100 space-y-3">
            <h3 className="text-xs font-extrabold text-slate-400 uppercase tracking-wider flex items-center gap-2">
              <FileText className="w-4 h-4 text-emerald-600" />
              Payment Summary
            </h3>
            <div className="space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-500">Payment Method:</span>
                <span className="font-bold text-slate-800">
                  {order.paymentMethod === 'COD' ? 'Cash on Delivery' : 'PhonePe Online Gateway'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Payment Status:</span>
                <span
                  className={`font-bold px-2 py-0.5 rounded ${
                    isPaid ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
                  }`}
                >
                  {order.paymentStatus}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Order Status:</span>
                <span className="font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-800">
                  {order.orderStatus}
                </span>
              </div>
              <div className="flex justify-between pt-2 border-t border-slate-100">
                <span className="font-bold text-slate-700">Total Amount:</span>
                <span className="font-extrabold text-emerald-700 text-sm">
                  ₹{(order.finalAmount / 100).toFixed(2)}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Ordered Basket Items */}
        <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100">
          <h3 className="text-xs font-extrabold text-slate-400 uppercase tracking-wider mb-4 flex items-center gap-2">
            <Package className="w-4 h-4 text-emerald-600" />
            Ordered Groceries ({order.items.length} items)
          </h3>

          <div className="divide-y divide-slate-100">
            {order.items.map((item, index) => (
              <div key={index} className="py-3 flex items-center justify-between gap-4 text-xs">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center font-bold text-emerald-600 shrink-0">
                    {item.quantity}x
                  </div>
                  <div>
                    <p className="font-bold text-slate-800">{item.name}</p>
                    <p className="text-[11px] text-slate-400">{item.unit}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-extrabold text-slate-900">₹{(item.totalUnitPrice / 100).toFixed(2)}</p>
                  <p className="text-[10px] text-slate-400">₹{(item.unitPrice / 100).toFixed(2)} each</p>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-4 pt-4 border-t border-slate-100 space-y-1.5 text-xs">
            <div className="flex justify-between text-slate-500">
              <span>Items Subtotal:</span>
              <span>₹{(order.totalAmount / 100).toFixed(2)}</span>
            </div>
            {order.discountAmount > 0 && (
              <div className="flex justify-between text-emerald-600 font-semibold">
                <span>Coupon Discount ({order.couponCode}):</span>
                <span>-₹{(order.discountAmount / 100).toFixed(2)}</span>
              </div>
            )}
            <div className="flex justify-between text-slate-500">
              <span>Delivery Fee:</span>
              <span>{order.deliveryFee === 0 ? 'FREE' : `₹${(order.deliveryFee / 100).toFixed(2)}`}</span>
            </div>
            <div className="flex justify-between text-slate-500">
              <span>Packaging Fee:</span>
              <span>₹{(order.packagingFee / 100).toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-slate-900 font-extrabold text-sm pt-2 border-t border-slate-100">
              <span>Grand Total:</span>
              <span className="text-emerald-700">₹{(order.finalAmount / 100).toFixed(2)}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
