import React, { useEffect, useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  SafeAreaView,
} from 'react-native';
import { mobileApi } from '../services/api';
import { IOrder } from '../types';

export const OrderConfirmationScreen = ({ route, navigation }: any) => {
  const { orderId } = route.params || {};
  const [order, setOrder] = useState<IOrder | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchOrder = async () => {
      try {
        if (!orderId) return;
        const res = await mobileApi.get(`/orders/${orderId}`);
        if (res.data?.data?.order) {
          setOrder(res.data.data.order);
        }
      } catch (err) {
        console.warn('Failed to load order confirmation:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchOrder();
  }, [orderId]);

  if (loading) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#059669" />
          <Text style={styles.loadingText}>Fetching order confirmation...</Text>
        </View>
      </SafeAreaView>
    );
  }

  const isCod = order?.paymentMethod === 'CASH_ON_DELIVERY';

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.container}>
        {/* Celebration Banner */}
        <View style={styles.successCard}>
          <View style={styles.successIconBadge}>
            <Text style={styles.successEmoji}>🎉</Text>
          </View>
          <Text style={styles.successTitle}>Order Confirmed!</Text>
          <Text style={styles.successSub}>
            Thank you for shopping with Paven Traders. Your fresh groceries are being prepared.
          </Text>

          <View style={styles.orderIdBadge}>
            <Text style={styles.orderIdText}>{order?.orderNumber || orderId}</Text>
          </View>
          {order?.invoiceNumber ? (
            <Text style={styles.invoiceNumber}>Invoice #{order.invoiceNumber}</Text>
          ) : null}
        </View>

        {/* Delivery Details */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>📍 Delivery Information</Text>
          <Text style={styles.recipientName}>{order?.deliveryAddress?.fullName}</Text>
          <Text style={styles.addressLine}>{order?.deliveryAddress?.streetAddress}</Text>
          <Text style={styles.addressLine}>
            {order?.deliveryAddress?.city} • PIN: {order?.deliveryAddress?.pincode}
          </Text>
          <Text style={styles.phoneLine}>Contact: {order?.deliveryAddress?.phone}</Text>
          <View style={styles.etaBox}>
            <Text style={styles.etaEmoji}>⚡</Text>
            <Text style={styles.etaText}>Estimated Delivery: 30-45 mins (City-Wide Express)</Text>
          </View>
        </View>

        {/* Payment Summary */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>💳 Payment Status</Text>
          <View style={styles.paymentRow}>
            <Text style={styles.paymentMethod}>
              {isCod ? '💵 Cash on Delivery (COD)' : '📱 PhonePe Online Payment'}
            </Text>
            <View style={[styles.statusPill, isCod ? styles.pillAmber : styles.pillGreen]}>
              <Text style={[styles.statusPillText, isCod ? styles.pillTextAmber : styles.pillTextGreen]}>
                {order?.paymentStatus === 'SUCCESS' || order?.paymentStatus === 'PAID'
                  ? 'PAID'
                  : isCod
                  ? 'CASH DUE'
                  : 'PENDING'}
              </Text>
            </View>
          </View>
          {isCod ? (
            <Text style={styles.codHint}>
              Please keep ₹{((order?.pricing?.totalPayablePaise || 0) / 100).toFixed(2)} in exact cash ready for our delivery driver.
            </Text>
          ) : null}
        </View>

        {/* Items Summary */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>🛍️ Order Items ({order?.items?.length || 0})</Text>
          {order?.items?.map((item, index) => (
            <View key={index} style={styles.itemRow}>
              <View style={styles.itemInfo}>
                <Text style={styles.itemName}>{item.productName}</Text>
                <Text style={styles.itemQty}>
                  Qty: {item.quantity} × ₹{item.unitPrice?.toFixed(2)}
                </Text>
              </View>
              <Text style={styles.itemTotal}>₹{item.totalPrice?.toFixed(2)}</Text>
            </View>
          ))}

          <View style={styles.divider} />

          {/* Pricing Totals */}
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Items Subtotal</Text>
            <Text style={styles.totalValue}>
              ₹{((order?.pricing?.itemsSubtotalPaise || 0) / 100).toFixed(2)}
            </Text>
          </View>
          {(order?.pricing?.couponDiscountPaise || 0) > 0 && (
            <View style={styles.totalRow}>
              <Text style={styles.savingsLabel}>Coupon Discount ({order?.couponCode})</Text>
              <Text style={styles.savingsValue}>
                -₹{((order!.pricing.couponDiscountPaise) / 100).toFixed(2)}
              </Text>
            </View>
          )}
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Delivery Fee</Text>
            <Text style={styles.totalValue}>
              ₹{((order?.pricing?.deliveryFeePaise || 0) / 100).toFixed(2)}
            </Text>
          </View>
          <View style={[styles.totalRow, styles.grandTotalRow]}>
            <Text style={styles.grandTotalLabel}>Total Payable</Text>
            <Text style={styles.grandTotalValue}>
              ₹{((order?.pricing?.totalPayablePaise || 0) / 100).toFixed(2)}
            </Text>
          </View>
        </View>

        {/* Buttons */}
        <View style={styles.actionsContainer}>
          <TouchableOpacity
            style={styles.primaryBtn}
            onPress={() => navigation.navigate('Orders')}
          >
            <Text style={styles.primaryBtnText}>View My Orders</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.secondaryBtn}
            onPress={() => navigation.navigate('MainTabs')}
          >
            <Text style={styles.secondaryBtnText}>Continue Shopping</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: '#F3F4F6',
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#4B5563',
    fontWeight: '600',
  },
  container: {
    padding: 16,
    paddingBottom: 40,
  },
  successCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  successIconBadge: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#D1FAE5',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  successEmoji: {
    fontSize: 32,
  },
  successTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#111827',
  },
  successSub: {
    fontSize: 13,
    color: '#6B7280',
    textAlign: 'center',
    marginTop: 6,
    lineHeight: 18,
  },
  orderIdBadge: {
    marginTop: 14,
    backgroundColor: '#ECFDF5',
    borderColor: '#A7F3D0',
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 12,
  },
  orderIdText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#047857',
  },
  invoiceNumber: {
    fontSize: 11,
    color: '#9CA3AF',
    marginTop: 4,
    fontFamily: 'monospace',
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 10,
  },
  recipientName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1F2937',
  },
  addressLine: {
    fontSize: 12,
    color: '#4B5563',
    marginTop: 2,
  },
  phoneLine: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 4,
  },
  etaBox: {
    marginTop: 10,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0FDF4',
    padding: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#DCFCE7',
  },
  etaEmoji: {
    fontSize: 14,
    marginRight: 6,
  },
  etaText: {
    fontSize: 12,
    color: '#15803D',
    fontWeight: '600',
  },
  paymentRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  paymentMethod: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1F2937',
  },
  statusPill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  pillGreen: {
    backgroundColor: '#D1FAE5',
  },
  pillAmber: {
    backgroundColor: '#FEF3C7',
  },
  statusPillText: {
    fontSize: 11,
    fontWeight: '700',
  },
  pillTextGreen: {
    color: '#065F46',
  },
  pillTextAmber: {
    color: '#92400E',
  },
  codHint: {
    marginTop: 8,
    fontSize: 11,
    color: '#B45309',
    backgroundColor: '#FFFBEB',
    padding: 8,
    borderRadius: 8,
  },
  itemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  itemInfo: {
    flex: 1,
  },
  itemName: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1F2937',
  },
  itemQty: {
    fontSize: 11,
    color: '#6B7280',
    marginTop: 2,
  },
  itemTotal: {
    fontSize: 13,
    fontWeight: '700',
    color: '#111827',
  },
  divider: {
    height: 1,
    backgroundColor: '#E5E7EB',
    marginVertical: 10,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 3,
  },
  totalLabel: {
    fontSize: 12,
    color: '#6B7280',
  },
  totalValue: {
    fontSize: 12,
    fontWeight: '600',
    color: '#1F2937',
  },
  savingsLabel: {
    fontSize: 12,
    color: '#059669',
    fontWeight: '600',
  },
  savingsValue: {
    fontSize: 12,
    fontWeight: '700',
    color: '#059669',
  },
  grandTotalRow: {
    marginTop: 6,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  grandTotalLabel: {
    fontSize: 14,
    fontWeight: '800',
    color: '#111827',
  },
  grandTotalValue: {
    fontSize: 16,
    fontWeight: '900',
    color: '#059669',
  },
  actionsContainer: {
    marginTop: 8,
    gap: 10,
  },
  primaryBtn: {
    backgroundColor: '#059669',
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
    shadowColor: '#059669',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 2,
  },
  primaryBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  secondaryBtn: {
    backgroundColor: '#FFFFFF',
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#D1D5DB',
  },
  secondaryBtnText: {
    color: '#374151',
    fontSize: 14,
    fontWeight: '600',
  },
});
