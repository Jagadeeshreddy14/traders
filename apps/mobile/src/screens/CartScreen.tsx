import React from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  Image,
  SafeAreaView,
} from 'react-native';
import { useCart } from '../context/CartContext';

export const CartScreen = ({ navigation }: any) => {
  const {
    cartItems,
    updateQuantity,
    removeFromCart,
    clearCart,
    totalItems,
    totalPrice,
    error,
    clearError,
  } = useCart();

  const freeDeliveryThreshold = 499;
  const isFreeDelivery = totalPrice >= freeDeliveryThreshold;
  const amountNeeded = Math.max(0, freeDeliveryThreshold - totalPrice);
  const deliveryFee = isFreeDelivery ? 0 : 40;
  const packagingFee = 15;
  const grandTotal = totalPrice + deliveryFee + packagingFee;

  const hasOutOfStock = cartItems.some(
    (item) => item.isOutOfStock || (item.product.stockQuantity && item.quantity > item.product.stockQuantity)
  );

  if (cartItems.length === 0) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.emptyContainer}>
          <View style={styles.emptyIconBadge}>
            <Text style={styles.emptyEmoji}>🛒</Text>
          </View>
          <Text style={styles.emptyTitle}>Your cart is empty</Text>
          <Text style={styles.emptySub}>
            Explore farm fresh vegetables, dairy products, and pantry staples.
          </Text>
          <TouchableOpacity
            style={styles.shopNowBtn}
            onPress={() => navigation.navigate('Home')}
          >
            <Text style={styles.shopNowBtnText}>Start Grocery Shopping</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Shopping Cart</Text>
          <Text style={styles.headerSub}>
            {totalItems} item{totalItems > 1 ? 's' : ''} • Express Delivery
          </Text>
        </View>
        <TouchableOpacity style={styles.clearBtn} onPress={() => clearCart()}>
          <Text style={styles.clearBtnText}>Clear All</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        {error && (
          <TouchableOpacity style={styles.errorBanner} onPress={clearError}>
            <Text style={styles.errorText}>⚠️ {error}</Text>
          </TouchableOpacity>
        )}

        {/* Free Delivery Bar */}
        <View style={styles.deliveryBarCard}>
          <Text style={styles.deliveryBarTitle}>
            {isFreeDelivery
              ? '🎉 FREE City-Wide Delivery Unlocked!'
              : `Add ₹${amountNeeded.toFixed(0)} more for FREE Delivery`}
          </Text>
          <View style={styles.progressBar}>
            <View
              style={[
                styles.progressFill,
                { width: `${Math.min(100, (totalPrice / freeDeliveryThreshold) * 100)}%` },
              ]}
            />
          </View>
        </View>

        {/* Items List */}
        <View style={styles.itemsList}>
          {cartItems.map((item) => {
            const p = item.product;
            const pId = (p.id || p._id)!;
            const unitPrice = p.discountedPrice ?? p.price;
            const itemTotal = unitPrice * item.quantity;
            const isItemOutOfStock = item.isOutOfStock || (p.stockQuantity !== undefined && p.stockQuantity <= 0);

            return (
              <View
                key={pId}
                style={[styles.itemCard, isItemOutOfStock && styles.itemCardOutOfStock]}
              >
                <Image
                  source={{
                    uri:
                      p.images?.[0] ||
                      'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=300&q=80',
                  }}
                  style={styles.itemImage}
                />

                <View style={styles.itemInfo}>
                  <View style={styles.itemHeader}>
                    <Text style={styles.itemName} numberOfLines={1}>
                      {p.name}
                    </Text>
                    <TouchableOpacity onPress={() => removeFromCart(pId)}>
                      <Text style={styles.removeText}>✕</Text>
                    </TouchableOpacity>
                  </View>

                  <Text style={styles.itemUnit}>
                    {p.brand ? `${p.brand} • ` : ''}
                    {p.unit || 'Standard Pack'}
                  </Text>

                  {/* Stock Warning */}
                  {isItemOutOfStock ? (
                    <Text style={styles.outOfStockBadge}>Out of stock</Text>
                  ) : item.stockWarning ? (
                    <Text style={styles.warningBadge}>{item.stockWarning}</Text>
                  ) : null}

                  <View style={styles.itemFooter}>
                    <View style={styles.priceRow}>
                      <Text style={styles.itemPrice}>₹{itemTotal.toFixed(0)}</Text>
                      {p.discountedPrice && p.discountedPrice < p.price ? (
                        <Text style={styles.itemOriginalPrice}>
                          ₹{(p.price * item.quantity).toFixed(0)}
                        </Text>
                      ) : null}
                    </View>

                    {/* Stepper */}
                    <View style={styles.stepper}>
                      <TouchableOpacity
                        style={styles.stepperBtn}
                        onPress={() => updateQuantity(pId, item.quantity - 1)}
                      >
                        <Text style={styles.stepperBtnText}>−</Text>
                      </TouchableOpacity>
                      <Text style={styles.stepperQty}>{item.quantity}</Text>
                      <TouchableOpacity
                        style={styles.stepperBtn}
                        onPress={() => updateQuantity(pId, item.quantity + 1)}
                        disabled={p.stockQuantity !== undefined && item.quantity >= p.stockQuantity}
                      >
                        <Text style={styles.stepperBtnText}>+</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>
              </View>
            );
          })}
        </View>

        {/* Bill Summary */}
        <View style={styles.summaryCard}>
          <Text style={styles.summaryTitle}>Bill Breakdown</Text>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Item Subtotal</Text>
            <Text style={styles.summaryValue}>₹{totalPrice.toFixed(0)}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Delivery Charge</Text>
            <Text style={isFreeDelivery ? styles.freeText : styles.summaryValue}>
              {isFreeDelivery ? 'FREE' : `₹${deliveryFee}`}
            </Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Packaging Charge</Text>
            <Text style={styles.summaryValue}>₹{packagingFee}</Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.summaryRow}>
            <Text style={styles.grandTotalLabel}>Grand Total</Text>
            <Text style={styles.grandTotalValue}>₹{grandTotal.toFixed(0)}</Text>
          </View>
        </View>

        {/* Proceed to Checkout Button */}
        <TouchableOpacity
          style={[styles.checkoutBtn, hasOutOfStock && styles.checkoutBtnDisabled]}
          disabled={hasOutOfStock}
          onPress={() => navigation.navigate('Checkout')}
        >
          <Text style={styles.checkoutBtnText}>Proceed to Checkout →</Text>
        </TouchableOpacity>

        {hasOutOfStock && (
          <Text style={styles.checkoutDisabledText}>
            Remove out-of-stock items above to proceed.
          </Text>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: '#F3F4F6',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#111827',
  },
  headerSub: {
    fontSize: 12,
    color: '#059669',
    fontWeight: '600',
    marginTop: 2,
  },
  clearBtn: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    backgroundColor: '#FEE2E2',
  },
  clearBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#DC2626',
  },
  scroll: {
    padding: 16,
    paddingBottom: 40,
  },
  errorBanner: {
    backgroundColor: '#FEF2F2',
    borderColor: '#FECACA',
    borderWidth: 1,
    padding: 12,
    borderRadius: 12,
    marginBottom: 14,
  },
  errorText: {
    fontSize: 12,
    color: '#B91C1C',
    fontWeight: '600',
  },
  deliveryBarCard: {
    backgroundColor: '#ECFDF5',
    borderRadius: 14,
    padding: 14,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  deliveryBarTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#065F46',
    marginBottom: 8,
  },
  progressBar: {
    height: 6,
    backgroundColor: '#D1FAE5',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#059669',
    borderRadius: 3,
  },
  itemsList: {
    marginBottom: 16,
  },
  itemCard: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  itemCardOutOfStock: {
    backgroundColor: '#FFF1F2',
    borderColor: '#FECDD3',
  },
  itemImage: {
    width: 70,
    height: 70,
    borderRadius: 12,
    backgroundColor: '#F3F4F6',
  },
  itemInfo: {
    flex: 1,
    marginLeft: 12,
    justifyContent: 'space-between',
  },
  itemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  itemName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#111827',
    flex: 1,
    marginRight: 8,
  },
  removeText: {
    fontSize: 16,
    color: '#9CA3AF',
    fontWeight: '700',
    padding: 4,
  },
  itemUnit: {
    fontSize: 11,
    color: '#6B7280',
    marginTop: 2,
  },
  outOfStockBadge: {
    fontSize: 10,
    fontWeight: '700',
    color: '#E11D48',
    marginTop: 2,
  },
  warningBadge: {
    fontSize: 10,
    fontWeight: '600',
    color: '#D97706',
    marginTop: 2,
  },
  itemFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  itemPrice: {
    fontSize: 15,
    fontWeight: '800',
    color: '#111827',
  },
  itemOriginalPrice: {
    fontSize: 11,
    color: '#9CA3AF',
    textDecorationLine: 'line-through',
    marginLeft: 6,
  },
  stepper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  stepperBtn: {
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  stepperBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#374151',
  },
  stepperQty: {
    fontSize: 12,
    fontWeight: '800',
    color: '#111827',
    minWidth: 20,
    textAlign: 'center',
  },
  summaryCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  summaryTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#111827',
    marginBottom: 12,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  summaryLabel: {
    fontSize: 13,
    color: '#6B7280',
  },
  summaryValue: {
    fontSize: 13,
    fontWeight: '600',
    color: '#111827',
  },
  freeText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#059669',
  },
  divider: {
    height: 1,
    backgroundColor: '#E5E7EB',
    marginVertical: 10,
  },
  grandTotalLabel: {
    fontSize: 15,
    fontWeight: '800',
    color: '#111827',
  },
  grandTotalValue: {
    fontSize: 18,
    fontWeight: '900',
    color: '#059669',
  },
  checkoutBtn: {
    backgroundColor: '#059669',
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: 'center',
    shadowColor: '#059669',
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  checkoutBtnDisabled: {
    backgroundColor: '#9CA3AF',
    shadowOpacity: 0,
    elevation: 0,
  },
  checkoutBtnText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  checkoutDisabledText: {
    fontSize: 11,
    color: '#E11D48',
    textAlign: 'center',
    marginTop: 6,
    fontWeight: '600',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  emptyIconBadge: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#D1FAE5',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  emptyEmoji: {
    fontSize: 36,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#111827',
    marginBottom: 8,
  },
  emptySub: {
    fontSize: 13,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 18,
  },
  shopNowBtn: {
    backgroundColor: '#059669',
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 14,
  },
  shopNowBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 14,
  },
});
