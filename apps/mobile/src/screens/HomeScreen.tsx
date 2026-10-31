import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  SafeAreaView,
  RefreshControl,
} from 'react-native';
import { mobileApi } from '../services/api';
import { ICategory, IProduct } from '../types';
import { useCart } from '../context/CartContext';

export const HomeScreen = ({ navigation }: any) => {
  const { addToCart, updateQuantity, getItemQuantity } = useCart();

  const [categories, setCategories] = useState<ICategory[]>([]);
  const [products, setProducts] = useState<IProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = async () => {
    try {
      const [catRes, prodRes] = await Promise.all([
        mobileApi.get('/categories'),
        mobileApi.get('/products?limit=30'),
      ]);

      if (catRes.data?.data?.categories) {
        setCategories(catRes.data.data.categories);
      }
      if (prodRes.data?.data?.products) {
        setProducts(prodRes.data.data.products);
      }
    } catch (e) {
      console.warn('Failed to fetch home data in mobile', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const bestsellers = products.filter((p) => p.isFeatured || p.tags?.includes('bestseller')).slice(0, 6);
  const freshFruitsVeg = products.filter((p) => {
    const slug = typeof p.category === 'object' ? p.category.slug : '';
    return slug === 'fruits' || slug === 'vegetables';
  }).slice(0, 6);
  const staples = products.filter((p) => {
    const slug = typeof p.category === 'object' ? p.category.slug : '';
    return slug === 'rice-and-atta' || slug === 'dals-and-pulses' || slug === 'cooking-oils';
  }).slice(0, 6);

  if (loading && !refreshing) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#059669" />
        <Text style={styles.loadingText}>Opening Paven Traders Store...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      {/* Top Header Bar */}
      <View style={styles.topHeader}>
        <View style={styles.brandRow}>
          <View style={styles.logoBadge}>
            <Text style={styles.logoEmoji}>🛒</Text>
          </View>
          <View>
            <Text style={styles.brandTitle}>Paven Traders</Text>
            <Text style={styles.brandSub}>Single Store • City-Wide Delivery</Text>
          </View>
        </View>

        <View style={styles.etaBadge}>
          <Text style={styles.etaText}>⚡ 30-45 Mins</Text>
        </View>
      </View>

      {/* Delivery Address Strip */}
      <View style={styles.deliveryBar}>
        <Text style={styles.pinIcon}>📍</Text>
        <Text style={styles.deliveryText} numberOfLines={1}>
          Delivering to: <Text style={styles.boldText}>City Center, Sector 4</Text>
        </Text>
      </View>

      {/* Search Input Bar Trigger */}
      <TouchableOpacity
        style={styles.searchBar}
        activeOpacity={0.8}
        onPress={() => navigation.navigate('Search')}
      >
        <Text style={styles.searchIcon}>🔍</Text>
        <Text style={styles.searchPlaceholder}>Search vegetables, fruits, basmati rice, milk...</Text>
      </TouchableOpacity>

      <ScrollView
        contentContainerStyle={styles.scroll}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#059669']} />}
      >
        {/* Promotional Hero Card */}
        <View style={styles.heroCard}>
          <View style={styles.heroBadge}>
            <Text style={styles.heroBadgeText}>Daily Harvest</Text>
          </View>
          <Text style={styles.heroTitle}>Farm Fresh Vegetables & Staples</Text>
          <Text style={styles.heroSub}>Delivered from our store hub directly to your door.</Text>
          <TouchableOpacity
            style={styles.heroBtn}
            onPress={() => navigation.navigate('ProductListing', { categorySlug: 'vegetables', categoryName: 'Vegetables' })}
          >
            <Text style={styles.heroBtnText}>Shop Fresh →</Text>
          </TouchableOpacity>
        </View>

        {/* Categories Strip */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Shop by Category</Text>
          <TouchableOpacity onPress={() => navigation.navigate('Categories')}>
            <Text style={styles.seeAll}>See All (13) →</Text>
          </TouchableOpacity>
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoryScroll}>
          {categories.map((cat) => (
            <TouchableOpacity
              key={cat.id || cat._id || cat.slug}
              style={styles.catPill}
              onPress={() =>
                navigation.navigate('ProductListing', {
                  categorySlug: cat.slug,
                  categoryName: cat.name,
                })
              }
            >
              <View style={styles.catIconBox}>
                <Text style={styles.catEmoji}>{cat.icon || '🛒'}</Text>
              </View>
              <Text style={styles.catName} numberOfLines={1}>{cat.name}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Bestselling Products */}
        {bestsellers.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <View style={styles.titleRow}>
                <Text style={styles.sectionEmoji}>🔥</Text>
                <Text style={styles.sectionTitle}>Best-Selling Items</Text>
              </View>
              <TouchableOpacity onPress={() => navigation.navigate('ProductListing', {})}>
                <Text style={styles.seeAll}>More →</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.productGrid}>
              {bestsellers.map((prod) => renderProductCard(prod, navigation, getItemQuantity, addToCart, updateQuantity))}
            </View>
          </View>
        )}

        {/* Fresh Fruits & Vegetables */}
        {freshFruitsVeg.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <View style={styles.titleRow}>
                <Text style={styles.sectionEmoji}>🥦</Text>
                <Text style={styles.sectionTitle}>Fresh Produce</Text>
              </View>
              <TouchableOpacity onPress={() => navigation.navigate('ProductListing', { categorySlug: 'fruits', categoryName: 'Fruits' })}>
                <Text style={styles.seeAll}>More →</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.productGrid}>
              {freshFruitsVeg.map((prod) => renderProductCard(prod, navigation, getItemQuantity, addToCart, updateQuantity))}
            </View>
          </View>
        )}

        {/* Grains & Kitchen Staples */}
        {staples.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <View style={styles.titleRow}>
                <Text style={styles.sectionEmoji}>🌾</Text>
                <Text style={styles.sectionTitle}>Rice, Atta & Oils</Text>
              </View>
              <TouchableOpacity onPress={() => navigation.navigate('ProductListing', { categorySlug: 'rice-and-atta', categoryName: 'Rice and Atta' })}>
                <Text style={styles.seeAll}>More →</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.productGrid}>
              {staples.map((prod) => renderProductCard(prod, navigation, getItemQuantity, addToCart, updateQuantity))}
            </View>
          </View>
        )}

        {/* Bottom Guarantee Banner */}
        <View style={styles.guaranteeBox}>
          <Text style={styles.guaranteeTitle}>Paven Traders Single Store Promise</Text>
          <Text style={styles.guaranteeBody}>
            ✓ 100% Quality Inspected Produce{'\n'}
            ✓ City-Wide Delivery Coverage{'\n'}
            ✓ Genuine Packaged Brand Seals
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const renderProductCard = (
  prod: IProduct,
  navigation: any,
  getItemQuantity: (id: string) => number,
  addToCart: (p: IProduct) => void,
  updateQuantity: (id: string, q: number) => void
) => {
  const prodId = prod.id || prod._id || '';
  const qty = getItemQuantity(prodId);
  const price = prod.discountedPrice ?? prod.price;
  const original = prod.price;
  const hasDiscount = original > price;
  const image = prod.images?.[0] || 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=300&auto=format&fit=crop&q=80';

  return (
    <TouchableOpacity
      key={prodId}
      style={styles.card}
      activeOpacity={0.85}
      onPress={() => navigation.navigate('ProductDetails', { productId: prodId, productTitle: prod.name })}
    >
      <View style={styles.cardImageContainer}>
        <Image source={{ uri: image }} style={styles.cardImage} resizeMode="cover" />
        {hasDiscount && (
          <View style={styles.discountTag}>
            <Text style={styles.discountText}>
              {Math.round(((original - price) / original) * 100)}% OFF
            </Text>
          </View>
        )}
      </View>

      <Text style={styles.brandTag} numberOfLines={1}>{prod.brand || 'Paven'}</Text>
      <Text style={styles.productName} numberOfLines={2}>{prod.name}</Text>
      <Text style={styles.unitText}>{prod.unit}</Text>

      <View style={styles.cardBottom}>
        <View>
          <Text style={styles.priceText}>₹{price}</Text>
          {hasDiscount && <Text style={styles.originalPriceText}>₹{original}</Text>}
        </View>

        {qty === 0 ? (
          <TouchableOpacity
            style={styles.addBtn}
            onPress={() => addToCart(prod)}
          >
            <Text style={styles.addBtnText}>+ ADD</Text>
          </TouchableOpacity>
        ) : (
          <View style={styles.stepper}>
            <TouchableOpacity onPress={() => updateQuantity(prodId, qty - 1)} style={styles.stepBtn}>
              <Text style={styles.stepText}>-</Text>
            </TouchableOpacity>
            <Text style={styles.qtyText}>{qty}</Text>
            <TouchableOpacity onPress={() => updateQuantity(prodId, qty + 1)} style={styles.stepBtn}>
              <Text style={styles.stepText}>+</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 13,
    color: '#059669',
    fontWeight: '600',
  },
  topHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 4,
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  logoBadge: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: '#059669',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  logoEmoji: {
    fontSize: 20,
  },
  brandTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#111827',
  },
  brandSub: {
    fontSize: 10,
    fontWeight: '700',
    color: '#059669',
    textTransform: 'uppercase',
  },
  etaBadge: {
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  etaText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#065F46',
  },
  deliveryBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 4,
  },
  pinIcon: {
    fontSize: 12,
    marginRight: 6,
  },
  deliveryText: {
    fontSize: 11,
    color: '#4B5563',
  },
  boldText: {
    fontWeight: '700',
    color: '#111827',
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 16,
    marginHorizontal: 16,
    marginVertical: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    shadowColor: '#000',
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1,
  },
  searchIcon: {
    fontSize: 14,
    marginRight: 8,
  },
  searchPlaceholder: {
    fontSize: 12,
    color: '#9CA3AF',
    flex: 1,
  },
  scroll: {
    paddingBottom: 32,
  },
  heroCard: {
    backgroundColor: '#064E3B',
    borderRadius: 22,
    marginHorizontal: 16,
    marginTop: 8,
    marginBottom: 16,
    padding: 20,
  },
  heroBadge: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    marginBottom: 10,
  },
  heroBadgeText: {
    color: '#A7F3D0',
    fontSize: 10,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  heroTitle: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '800',
    lineHeight: 26,
  },
  heroSub: {
    color: '#D1FAE5',
    fontSize: 12,
    marginTop: 6,
    marginBottom: 14,
  },
  heroBtn: {
    alignSelf: 'flex-start',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 12,
  },
  heroBtnText: {
    color: '#064E3B',
    fontWeight: '800',
    fontSize: 12,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginBottom: 10,
    marginTop: 10,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  sectionEmoji: {
    fontSize: 16,
    marginRight: 6,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#111827',
  },
  seeAll: {
    fontSize: 12,
    fontWeight: '700',
    color: '#059669',
  },
  categoryScroll: {
    paddingLeft: 16,
    marginBottom: 10,
  },
  catPill: {
    alignItems: 'center',
    marginRight: 14,
    width: 68,
  },
  catIconBox: {
    width: 56,
    height: 56,
    borderRadius: 18,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 6,
  },
  catEmoji: {
    fontSize: 26,
  },
  catName: {
    fontSize: 11,
    fontWeight: '600',
    color: '#374151',
    textAlign: 'center',
  },
  section: {
    marginTop: 8,
  },
  productGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
  },
  card: {
    width: '48%',
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 12,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  cardImageContainer: {
    width: '100%',
    aspectRatio: 1,
    borderRadius: 14,
    overflow: 'hidden',
    backgroundColor: '#F3F4F6',
    marginBottom: 8,
    position: 'relative',
  },
  cardImage: {
    width: '100%',
    height: '100%',
  },
  discountTag: {
    position: 'absolute',
    top: 6,
    left: 6,
    backgroundColor: '#059669',
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  discountText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '800',
  },
  brandTag: {
    fontSize: 9,
    fontWeight: '700',
    color: '#059669',
    textTransform: 'uppercase',
  },
  productName: {
    fontSize: 12,
    fontWeight: '700',
    color: '#111827',
    marginTop: 2,
    height: 32,
  },
  unitText: {
    fontSize: 10,
    color: '#6B7280',
    marginTop: 2,
  },
  cardBottom: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  priceText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#111827',
  },
  originalPriceText: {
    fontSize: 10,
    color: '#9CA3AF',
    textDecorationLine: 'line-through',
  },
  addBtn: {
    backgroundColor: '#059669',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  addBtnText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '800',
  },
  stepper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#059669',
    borderRadius: 10,
    overflow: 'hidden',
  },
  stepBtn: {
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  stepText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 13,
  },
  qtyText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 11,
    paddingHorizontal: 4,
  },
  guaranteeBox: {
    backgroundColor: '#ECFDF5',
    borderColor: '#A7F3D0',
    borderWidth: 1,
    borderRadius: 18,
    marginHorizontal: 16,
    padding: 16,
    marginTop: 12,
  },
  guaranteeTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#065F46',
    marginBottom: 6,
  },
  guaranteeBody: {
    fontSize: 11,
    color: '#047857',
    lineHeight: 18,
  },
});
