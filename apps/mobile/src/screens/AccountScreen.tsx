import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  SafeAreaView,
  Alert,
} from 'react-native';
import { mobileApi } from '../services/api';
import { secureStorage } from '../services/storage';

export const AccountScreen = ({ navigation }: any) => {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'profile' | 'addresses' | 'orders'>('profile');

  const checkUserStatus = async () => {
    setLoading(true);
    try {
      const token = await secureStorage.getItem('access_token');
      const cachedUser = await secureStorage.getItem('user');

      if (token) {
        if (cachedUser) {
          setUser(JSON.parse(cachedUser));
        }

        // Verify with live /api/v1/auth/me
        try {
          const res = await mobileApi.get('/auth/me');
          if (res.data?.data?.user) {
            setUser(res.data.data.user);
            await secureStorage.setItem('user', JSON.stringify(res.data.data.user));
          }
        } catch {
          // Token may be expired or offline; cached user remains
        }
      } else {
        setUser(null);
      }
    } catch (e) {
      console.warn('Failed checking user profile', e);
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      checkUserStatus();
    });
    return unsubscribe;
  }, [navigation]);

  const handleLogout = async () => {
    Alert.alert('Sign Out', 'Are you sure you want to log out from Paven Traders?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign Out',
        style: 'destructive',
        onPress: async () => {
          try {
            await secureStorage.removeItem('access_token');
            await secureStorage.removeItem('refresh_token');
            await secureStorage.removeItem('user');
            setUser(null);
          } catch (e) {
            console.warn('Error during logout', e);
          }
        },
      },
    ]);
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#059669" />
        <Text style={styles.loadingText}>Loading account details...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>My Account</Text>
        <Text style={styles.headerSubtitle}>Paven Traders Single Store Customer Portal</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        {user ? (
          <>
            {/* User Profile Card */}
            <View style={styles.profileCard}>
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>{user.name ? user.name[0].toUpperCase() : 'U'}</Text>
              </View>
              <View style={styles.profileInfo}>
                <Text style={styles.userName}>{user.name}</Text>
                <Text style={styles.userEmail}>{user.email}</Text>
                {user.phone ? <Text style={styles.userPhone}>📱 {user.phone}</Text> : null}
                <View style={styles.roleBadge}>
                  <Text style={styles.roleText}>Verified Customer • City Delivery</Text>
                </View>
              </View>
            </View>

            {/* Account Tabs */}
            <View style={styles.tabContainer}>
              <TouchableOpacity
                style={[styles.tabBtn, activeTab === 'profile' && styles.tabBtnActive]}
                onPress={() => setActiveTab('profile')}
              >
                <Text style={[styles.tabText, activeTab === 'profile' && styles.tabTextActive]}>Overview</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.tabBtn, activeTab === 'addresses' && styles.tabBtnActive]}
                onPress={() => setActiveTab('addresses')}
              >
                <Text style={[styles.tabText, activeTab === 'addresses' && styles.tabTextActive]}>Addresses</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.tabBtn, activeTab === 'orders' && styles.tabBtnActive]}
                onPress={() => setActiveTab('orders')}
              >
                <Text style={[styles.tabText, activeTab === 'orders' && styles.tabTextActive]}>Orders</Text>
              </TouchableOpacity>
            </View>

            {/* Tab Contents */}
            {activeTab === 'profile' && (
              <View style={styles.sectionContainer}>
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Account Status</Text>
                  <Text style={styles.infoValueActive}>Active</Text>
                </View>
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Role</Text>
                  <Text style={styles.infoValue}>{user.role || 'customer'}</Text>
                </View>
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Store Hub</Text>
                  <Text style={styles.infoValue}>Paven Traders Main Central Hub</Text>
                </View>
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Delivery Speed</Text>
                  <Text style={styles.infoValue}>30 - 45 Minutes</Text>
                </View>
              </View>
            )}

            {activeTab === 'addresses' && (
              <View style={styles.sectionContainer}>
                <View style={styles.addressHeaderRow}>
                  <Text style={styles.sectionTitle}>Delivery Locations</Text>
                  <View style={styles.phaseBadge}>
                    <Text style={styles.phaseBadgeText}>Phase 2 Preview</Text>
                  </View>
                </View>
                <Text style={styles.subtext}>
                  Paven Traders delivers city-wide from our dedicated grocery store facility.
                </Text>

                <View style={styles.addressCard}>
                  <View style={styles.addressTop}>
                    <Text style={styles.addressTag}>PRIMARY HOME</Text>
                    <Text style={styles.defaultTag}>Default</Text>
                  </View>
                  <Text style={styles.addressTitle}>{user.name}</Text>
                  <Text style={styles.addressDetail}>Sector 4, City Center Main Road</Text>
                  <Text style={styles.addressDetail}>City Wide Delivery Zone • PIN: 500001</Text>
                  {user.phone ? <Text style={styles.addressDetail}>Contact: {user.phone}</Text> : null}
                </View>

                <View style={styles.noticeBox}>
                  <Text style={styles.noticeText}>
                    📍 Additional saved addresses and map geolocation pin-dropping will be available in Phase 3.
                  </Text>
                </View>
              </View>
            )}

            {activeTab === 'orders' && (
              <View style={styles.sectionContainer}>
                <View style={styles.addressHeaderRow}>
                  <Text style={styles.sectionTitle}>Order History</Text>
                  <View style={[styles.phaseBadge, { backgroundColor: '#D1FAE5' }]}>
                    <Text style={[styles.phaseBadgeText, { color: '#065F46' }]}>Live Orders Active</Text>
                  </View>
                </View>
                <Text style={styles.subtext}>
                  Keep track of all your grocery purchases, PhonePe payment receipts, and delivery tracking.
                </Text>

                <TouchableOpacity
                  style={{
                    backgroundColor: '#059669',
                    borderRadius: 14,
                    paddingVertical: 14,
                    alignItems: 'center',
                    marginTop: 12,
                  }}
                  onPress={() => navigation.navigate('Orders')}
                >
                  <Text style={{ color: '#FFFFFF', fontWeight: '700', fontSize: 14 }}>
                    View All Orders & Receipts →
                  </Text>
                </TouchableOpacity>
              </View>
            )}

            {/* Store Service Assurance */}
            <View style={styles.serviceCard}>
              <Text style={styles.serviceTitle}>Paven Traders Service Guarantee</Text>
              <Text style={styles.serviceItem}>✅ 100% Fresh Farm Produce & Quality Staples</Text>
              <Text style={styles.serviceItem}>✅ City-Wide Delivery within 30-45 minutes</Text>
              <Text style={styles.serviceItem}>✅ Direct Store Pricing with No Middlemen</Text>
              <Text style={styles.serviceItem}>✅ Easy Return & Replacement Policy</Text>
            </View>

            {/* Logout Button */}
            <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
              <Text style={styles.logoutButtonText}>Sign Out</Text>
            </TouchableOpacity>
          </>
        ) : (
          /* Guest State */
          <View style={styles.guestContainer}>
            <View style={styles.guestIconBadge}>
              <Text style={styles.guestIcon}>👤</Text>
            </View>
            <Text style={styles.guestTitle}>Welcome to Paven Traders</Text>
            <Text style={styles.guestSub}>
              Sign in to manage your profile, delivery addresses, and view your order history.
            </Text>

            <TouchableOpacity
              style={styles.signInButton}
              onPress={() => navigation.navigate('Login')}
            >
              <Text style={styles.signInButtonText}>Sign In with Account</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.registerButton}
              onPress={() => navigation.navigate('Register')}
            >
              <Text style={styles.registerButtonText}>Create New Account</Text>
            </TouchableOpacity>

            {/* Store Information */}
            <View style={styles.storeInfoBox}>
              <Text style={styles.storeInfoTitle}>About Paven Traders</Text>
              <Text style={styles.storeInfoText}>
                We are your trusted neighborhood single-store grocery partner delivering fresh groceries city-wide.
              </Text>
              <View style={styles.contactRow}>
                <Text style={styles.contactText}>📞 Support: +91 98765 43210</Text>
                <Text style={styles.contactText}>✉️ orders@paventraders.com</Text>
              </View>
            </View>
          </View>
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
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500',
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 14,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#111827',
  },
  headerSubtitle: {
    fontSize: 12,
    color: '#059669',
    fontWeight: '600',
    marginTop: 2,
  },
  scroll: {
    padding: 16,
    paddingBottom: 40,
  },
  profileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 16,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
    marginBottom: 16,
  },
  avatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#059669',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  avatarText: {
    fontSize: 26,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  profileInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 18,
    fontWeight: '800',
    color: '#111827',
  },
  userEmail: {
    fontSize: 13,
    color: '#4B5563',
    marginTop: 2,
  },
  userPhone: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
  },
  roleBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    marginTop: 6,
  },
  roleText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#059669',
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#E5E7EB',
    borderRadius: 12,
    padding: 4,
    marginBottom: 16,
  },
  tabBtn: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 8,
  },
  tabBtnActive: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 1,
  },
  tabText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#6B7280',
  },
  tabTextActive: {
    color: '#059669',
    fontWeight: '700',
  },
  sectionContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 1,
  },
  addressHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
  },
  phaseBadge: {
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  phaseBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#92400E',
  },
  subtext: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 14,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  infoLabel: {
    fontSize: 13,
    color: '#6B7280',
    fontWeight: '500',
  },
  infoValue: {
    fontSize: 13,
    color: '#111827',
    fontWeight: '600',
  },
  infoValueActive: {
    fontSize: 13,
    color: '#059669',
    fontWeight: '700',
  },
  addressCard: {
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    marginBottom: 12,
  },
  addressTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  addressTag: {
    fontSize: 10,
    fontWeight: '800',
    color: '#059669',
    letterSpacing: 0.5,
  },
  defaultTag: {
    fontSize: 10,
    fontWeight: '700',
    color: '#4B5563',
    backgroundColor: '#E5E7EB',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 4,
  },
  addressTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#111827',
  },
  addressDetail: {
    fontSize: 12,
    color: '#4B5563',
    marginTop: 2,
  },
  orderCard: {
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    marginBottom: 12,
  },
  orderTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  orderId: {
    fontSize: 14,
    fontWeight: '800',
    color: '#111827',
  },
  orderStatusBadge: {
    fontSize: 11,
    fontWeight: '700',
    color: '#065F46',
    backgroundColor: '#D1FAE5',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  orderDate: {
    fontSize: 11,
    color: '#6B7280',
  },
  orderDivider: {
    height: 1,
    backgroundColor: '#E5E7EB',
    marginVertical: 10,
  },
  orderSummary: {
    fontSize: 12,
    color: '#374151',
    fontWeight: '500',
    marginBottom: 8,
  },
  orderBottom: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  orderTotal: {
    fontSize: 13,
    fontWeight: '700',
    color: '#111827',
  },
  orderPayment: {
    fontSize: 11,
    color: '#059669',
    fontWeight: '600',
  },
  noticeBox: {
    backgroundColor: '#EFF6FF',
    padding: 12,
    borderRadius: 10,
    borderColor: '#BFDBFE',
    borderWidth: 1,
  },
  noticeText: {
    fontSize: 11,
    color: '#1E40AF',
    lineHeight: 16,
  },
  serviceCard: {
    backgroundColor: '#ECFDF5',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  serviceTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#065F46',
    marginBottom: 8,
  },
  serviceItem: {
    fontSize: 12,
    color: '#047857',
    marginBottom: 4,
    fontWeight: '500',
  },
  logoutButton: {
    backgroundColor: '#FEE2E2',
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  logoutButtonText: {
    color: '#DC2626',
    fontSize: 14,
    fontWeight: '700',
  },
  guestContainer: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  guestIconBadge: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#D1FAE5',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  guestIcon: {
    fontSize: 36,
  },
  guestTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#111827',
    marginBottom: 8,
  },
  guestSub: {
    fontSize: 13,
    color: '#6B7280',
    textAlign: 'center',
    paddingHorizontal: 20,
    marginBottom: 24,
    lineHeight: 18,
  },
  signInButton: {
    backgroundColor: '#059669',
    width: '100%',
    paddingVertical: 15,
    borderRadius: 14,
    alignItems: 'center',
    marginBottom: 12,
    shadowColor: '#059669',
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 3,
  },
  signInButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  registerButton: {
    backgroundColor: '#FFFFFF',
    width: '100%',
    paddingVertical: 15,
    borderRadius: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#059669',
    marginBottom: 24,
  },
  registerButtonText: {
    color: '#059669',
    fontSize: 15,
    fontWeight: '700',
  },
  storeInfoBox: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 18,
    width: '100%',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  storeInfoTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 6,
  },
  storeInfoText: {
    fontSize: 12,
    color: '#4B5563',
    lineHeight: 18,
    marginBottom: 12,
  },
  contactRow: {
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
    paddingTop: 10,
  },
  contactText: {
    fontSize: 11,
    color: '#6B7280',
    marginBottom: 4,
  },
});
