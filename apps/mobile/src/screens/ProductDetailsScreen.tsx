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

export const ProductDetailsScreen = ({ route, navigation }: any) => {
  const { productId } = route.params || {};
  const { addToCart, getItemQuantity } = useCart();

  const [product, setProduct] = useState<IProduct | null>(null);
  const [relatedProducts, setRelatedProducts] = useState<IProduct[]>([]);
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProduct = async () => {
      setLoading(true);
      try {
        const res = await mobileApi.get(`/products/${productId}`);
        if (res.data?.data) {
          setProduct(res.data.data.product);
          setRelatedProducts(res.data.data.relatedProducts || []);
          setActiveImageIndex(0);
          setQuantity(1);
        }
      } catch (e) {
        console.warn('Failed to load mobile product detail', e);
      } finally {
        setLoading(false);
      }
    };

    fetchProduct();
  }, [productId]);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#059669" />
        <Text style={styles.loadingText}>Fetching grocery item...</Text>
      </View>
    );
  }

  if (!product) {
    return (
      <View style={styles.center}>
        <Text style={styles.emptyTitle}>Product not found</Text>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Text style={styles.backButtonText}>← Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const pId = product.id || product._id || '';
  const cartQty = getItemQuantity(pId);
  const price = product.discountedPrice ?? product.price;
  const original = product.price;
  const hasDiscount = original > price;
  const images = product.images && product.images.length > 0
    ? product.images
    : ['https://images.unsplash.com/photo-1542838132-92c53300491e?w=500&auto=format&fit=crop&q=80'];

  return (
    <SafeAreaView style={styles.safe}>
      {/* Top Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.headerBackBtn} onPress={() => navigation.goBack()}>
          <Text style={styles.headerBackText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>{product.name}</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        {/* Main Product Image */}
        <View style={styles.mainImageContainer}>
          <Image source={{ uri: images[activeImageIndex] }} style={styles.mainImage} resizeMode="contain" />
          {hasDiscount && (
            <View style={styles.discountBadge}>
              <Text style={styles.discountBadgeText}>
                {Math.round(((original - price) / original) * 100)}% OFF
              </Text>
            </View>
          )}
        </View>

        {/* Thumbnail Selector */}
        {images.length > 1 && (
          <ScrollView horizontal style={styles.thumbScroll} showsHorizontalScrollIndicator={false}>
            {images.map((img, idx) => (
              <TouchableOpacity
                key={idx}
                style={[styles.thumbBox, activeImageIndex === idx && styles.thumbBoxActive]}
                onPress={() => setActiveImageIndex(idx)}
              >
                <Image source={{ uri: img }} style={styles.thumbImage} resizeMode="cover" />
              </TouchableOpacity>
            ))}
          </ScrollView>
        )}

        {/* Product Details Section */}
        <View style={styles.detailsCard}>
          <View style={styles.brandRow}>
            <Text style={styles.brandText}>{product.brand || 'Paven Choice'}</Text>
            <View style={styles.stockBadge}>
              <Text style={styles.stockText}>✓ In Stock ({product.stockQuantity})</Text>
            </View>
          </View>

          <Text style={styles.titleText}>{product.name}</Text>
          <Text style={styles.unitText}>Pack Size: {product.unit}</Text>

          {/* Pricing Row */}
          <View style={styles.priceRow}>
            <Text style={styles.priceText}>₹{price}</Text>
            {hasDiscount && (
              <View style={styles.savingsRow}>
                <Text style={styles.originalText}>₹{original}</Text>
                <Text style={styles.savingsText}>Save ₹{original - price}</Text>
              </View>
            )}
          </View>

          {/* Delivery Promise */}
          <View style={styles.deliveryBox}>
            <Text style={styles.deliveryTitle}>⚡ City-Wide Express Delivery</Text>
            <Text style={styles.deliverySub}>Delivered within 30-45 minutes from Paven Traders store hub.</Text>
          </View>

          {/* Quantity Controls & Add to Cart */}
          <View style={styles.actionRow}>
            <View style={styles.qtyControl}>
              <TouchableOpacity
                style={styles.qtyBtn}
                onPress={() => setQuantity((q) => Math.max(1, q - 1))}
              >
                <Text style={styles.qtyBtnText}>-</Text>
              </TouchableOpacity>
              <Text style={styles.qtyValue}>{quantity}</Text>
              <TouchableOpacity
                style={styles.qtyBtn}
                onPress={() => setQuantity((q) => q + 1)}
              >
                <Text style={styles.qtyBtnText}>+</Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={styles.addCartBtn}
              activeOpacity={0.85}
              onPress={() => addToCart(product, quantity)}
            >
              <Text style={styles.addCartText}>
                Add to Cart • ₹{price * quantity}
              </Text>
            </TouchableOpacity>
          </View>

          {cartQty > 0 && (
            <Text style={styles.inCartIndicator}>✓ {cartQty} already in your grocery cart</Text>
          )}

          {/* Description */}
          <View style={styles.descSection}>
            <Text style={styles.descTitle}>Product Information</Text>
            <Text style={styles.descBody}>
              {product.description || 'Premium grocery staple sourced directly by Paven Traders for maximum freshness, cleanliness, and value.'}
            </Text>
          </View>
        </View>

        {/* Related Products */}
        {relatedProducts.length > 0 && (
          <View style={styles.relatedSection}>
            <Text style={styles.relatedTitle}>Similar Products</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.relatedScroll}>
              {relatedProducts.map((rp) => {
                const rpId = rp.id || rp._id || '';
                const rpPrice = rp.discountedPrice ?? rp.price;
                const rpImg = rp.images?.[0] || 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=200&auto=format&fit=crop&q=80';

                return (
                  <TouchableOpacity
                    key={rpId}
                    style={styles.relatedCard}
                    activeOpacity={0.8}
                    onPress={() => navigation.push('ProductDetails', { productId: rpId, productTitle: rp.name })}
                  >
                    <Image source={{ uri: rpImg }} style={styles.relatedImage} resizeMode="cover" />
                    <Text style={styles.relatedBrand} numberOfLines={1}>{rp.brand || 'Paven'}</Text>
                    <Text style={styles.relatedName} numberOfLines={2}>{rp.name}</Text>
                    <Text style={styles.relatedPrice}>₹{rpPrice}</Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: '#F9FAFB',
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
  emptyTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#111827',
  },
  backButton: {
    marginTop: 14,
    backgroundColor: '#059669',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 10,
  },
  backButtonText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 12,
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
  headerBackBtn: {
    paddingVertical: 4,
    paddingHorizontal: 6,
  },
  headerBackText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#059669',
  },
  headerTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#111827',
    maxWidth: '70%',
  },
  scroll: {
    paddingBottom: 40,
  },
  mainImageContainer: {
    width: '100%',
    aspectRatio: 1.1,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
    padding: 16,
  },
  mainImage: {
    width: '100%',
    height: '100%',
  },
  discountBadge: {
    position: 'absolute',
    top: 16,
    left: 16,
    backgroundColor: '#059669',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  discountBadgeText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '800',
  },
  thumbScroll: {
    paddingHorizontal: 16,
    marginVertical: 10,
  },
  thumbBox: {
    width: 60,
    height: 60,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    marginRight: 10,
    overflow: 'hidden',
    backgroundColor: '#FFFFFF',
  },
  thumbBoxActive: {
    borderColor: '#059669',
    borderWidth: 2,
  },
  thumbImage: {
    width: '100%',
    height: '100%',
  },
  detailsCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 20,
    marginHorizontal: 16,
    marginTop: 6,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  brandRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  brandText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#059669',
    textTransform: 'uppercase',
  },
  stockBadge: {
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  stockText: {
    fontSize: 10,
    color: '#065F46',
    fontWeight: '700',
  },
  titleText: {
    fontSize: 20,
    fontWeight: '800',
    color: '#111827',
    lineHeight: 26,
  },
  unitText: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 4,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginTop: 12,
  },
  priceText: {
    fontSize: 26,
    fontWeight: '900',
    color: '#111827',
    marginRight: 10,
  },
  savingsRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  originalText: {
    fontSize: 14,
    color: '#9CA3AF',
    textDecorationLine: 'line-through',
    marginRight: 8,
  },
  savingsText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#059669',
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  deliveryBox: {
    backgroundColor: '#F9FAFB',
    borderRadius: 14,
    padding: 12,
    marginTop: 16,
    borderWidth: 1,
    borderColor: '#F3F4F6',
  },
  deliveryTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#111827',
  },
  deliverySub: {
    fontSize: 11,
    color: '#6B7280',
    marginTop: 2,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 20,
  },
  qtyControl: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    borderRadius: 14,
    padding: 4,
    marginRight: 12,
  },
  qtyBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  qtyBtnText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#111827',
  },
  qtyValue: {
    width: 36,
    textAlign: 'center',
    fontSize: 14,
    fontWeight: '800',
    color: '#111827',
  },
  addCartBtn: {
    flex: 1,
    backgroundColor: '#059669',
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
  },
  addCartText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
  },
  inCartIndicator: {
    fontSize: 11,
    fontWeight: '700',
    color: '#059669',
    marginTop: 8,
    textAlign: 'center',
  },
  descSection: {
    marginTop: 20,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  descTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#111827',
    marginBottom: 6,
  },
  descBody: {
    fontSize: 12,
    color: '#4B5563',
    lineHeight: 18,
  },
  relatedSection: {
    marginTop: 20,
    paddingLeft: 16,
  },
  relatedTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#111827',
    marginBottom: 12,
  },
  relatedScroll: {
    paddingRight: 16,
  },
  relatedCard: {
    width: 140,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 10,
    marginRight: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  relatedImage: {
    width: '100%',
    aspectRatio: 1,
    borderRadius: 10,
    backgroundColor: '#F3F4F6',
    marginBottom: 6,
  },
  relatedBrand: {
    fontSize: 9,
    fontWeight: '700',
    color: '#059669',
    textTransform: 'uppercase',
  },
  relatedName: {
    fontSize: 11,
    fontWeight: '700',
    color: '#111827',
    marginTop: 2,
    height: 28,
  },
  relatedPrice: {
    fontSize: 13,
    fontWeight: '800',
    color: '#111827',
    marginTop: 4,
  },
});
