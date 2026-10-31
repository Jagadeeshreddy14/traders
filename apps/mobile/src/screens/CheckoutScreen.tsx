import React, { useState, useEffect, useCallback } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  SafeAreaView,
  Modal,
  Alert,
  Linking,
} from 'react-native';
import { mobileApi } from '../services/api';
import { IAddress, ICoupon, ICheckoutPreview } from '../types';

export const CheckoutScreen = ({ navigation }: any) => {
  const [addresses, setAddresses] = useState<IAddress[]>([]);
  const [selectedAddressId, setSelectedAddressId] = useState<string>('');
  const [activeCoupons, setActiveCoupons] = useState<ICoupon[]>([]);
  const [couponCode, setCouponCode] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState('');
  const [couponMessage, setCouponMessage] = useState<{ text: string; isError: boolean } | null>(null);

  const [preview, setPreview] = useState<ICheckoutPreview | null>(null);
  const [loading, setLoading] = useState(true);
  const [submittingCoupon, setSubmittingCoupon] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<'ONLINE' | 'CASH_ON_DELIVERY'>('ONLINE');
  const [placingOrder, setPlacingOrder] = useState(false);

  // Address modal states
  const [modalVisible, setModalVisible] = useState(false);
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [streetAddress, setStreetAddress] = useState('');
  const [pincode, setPincode] = useState('500001');
  const [type, setType] = useState<'HOME' | 'WORK' | 'OTHER'>('HOME');
  const [savingAddress, setSavingAddress] = useState(false);

  // Load addresses and active coupons
  useEffect(() => {
    const loadData = async () => {
      try {
        const [addrRes, coupRes] = await Promise.all([
          mobileApi.get('/addresses'),
          mobileApi.get('/coupons/active'),
        ]);

        if (addrRes.data?.data?.addresses) {
          const list: IAddress[] = addrRes.data.data.addresses;
          setAddresses(list);
          if (list.length > 0) {
            const def = list.find((a) => a.isDefault) || list[0];
            setSelectedAddressId(def.id || def._id!);
          }
        }

        if (coupRes.data?.data?.coupons) {
          setActiveCoupons(coupRes.data.data.coupons);
        }
      } catch (e: any) {
        if (e.response?.status === 401) {
          navigation.replace('Login');
        }
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [navigation]);

  // Recalculate preview
  const fetchPreview = useCallback(async () => {
    if (!selectedAddressId) return;

    try {
      const res = await mobileApi.post('/checkout/preview', {
        addressId: selectedAddressId,
        couponCode: appliedCoupon || undefined,
      });

      if (res.data?.data?.preview) {
        setPreview(res.data.data.preview);
      }
    } catch (e) {
      console.warn('Checkout preview error', e);
    }
  }, [selectedAddressId, appliedCoupon]);

  useEffect(() => {
    fetchPreview();
  }, [fetchPreview]);

  // Apply Coupon
  const handleApplyCoupon = async (codeToApply?: string) => {
    const code = (codeToApply || couponCode).trim().toUpperCase();
    if (!code) {
      setCouponMessage({ text: 'Please enter a coupon code.', isError: true });
      return;
    }

    setSubmittingCoupon(true);
    setCouponMessage(null);

    try {
      const res = await mobileApi.post('/coupons/validate', {
        code,
        subtotalPaise: 50000,
      });

      if (res.data?.data?.valid) {
        setAppliedCoupon(code);
        setCouponCode('');
        setCouponMessage({ text: res.data.message || 'Coupon applied!', isError: false });
      } else {
        setCouponMessage({ text: res.data?.message || 'Invalid coupon.', isError: true });
      }
    } catch (err: any) {
      setCouponMessage({
        text: err.response?.data?.message || 'Failed to apply coupon.',
        isError: true,
      });
    } finally {
      setSubmittingCoupon(false);
    }
  };

  const handleRemoveCoupon = () => {
    setAppliedCoupon('');
    setCouponMessage(null);
  };

  // Save new address
  const handleSaveAddress = async () => {
    if (!fullName.trim() || !phone.trim() || !pincode.trim() || !streetAddress.trim()) {
      Alert.alert('Required Fields', 'Please fill in Name, Phone, Address, and PIN code.');
      return;
    }

    if (!/^[6-9]\d{9}$/.test(phone.replace(/[\s\-\+]/g, ''))) {
      Alert.alert('Invalid Mobile', 'Please enter a valid 10-digit Indian mobile number.');
      return;
    }

    if (!/^[1-9][0-9]{5}$/.test(pincode.trim())) {
      Alert.alert('Invalid PIN Code', 'Please enter a valid 6-digit Indian PIN code.');
      return;
    }

    setSavingAddress(true);
    try {
      const res = await mobileApi.post('/addresses', {
        fullName: fullName.trim(),
        phone: phone.trim(),
        streetAddress: streetAddress.trim(),
        pincode: pincode.trim(),
        type,
        city: 'Hyderabad',
        state: 'Telangana',
        isDefault: addresses.length === 0,
      });

      if (res.data?.data?.address) {
        const newAddr = res.data.data.address;
        setAddresses([newAddr, ...addresses]);
        setSelectedAddressId(newAddr.id || newAddr._id);
        setModalVisible(false);
        setFullName('');
        setPhone('');
        setStreetAddress('');
      }
    } catch (err: any) {
      Alert.alert('Error', err.response?.data?.message || 'Failed to save address.');
    } finally {
      setSavingAddress(false);
    }
  };

  const handlePlaceOrder = async () => {
    if (!selectedAddressId) {
      Alert.alert('Address Required', 'Please select a delivery address before placing order.');
      return;
    }
    if (!preview?.canProceedToPayment) {
      Alert.alert('Cannot Proceed', preview?.validationIssues?.join('\n') || 'Please resolve order issues.');
      return;
    }

    setPlacingOrder(true);
    try {
      const idempotencyKey = `mob_order_${Date.now()}_${Math.random().toString(36).substring(7)}`;
      const orderRes = await mobileApi.post('/orders', {
        deliveryAddressId: selectedAddressId,
        paymentMethod,
        couponCode: appliedCoupon || undefined,
        idempotencyKey,
      });

      const order = orderRes.data?.data?.order;
      const orderId = order?.id || order?._id;

      if (!orderId) {
        throw new Error('Order creation did not return a valid order ID');
      }

      if (paymentMethod === 'ONLINE') {
        try {
          const payRes = await mobileApi.post('/payments/phonepe/initiate', {
            orderId,
            returnUrl: `paven-traders://payment/callback?orderId=${orderId}`,
          });
          const redirectUrl = payRes.data?.data?.redirectUrl;
          if (redirectUrl) {
            await Linking.openURL(redirectUrl);
          }
        } catch (payErr: any) {
          console.warn('PhonePe gateway redirect notice:', payErr);
        }
      }

      navigation.replace('OrderConfirmation', { orderId });
    } catch (err: any) {
      Alert.alert('Order Placement Failed', err.response?.data?.message || err.message || 'Unable to place order');
    } finally {
      setPlacingOrder(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#059669" />
        <Text style={styles.loadingText}>Verifying checkout & store inventory...</Text>
      </View>
    );
  }

  const selectedAddress = addresses.find((a) => (a.id || a._id) === selectedAddressId);

  return (
    <SafeAreaView style={styles.safe}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Text style={styles.backBtnText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Checkout Preview</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        {/* Phase 3 Banner */}
        <View style={styles.phaseBanner}>
          <Text style={styles.phaseBadge}>PHASE 3 VERIFIED</Text>
          <Text style={styles.phaseText}>
            Backend recalculated prices, live delivery serviceability, and stock are verified. Payment & live order dispatch activate in Phase 4.
          </Text>
        </View>

        {/* Section 1: Delivery Address */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>1. Delivery Address</Text>
            <TouchableOpacity onPress={() => setModalVisible(true)}>
              <Text style={styles.addAddrText}>+ Add New</Text>
            </TouchableOpacity>
          </View>

          {addresses.length === 0 ? (
            <View style={styles.noAddressBox}>
              <Text style={styles.noAddressText}>No delivery address saved yet.</Text>
              <TouchableOpacity
                style={styles.addAddrBtn}
                onPress={() => setModalVisible(true)}
              >
                <Text style={styles.addAddrBtnText}>+ Add Delivery Address</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.addressList}>
              {addresses.map((addr) => {
                const id = addr.id || addr._id!;
                const isSelected = selectedAddressId === id;

                return (
                  <TouchableOpacity
                    key={id}
                    style={[styles.addressItem, isSelected && styles.addressItemSelected]}
                    onPress={() => setSelectedAddressId(id)}
                  >
                    <View style={styles.radioRow}>
                      <View style={[styles.radio, isSelected && styles.radioActive]} />
                      <View style={styles.addressDetails}>
                        <View style={styles.nameRow}>
                          <Text style={styles.addrName}>{addr.fullName}</Text>
                          <Text style={styles.addrTag}>{addr.type || 'HOME'}</Text>
                          {addr.isDefault ? <Text style={styles.defaultTag}>Default</Text> : null}
                        </View>
                        <Text style={styles.addrStreet}>{addr.streetAddress}</Text>
                        <Text style={styles.addrPin}>
                          {addr.city} • PIN: <Text style={styles.bold}>{addr.pincode}</Text>
                        </Text>
                        <Text style={styles.addrPhone}>Phone: {addr.phone}</Text>
                      </View>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          )}

          {/* Serviceability badge */}
          {selectedAddress && preview?.serviceability && (
            <View
              style={[
                styles.serviceabilityBox,
                preview.serviceability.isServiceable
                  ? styles.serviceableOk
                  : styles.serviceableFail,
              ]}
            >
              <Text style={styles.serviceabilityEmoji}>
                {preview.serviceability.isServiceable ? '⚡' : '⚠️'}
              </Text>
              <Text style={styles.serviceabilityText}>
                {preview.serviceability.message}
              </Text>
            </View>
          )}
        </View>

        {/* Section 2: Promotions & Coupons */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>2. Promotional Coupons</Text>

          {appliedCoupon ? (
            <View style={styles.appliedCouponBox}>
              <View>
                <Text style={styles.appliedCouponCode}>🎟️ {appliedCoupon} APPLIED</Text>
                <Text style={styles.appliedCouponSub}>
                  Savings: {preview?.pricing.couponDiscountFormatted}
                </Text>
              </View>
              <TouchableOpacity onPress={handleRemoveCoupon}>
                <Text style={styles.removeCouponText}>Remove</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View>
              <View style={styles.couponInputRow}>
                <TextInput
                  style={styles.couponInput}
                  placeholder="Enter code (e.g. WELCOME100)"
                  autoCapitalize="characters"
                  value={couponCode}
                  onChangeText={setCouponCode}
                />
                <TouchableOpacity
                  style={styles.applyBtn}
                  onPress={() => handleApplyCoupon()}
                  disabled={submittingCoupon || !couponCode.trim()}
                >
                  <Text style={styles.applyBtnText}>
                    {submittingCoupon ? '...' : 'Apply'}
                  </Text>
                </TouchableOpacity>
              </View>

              {couponMessage && (
                <Text
                  style={[
                    styles.couponMsgText,
                    couponMessage.isError ? styles.couponMsgError : styles.couponMsgSuccess,
                  ]}
                >
                  {couponMessage.isError ? '✕ ' : '✓ '}
                  {couponMessage.text}
                </Text>
              )}

              {/* Chips */}
              {activeCoupons.length > 0 && (
                <View style={styles.couponChipsContainer}>
                  <Text style={styles.availableTitle}>Available Coupons:</Text>
                  <View style={styles.chipsRow}>
                    {activeCoupons.map((c) => (
                      <TouchableOpacity
                        key={c.code}
                        style={styles.couponChip}
                        onPress={() => handleApplyCoupon(c.code)}
                      >
                        <Text style={styles.chipCode}>🏷️ {c.code}</Text>
                        <Text style={styles.chipDetail}>
                          {c.discountType === 'PERCENTAGE'
                            ? `${c.discountValue}% OFF`
                            : `₹${c.discountValue / 100} OFF`}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              )}
            </View>
          )}
        </View>

        {/* Section 3: Payment Method */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>3. Payment Method</Text>
          <Text style={styles.paymentSubtext}>
            Choose your preferred payment method for Paven Traders:
          </Text>

          <View style={styles.paymentOptionsContainer}>
            {/* PhonePe Online */}
            <TouchableOpacity
              style={[
                styles.paymentOptionCard,
                paymentMethod === 'ONLINE' && styles.paymentOptionActive,
              ]}
              onPress={() => setPaymentMethod('ONLINE')}
            >
              <View style={styles.radioRow}>
                <View style={[styles.radio, paymentMethod === 'ONLINE' && styles.radioActive]} />
                <View style={styles.paymentOptionDetails}>
                  <View style={styles.paymentTitleRow}>
                    <Text style={styles.paymentOptionTitle}>📱 PhonePe Online Gateway</Text>
                    <View style={styles.recomBadge}>
                      <Text style={styles.recomBadgeText}>RECOMMENDED</Text>
                    </View>
                  </View>
                  <Text style={styles.paymentOptionDesc}>
                    UPI (Google Pay, PhonePe, Paytm), Credit/Debit Cards, NetBanking.
                  </Text>
                  <Text style={styles.paymentSecureNote}>
                    🔒 Official PhonePe 256-Bit SSL Encrypted Checkout
                  </Text>
                </View>
              </View>
            </TouchableOpacity>

            {/* Cash on Delivery */}
            <TouchableOpacity
              style={[
                styles.paymentOptionCard,
                paymentMethod === 'CASH_ON_DELIVERY' && styles.paymentOptionActive,
              ]}
              onPress={() => setPaymentMethod('CASH_ON_DELIVERY')}
            >
              <View style={styles.radioRow}>
                <View
                  style={[styles.radio, paymentMethod === 'CASH_ON_DELIVERY' && styles.radioActive]}
                />
                <View style={styles.paymentOptionDetails}>
                  <Text style={styles.paymentOptionTitle}>💵 Cash on Delivery (COD)</Text>
                  <Text style={styles.paymentOptionDesc}>
                    Pay cash to our delivery executive when your groceries arrive at your doorstep.
                  </Text>
                </View>
              </View>
            </TouchableOpacity>
          </View>
        </View>

        {/* Section 4: Order & Pricing Summary */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>4. Order & Pricing Summary</Text>

          {preview ? (
            <View>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Items MRP</Text>
                <Text style={styles.summaryVal}>{preview.pricing.itemsRegularTotalFormatted}</Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Store Subtotal</Text>
                <Text style={styles.summaryVal}>{preview.pricing.itemsSubtotalFormatted}</Text>
              </View>

              {preview.pricing.couponDiscountFormatted !== '₹0.00' ? (
                <View style={styles.summaryRow}>
                  <Text style={styles.discountLabel}>Coupon Discount</Text>
                  <Text style={styles.discountVal}>− {preview.pricing.couponDiscountFormatted}</Text>
                </View>
              ) : null}

              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Delivery Fee</Text>
                <Text style={preview.pricing.isFreeDelivery ? styles.freeVal : styles.summaryVal}>
                  {preview.pricing.deliveryChargeFormatted}
                </Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Packaging Fee</Text>
                <Text style={styles.summaryVal}>{preview.pricing.packagingChargeFormatted}</Text>
              </View>

              <View style={styles.divider} />

              <View style={styles.summaryRow}>
                <Text style={styles.totalLabel}>Total Payable</Text>
                <Text style={styles.totalVal}>{preview.pricing.totalPayableFormatted}</Text>
              </View>

              {preview.validationIssues.length > 0 && (
                <View style={styles.issuesBox}>
                  {preview.validationIssues.map((issue, idx) => (
                    <Text key={idx} style={styles.issueText}>
                      ⚠️ {issue}
                    </Text>
                  ))}
                </View>
              )}

              <TouchableOpacity
                style={[
                  styles.orderBtn,
                  (!preview.canProceedToPayment || placingOrder) && styles.orderBtnDisabled,
                ]}
                disabled={!preview.canProceedToPayment || placingOrder}
                onPress={handlePlaceOrder}
              >
                {placingOrder ? (
                  <View style={styles.orderBtnLoadingRow}>
                    <ActivityIndicator size="small" color="#FFFFFF" />
                    <Text style={[styles.orderBtnText, { marginLeft: 8 }]}>Processing Order...</Text>
                  </View>
                ) : (
                  <Text style={styles.orderBtnText}>
                    {paymentMethod === 'ONLINE'
                      ? `Pay via PhonePe (${preview.pricing.totalPayableFormatted})`
                      : `Confirm COD Order (${preview.pricing.totalPayableFormatted})`}
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          ) : (
            <Text style={styles.selectAddressHint}>
              Select an address to calculate complete pricing.
            </Text>
          )}
        </View>
      </ScrollView>

      {/* Add Address Modal */}
      <Modal visible={modalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Add Delivery Address</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Text style={styles.modalClose}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={styles.modalForm}>
              <Text style={styles.inputLabel}>Full Name *</Text>
              <TextInput
                style={styles.modalInput}
                placeholder="Ramesh Patel"
                value={fullName}
                onChangeText={setFullName}
              />

              <Text style={styles.inputLabel}>10-Digit Mobile *</Text>
              <TextInput
                style={styles.modalInput}
                placeholder="9876543210"
                keyboardType="phone-pad"
                value={phone}
                onChangeText={setPhone}
              />

              <Text style={styles.inputLabel}>Street / Flat / House Address *</Text>
              <TextInput
                style={styles.modalInput}
                placeholder="Flat 204, Sai Heights, Main Road"
                value={streetAddress}
                onChangeText={setStreetAddress}
              />

              <Text style={styles.inputLabel}>PIN Code *</Text>
              <TextInput
                style={styles.modalInput}
                placeholder="500001"
                keyboardType="numeric"
                maxLength={6}
                value={pincode}
                onChangeText={setPincode}
              />

              <Text style={styles.inputLabel}>Address Type</Text>
              <View style={styles.typeButtonsRow}>
                {(['HOME', 'WORK', 'OTHER'] as const).map((t) => (
                  <TouchableOpacity
                    key={t}
                    style={[styles.typeBtn, type === t && styles.typeBtnActive]}
                    onPress={() => setType(t)}
                  >
                    <Text style={[styles.typeBtnText, type === t && styles.typeBtnTextActive]}>
                      {t}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <TouchableOpacity
                style={styles.modalSaveBtn}
                onPress={handleSaveAddress}
                disabled={savingAddress}
              >
                <Text style={styles.modalSaveBtnText}>
                  {savingAddress ? 'Saving Address...' : 'Save & Select Address'}
                </Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>
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
    backgroundColor: '#F3F4F6',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 13,
    color: '#6B7280',
    fontWeight: '600',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  backBtn: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    backgroundColor: '#F3F4F6',
    borderRadius: 8,
  },
  backBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#374151',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#111827',
  },
  scroll: {
    padding: 16,
    paddingBottom: 40,
  },
  phaseBanner: {
    backgroundColor: '#064E3B',
    borderRadius: 16,
    padding: 14,
    marginBottom: 16,
  },
  phaseBadge: {
    fontSize: 10,
    fontWeight: '800',
    color: '#34D399',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  phaseText: {
    fontSize: 12,
    color: '#D1FAE5',
    lineHeight: 17,
  },
  sectionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#111827',
  },
  addAddrText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#059669',
  },
  noAddressBox: {
    padding: 20,
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  noAddressText: {
    fontSize: 13,
    color: '#6B7280',
    marginBottom: 10,
  },
  addAddrBtn: {
    backgroundColor: '#059669',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 10,
  },
  addAddrBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  addressList: {
    gap: 8,
  },
  addressItem: {
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    borderRadius: 14,
    padding: 12,
    backgroundColor: '#FFFFFF',
    marginBottom: 8,
  },
  addressItemSelected: {
    borderColor: '#059669',
    backgroundColor: '#ECFDF5',
  },
  radioRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  radio: {
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#9CA3AF',
    marginTop: 3,
    marginRight: 10,
  },
  radioActive: {
    borderColor: '#059669',
    backgroundColor: '#059669',
  },
  addressDetails: {
    flex: 1,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  addrName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#111827',
  },
  addrTag: {
    fontSize: 10,
    fontWeight: '700',
    backgroundColor: '#E5E7EB',
    color: '#374151',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 4,
  },
  defaultTag: {
    fontSize: 10,
    fontWeight: '700',
    backgroundColor: '#D1FAE5',
    color: '#065F46',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 4,
  },
  addrStreet: {
    fontSize: 12,
    color: '#4B5563',
    marginTop: 2,
  },
  addrPin: {
    fontSize: 11,
    color: '#6B7280',
    marginTop: 1,
  },
  bold: {
    fontWeight: '700',
    color: '#111827',
  },
  addrPhone: {
    fontSize: 11,
    color: '#6B7280',
    marginTop: 1,
  },
  serviceabilityBox: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 10,
    padding: 10,
    marginTop: 10,
  },
  serviceableOk: {
    backgroundColor: '#D1FAE5',
  },
  serviceableFail: {
    backgroundColor: '#FEE2E2',
  },
  serviceabilityEmoji: {
    fontSize: 14,
    marginRight: 6,
  },
  serviceabilityText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#111827',
    flex: 1,
  },
  appliedCouponBox: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#ECFDF5',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  appliedCouponCode: {
    fontSize: 13,
    fontWeight: '800',
    color: '#065F46',
  },
  appliedCouponSub: {
    fontSize: 11,
    color: '#047857',
    marginTop: 2,
  },
  removeCouponText: {
    fontSize: 12,
    color: '#DC2626',
    fontWeight: '700',
  },
  couponInputRow: {
    flexDirection: 'row',
    gap: 8,
  },
  couponInput: {
    flex: 1,
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 13,
    fontWeight: '600',
  },
  applyBtn: {
    backgroundColor: '#059669',
    borderRadius: 12,
    paddingHorizontal: 16,
    justifyContent: 'center',
  },
  applyBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 13,
  },
  couponMsgText: {
    fontSize: 11,
    fontWeight: '600',
    marginTop: 6,
  },
  couponMsgSuccess: {
    color: '#059669',
  },
  couponMsgError: {
    color: '#DC2626',
  },
  couponChipsContainer: {
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  availableTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: '#6B7280',
    marginBottom: 6,
  },
  chipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  couponChip: {
    backgroundColor: '#F0FDF4',
    borderWidth: 1,
    borderColor: '#86EFAC',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  chipCode: {
    fontSize: 11,
    fontWeight: '700',
    color: '#166534',
  },
  chipDetail: {
    fontSize: 9,
    color: '#15803D',
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
  summaryVal: {
    fontSize: 13,
    fontWeight: '600',
    color: '#111827',
  },
  discountLabel: {
    fontSize: 13,
    color: '#059669',
    fontWeight: '600',
  },
  discountVal: {
    fontSize: 13,
    color: '#059669',
    fontWeight: '700',
  },
  freeVal: {
    fontSize: 11,
    color: '#059669',
    fontWeight: '800',
  },
  divider: {
    height: 1,
    backgroundColor: '#E5E7EB',
    marginVertical: 10,
  },
  totalLabel: {
    fontSize: 15,
    fontWeight: '800',
    color: '#111827',
  },
  totalVal: {
    fontSize: 18,
    fontWeight: '900',
    color: '#059669',
  },
  issuesBox: {
    backgroundColor: '#FEF3C7',
    borderRadius: 10,
    padding: 10,
    marginVertical: 10,
  },
  issueText: {
    fontSize: 11,
    color: '#92400E',
    marginBottom: 2,
  },
  orderBtn: {
    backgroundColor: '#059669',
    borderRadius: 14,
    paddingVertical: 15,
    alignItems: 'center',
    marginTop: 10,
  },
  orderBtnLoadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  orderBtnDisabled: {
    backgroundColor: '#9CA3AF',
  },
  orderBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
  },
  paymentSubtext: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 12,
  },
  paymentOptionsContainer: {
    gap: 10,
  },
  paymentOptionCard: {
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    borderRadius: 14,
    padding: 14,
    backgroundColor: '#FAFAFA',
  },
  paymentOptionActive: {
    borderColor: '#059669',
    backgroundColor: '#F0FDF4',
  },
  paymentOptionDetails: {
    flex: 1,
    marginLeft: 10,
  },
  paymentTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 3,
  },
  paymentOptionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#111827',
  },
  recomBadge: {
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  recomBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#15803D',
  },
  paymentOptionDesc: {
    fontSize: 11,
    color: '#6B7280',
    lineHeight: 16,
    marginTop: 2,
  },
  paymentSecureNote: {
    fontSize: 10,
    color: '#059669',
    fontWeight: '600',
    marginTop: 4,
  },
  selectAddressHint: {
    fontSize: 12,
    color: '#6B7280',
    fontStyle: 'italic',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '85%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 18,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#111827',
  },
  modalClose: {
    fontSize: 18,
    color: '#9CA3AF',
    fontWeight: '700',
    padding: 4,
  },
  modalForm: {
    padding: 18,
    paddingBottom: 40,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#374151',
    marginBottom: 4,
    marginTop: 10,
  },
  modalInput: {
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 13,
  },
  typeButtonsRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 6,
    marginBottom: 16,
  },
  typeBtn: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
  },
  typeBtnActive: {
    borderColor: '#059669',
    backgroundColor: '#ECFDF5',
  },
  typeBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#6B7280',
  },
  typeBtnTextActive: {
    color: '#059669',
  },
  modalSaveBtn: {
    backgroundColor: '#059669',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 10,
  },
  modalSaveBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
  },
});
