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
} from 'react-native';
import { mobileApi } from '../services/api';
import { IProduct } from '../types';
import { useCart } from '../context/CartContext';

export const ProductListingScreen = ({ route, navigation }: any) => {
  const { categorySlug, categoryName, searchQuery } = route.params || {};
  const { addToCart, updateQuantity, getItemQuantity } = useCart();

  const [products, setProducts] = useState<IProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState('popularity');

  useEffect(() => {
    const fetchProducts = async () => {
      setLoading(true);
      try {
        const params = new URLSearchParams();
        if (categorySlug) params.append('category', categorySlug);
        if (searchQuery) params.append('search', searchQuery);
        params.append('sortBy', sortBy);

        const res = await mobileApi.get(`/products?${params.toString()}`);
        if (res.data?.data?.products) {
          setProducts(res.data.data.products);
        }
      } catch (e) {
        console.warn('Failed to fetch listing products', e);
      } finally {
        setLoading(false);
      }
    };

    fetchProducts();
  }, [categorySlug, searchQuery, sortBy]);

  const screenTitle = categoryName || searchQuery ? `Search: ${searchQuery}` : 'All Products';

  return (
    <SafeAreaView style={styles.safe}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.title} numberOfLines={1}>{screenTitle}</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* Sorting Tabs */}
      <View style={styles.sortBar}>
        <Text style={styles.sortLabel}>Sort:</Text>
        <TouchableOpacity
          style={[styles.sortChip, sortBy === 'popularity' && styles.sortChipActive]}
          onPress={() => setSortBy('popularity')}
        >
          <Text style={[styles.sortChipText, sortBy === 'popularity' && styles.sortChipTextActive]}>
            Popular
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.sortChip, sortBy === 'price_asc' && styles.sortChipActive]}
          onPress={() => setSortBy('price_asc')}
        >
          <Text style={[styles.sortChipText, sortBy === 'price_asc' && styles.sortChipTextActive]}>
            Price: Low ↑
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.sortChip, sortBy === 'price_desc' && styles.sortChipActive]}
          onPress={() => setSortBy('price_desc')}
        >
          <Text style={[styles.sortChipText, sortBy === 'price_desc' && styles.sortChipTextActive]}>
            Price: High ↓
          </Text>
        </TouchableOpacity>
      </View>

      {/* Product Content */}
      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#059669" />
          <Text style={styles.loadingText}>Fetching groceries...</Text>
        </View>
      ) : products.length === 0 ? (
        <View style={styles.center}>
          <Text style={styles.emptyEmoji}>📦</Text>
          <Text style={styles.emptyTitle}>No products found</Text>
          <Text style={styles.emptySub}>No items currently listed in this section.</Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.grid}>
          {products.map((prod) => {
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
          })}
        </ScrollView>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: '#F9FAFB',
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
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  backText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#059669',
  },
  title: {
    fontSize: 16,
    fontWeight: '800',
    color: '#111827',
    maxWidth: '65%',
    textAlign: 'center',
  },
  sortBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  sortLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#6B7280',
    marginRight: 8,
  },
  sortChip: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    backgroundColor: '#F3F4F6',
    marginRight: 6,
  },
  sortChipActive: {
    backgroundColor: '#059669',
  },
  sortChipText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#4B5563',
  },
  sortChipTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  loadingText: {
    marginTop: 10,
    fontSize: 12,
    color: '#059669',
    fontWeight: '600',
  },
  emptyEmoji: {
    fontSize: 48,
    marginBottom: 8,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#111827',
  },
  emptySub: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 4,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    padding: 16,
    paddingBottom: 32,
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
});
