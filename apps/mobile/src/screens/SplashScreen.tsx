import React, { useEffect } from 'react';
import { StyleSheet, Text, View, ActivityIndicator } from 'react-native';
import { secureStorage } from '../services/storage';

export const SplashScreen = ({ navigation }: any) => {
  useEffect(() => {
    const checkUser = async () => {
      try {
        const token = await secureStorage.getItem('access_token');
        setTimeout(() => {
          if (token) {
            navigation.replace('MainTabs');
          } else {
            navigation.replace('MainTabs');
          }
        }, 1200);
      } catch {
        navigation.replace('MainTabs');
      }
    };

    checkUser();
  }, [navigation]);

  return (
    <View style={styles.container}>
      <View style={styles.logoBadge}>
        <Text style={styles.logoEmoji}>🛒</Text>
      </View>

      <Text style={styles.title}>Paven Traders</Text>
      <Text style={styles.tagline}>Single Store Grocery Delivery</Text>
      <Text style={styles.coverage}>City-Wide Express Coverage (30-45 Mins)</Text>

      <View style={styles.loaderContainer}>
        <ActivityIndicator size="small" color="#A7F3D0" />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#064E3B',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  logoBadge: {
    width: 88,
    height: 88,
    borderRadius: 28,
    backgroundColor: '#059669',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 6,
  },
  logoEmoji: {
    fontSize: 44,
  },
  title: {
    fontSize: 32,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: -0.5,
  },
  tagline: {
    fontSize: 14,
    fontWeight: '700',
    color: '#34D399',
    marginTop: 6,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  coverage: {
    fontSize: 12,
    color: '#A7F3D0',
    marginTop: 8,
    fontWeight: '500',
  },
  loaderContainer: {
    position: 'absolute',
    bottom: 50,
  },
});
