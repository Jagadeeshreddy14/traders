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
import { ICategory } from '../types';

export const CategoriesScreen = ({ navigation }: any) => {
  const [categories, setCategories] = useState<ICategory[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCats = async () => {
      try {
        const res = await mobileApi.get('/categories');
        if (res.data?.data?.categories) {
          setCategories(res.data.data.categories);
        }
      } catch (e) {
        console.warn('Error loading categories', e);
      } finally {
        setLoading(false);
      }
    };

    fetchCats();
  }, []);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#059669" />
        <Text style={styles.loadingText}>Loading Departments...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <Text style={styles.title}>All Grocery Categories</Text>
        <Text style={styles.subtitle}>13 Departments stocked daily at Paven Traders</Text>
      </View>

      <ScrollView contentContainerStyle={styles.grid}>
        {categories.map((cat) => (
          <TouchableOpacity
            key={cat.id || cat._id || cat.slug}
            style={styles.card}
            activeOpacity={0.8}
            onPress={() =>
              navigation.navigate('ProductListing', {
                categorySlug: cat.slug,
                categoryName: cat.name,
              })
            }
          >
            <View style={styles.imageBox}>
              {cat.image ? (
                <Image source={{ uri: cat.image }} style={styles.image} resizeMode="cover" />
              ) : (
                <Text style={styles.icon}>{cat.icon || '🛒'}</Text>
              )}
              <View style={styles.iconBadge}>
                <Text style={styles.badgeEmoji}>{cat.icon || '🛒'}</Text>
              </View>
            </View>

            <View style={styles.cardInfo}>
              <Text style={styles.name} numberOfLines={1}>{cat.name}</Text>
              <Text style={styles.desc} numberOfLines={2}>
                {cat.description || 'Fresh daily groceries'}
              </Text>
            </View>
          </TouchableOpacity>
        ))}
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
  },
  loadingText: {
    marginTop: 10,
    fontSize: 12,
    color: '#059669',
    fontWeight: '600',
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
    color: '#111827',
  },
  subtitle: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    padding: 16,
  },
  card: {
    width: '48%',
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    overflow: 'hidden',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 1,
  },
  imageBox: {
    width: '100%',
    aspectRatio: 1.1,
    backgroundColor: '#ECFDF5',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  icon: {
    fontSize: 36,
  },
  iconBadge: {
    position: 'absolute',
    top: 8,
    left: 8,
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeEmoji: {
    fontSize: 16,
  },
  cardInfo: {
    padding: 12,
  },
  name: {
    fontSize: 13,
    fontWeight: '700',
    color: '#111827',
  },
  desc: {
    fontSize: 10,
    color: '#6B7280',
    marginTop: 4,
    lineHeight: 14,
  },
});
