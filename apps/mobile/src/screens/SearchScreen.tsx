import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  SafeAreaView,
} from 'react-native';
import { mobileApi } from '../services/api';
import { IProduct } from '../types';
import { useCart } from '../context/CartContext';

const SEARCH_SUGGESTIONS = [
  'Tomatoes',
  'Basmati Rice',
  'Sharbati Atta',
  'Milk',
  'Pure Ghee',
  'Toor Dal',
  'Bananas',
  'Cookies',
  'Detergent',
];

export const SearchScreen = ({ navigation }: any) => {
  const { addToCart, updateQuantity, getItemQuantity } = useCart();

  const [query, setQuery] = useState('');
  const [products, setProducts] = useState<IProduct[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  useEffect(() => {
    if (!query.trim()) {
      setProducts([]);
      setHasSearched(false);
      setLoading(false);
      return;
    }

    const timer = setTimeout(async () => {
      setLoading(true);
      setHasSearched(true);
      try {
        const res = await mobileApi.get(`/products?search=${encodeURIComponent(query.trim())}&limit=30`);
        if (res.data?.data?.products) {
          setProducts(res.data.data.products);
        }
      } catch (e) {
        console.warn('Search query error', e);
        setProducts([]);
      } finally {
        setLoading(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [query]);

  return (
    <SafeAreaView style={styles.safe}>
      {/* Search Bar Input */}
      <View style={styles.searchHeader}>
        <View style={styles.inputContainer}>
          <Text style={styles.searchIcon}>🔍</Text>
          <TextInput
            style={styles.input}
            placeholder="Search groceries, fruits, milk, atta..."
            value={query}
            onChangeText={setQuery}
            autoFocus
          />
          {query.length > 0 && (
            <TouchableOpacity onPress={() => setQuery('')} style={styles.clearBtn}>
              <Text style={styles.clearText}>✕</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Suggestion Chips */}
      <View style={styles.suggestionsContainer}>
        <Text style={styles.suggestLabel}>Trending:</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipsScroll}>
          {SEARCH_SUGGESTIONS.map((term) => (
            <TouchableOpacity
              key={term}
              style={styles.chip}
              onPress={() => setQuery(term)}
            >
              <Text style={styles.chipText}>{term}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Results View */}
      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#059669" />
          <Text style={styles.loadingText}>Searching store inventory...</Text>
        </View>
      ) : hasSearched && products.length === 0 ? (
        <View style={styles.center}>
          <Text style={styles.emptyEmoji}>🔍</Text>
          <Text style={styles.emptyTitle}>No matching groceries found</Text>
          <Text style={styles.emptySub}>Try searching for broader keywords like 'oil', 'dal', or 'rice'.</Text>
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
  searchHeader: {
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    borderRadius: 16,
    paddingHorizontal: 12,
  },
  searchIcon: {
    fontSize: 16,
    marginRight: 8,
  },
  input: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 14,
    color: '#111827',
  },
  clearBtn: {
    padding: 6,
  },
  clearText: {
    fontSize: 14,
    color: '#9CA3AF',
    fontWeight: '800',
  },
  suggestionsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  suggestLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#6B7280',
    marginRight: 8,
  },
  chipsScroll: {
    flexGrow: 0,
  },
  chip: {
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    marginRight: 6,
  },
  chipText: {
    fontSize: 11,
    color: '#374151',
    fontWeight: '600',
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
    textAlign: 'center',
    marginTop: 4,
    maxWidth: 240,
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
