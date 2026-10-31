import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { CheckCircle2, XCircle, Clock, ArrowRight, RefreshCw } from 'lucide-react';
import { paymentService } from '../services/paymentService';
import { useCart } from '../context/CartContext';

export const PaymentCallbackPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { refreshCart } = useCart();

  const orderId = searchParams.get('orderId') || '';
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<'PENDING' | 'SUCCESS' | 'FAILED'>('PENDING');
  const [orderData, setOrderData] = useState<any>(null);
  const [errorMessage, setErrorMessage] = useState<string>('');

  const checkStatus = async () => {
    if (!orderId) {
      setStatus('FAILED');
      setErrorMessage('Missing order identification reference.');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const res = await paymentService.checkPaymentStatus(orderId);
      setOrderData(res.order);

      if (res.order.paymentStatus === 'PAID' || res.order.paymentStatus === 'SUCCESS') {
        setStatus('SUCCESS');
        await refreshCart();
      } else if (res.order.paymentStatus === 'FAILED' || res.order.orderStatus === 'PAYMENT_FAILED') {
        setStatus('FAILED');
        setErrorMessage('Payment was declined or cancelled.');
      } else {
        setStatus('PENDING');
      }
    } catch (err: any) {
      setStatus('FAILED');
      setErrorMessage(err.response?.data?.message || 'Failed to verify transaction status.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    checkStatus();
  }, [orderId]);

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl max-w-md w-full p-8 shadow-xl border border-slate-100 text-center">
        {loading ? (
          <div className="py-12 space-y-4">
            <RefreshCw className="w-12 h-12 text-emerald-600 animate-spin mx-auto" />
            <h2 className="text-xl font-bold text-slate-800">Verifying Payment...</h2>
            <p className="text-xs text-slate-500 max-w-xs mx-auto">
              Please wait while we confirm your transaction securely with PhonePe Gateway. Do not close or refresh this tab.
            </p>
          </div>
        ) : status === 'SUCCESS' ? (
          <div className="py-6 space-y-5">
            <div className="w-20 h-20 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto shadow-inner">
              <CheckCircle2 className="w-12 h-12" />
            </div>

            <div>
              <span className="text-[11px] font-bold text-emerald-600 tracking-wider uppercase bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
                Payment Received
              </span>
              <h2 className="text-2xl font-extrabold text-slate-900 mt-3">Order Confirmed!</h2>
              <p className="text-xs text-slate-500 mt-1">
                Order <span className="font-mono font-bold text-slate-800">#{orderData?.orderNumber}</span> has been confirmed.
              </p>
            </div>

            <div className="bg-slate-50 rounded-2xl p-4 text-left text-xs space-y-2 border border-slate-100">
              <div className="flex justify-between text-slate-600">
                <span>Amount Paid:</span>
                <span className="font-bold text-slate-900">
                  ₹{orderData?.finalAmount ? (orderData.finalAmount / 100).toFixed(2) : '--'}
                </span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Payment Mode:</span>
                <span className="font-bold text-emerald-600">PhonePe UPI / Net Banking</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Delivery To:</span>
                <span className="font-medium text-slate-900 truncate max-w-[180px]">
                  {orderData?.deliveryAddress?.recipientName} ({orderData?.deliveryAddress?.postalCode})
                </span>
              </div>
            </div>

            <div className="pt-2 space-y-2.5">
              <Link
                to={`/order-confirmation/${orderData?.id || orderId}`}
                className="w-full py-3.5 px-6 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/20 transition-all"
              >
                <span>View Order Details & Invoice</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
              <Link
                to="/"
                className="block text-xs font-semibold text-slate-500 hover:text-slate-800 py-1"
              >
                Continue Shopping
              </Link>
            </div>
          </div>
        ) : status === 'FAILED' ? (
          <div className="py-6 space-y-5">
            <div className="w-20 h-20 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mx-auto shadow-inner">
              <XCircle className="w-12 h-12" />
            </div>

            <div>
              <span className="text-[11px] font-bold text-rose-600 tracking-wider uppercase bg-rose-50 px-2.5 py-1 rounded-full border border-rose-200">
                Payment Incomplete
              </span>
              <h2 className="text-2xl font-extrabold text-slate-900 mt-3">Payment Failed</h2>
              <p className="text-xs text-rose-600 font-medium mt-1">
                {errorMessage || 'Your transaction was not completed.'}
              </p>
              <p className="text-[11px] text-slate-400 mt-1">
                Your cart items remain saved. You can retry payment with PhonePe or switch to Cash on Delivery.
              </p>
            </div>

            <div className="pt-2 space-y-2.5">
              <button
                onClick={() => navigate('/checkout')}
                className="w-full py-3.5 px-6 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/20 transition-all"
              >
                <span>Return to Checkout & Retry</span>
                <ArrowRight className="w-4 h-4" />
              </button>
              <Link
                to="/cart"
                className="block text-xs font-semibold text-slate-500 hover:text-slate-800 py-1"
              >
                Review Shopping Cart
              </Link>
            </div>
          </div>
        ) : (
          <div className="py-6 space-y-5">
            <div className="w-20 h-20 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center mx-auto shadow-inner">
              <Clock className="w-12 h-12" />
            </div>

            <div>
              <span className="text-[11px] font-bold text-amber-600 tracking-wider uppercase bg-amber-50 px-2.5 py-1 rounded-full border border-amber-200">
                Awaiting Bank Confirmation
              </span>
              <h2 className="text-2xl font-extrabold text-slate-900 mt-3">Payment Processing</h2>
              <p className="text-xs text-slate-500 mt-1">
                PhonePe is processing your payment. We will automatically confirm your order as soon as bank approval is received.
              </p>
            </div>

            <div className="pt-2 space-y-2.5">
              <button
                onClick={checkStatus}
                className="w-full py-3.5 px-6 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/20 transition-all"
              >
                <RefreshCw className="w-4 h-4" />
                <span>Refresh Status</span>
              </button>
              <Link
                to="/orders"
                className="block text-xs font-semibold text-slate-500 hover:text-slate-800 py-1"
              >
                View My Orders
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
