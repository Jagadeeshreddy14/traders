import { connectDatabase, disconnectDatabase } from '../config/db';
import { Category } from '../models/Category';
import { Product } from '../models/Product';
import { Inventory } from '../models/Inventory';
import { logger } from '../utils/logger';

const SEED_CATEGORIES = [
  {
    name: 'Rice and Atta',
    slug: 'rice-and-atta',
    description: 'Premium basmati rice, sona masoori, and stone-ground whole wheat atta.',
    image: 'https://images.unsplash.com/photo-1586201375761-83865001e31c?w=500&auto=format&fit=crop&q=80',
    icon: '🌾',
    displayOrder: 1,
  },
  {
    name: 'Dals and Pulses',
    slug: 'dals-and-pulses',
    description: 'Unpolished protein-rich toor dal, moong dal, chana, and rajma.',
    image: 'https://images.unsplash.com/photo-1599785209707-a456fc1337bb?w=500&auto=format&fit=crop&q=80',
    icon: '🥣',
    displayOrder: 2,
  },
  {
    name: 'Cooking Oils',
    slug: 'cooking-oils',
    description: 'Cold-pressed sunflower oil, mustard oil, groundnut oil, and pure cow ghee.',
    image: 'https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?w=500&auto=format&fit=crop&q=80',
    icon: '🫒',
    displayOrder: 3,
  },
  {
    name: 'Spices and Masalas',
    slug: 'spices-and-masalas',
    description: 'Aromatic whole spices, powdered masalas, turmeric, and blends.',
    image: 'https://images.unsplash.com/photo-1596040033229-a9821ebd058d?w=500&auto=format&fit=crop&q=80',
    icon: '🌶️',
    displayOrder: 4,
  },
  {
    name: 'Fruits',
    slug: 'fruits',
    description: 'Farm-fresh seasonal fruits, crisp apples, bananas, and citrus.',
    image: 'https://images.unsplash.com/photo-1619566636858-adf3ef46400b?w=500&auto=format&fit=crop&q=80',
    icon: '🍎',
    displayOrder: 5,
  },
  {
    name: 'Vegetables',
    slug: 'vegetables',
    description: 'Daily fresh leafy greens, tomatoes, onions, potatoes, and exotic veg.',
    image: 'https://images.unsplash.com/photo-1540420773420-3366772f4999?w=500&auto=format&fit=crop&q=80',
    icon: '🥦',
    displayOrder: 6,
  },
  {
    name: 'Dairy Products',
    slug: 'dairy-products',
    description: 'Fresh pasteurized pouch milk, paneer, butter, curd, and cheese.',
    image: 'https://images.unsplash.com/photo-1550583724-b2692b85b150?w=500&auto=format&fit=crop&q=80',
    icon: '🥛',
    displayOrder: 7,
  },
  {
    name: 'Snacks',
    slug: 'snacks',
    description: 'Namkeens, roasted nuts, bhujia, potato chips, and traditional snacks.',
    image: 'https://images.unsplash.com/photo-1566478989037-eec170784d0b?w=500&auto=format&fit=crop&q=80',
    icon: '🥨',
    displayOrder: 8,
  },
  {
    name: 'Biscuits',
    slug: 'biscuits',
    description: 'Crunchy cookies, tea biscuits, cream crackers, and digestive biscuits.',
    image: 'https://images.unsplash.com/photo-1558961363-fa8fdf82db35?w=500&auto=format&fit=crop&q=80',
    icon: '🍪',
    displayOrder: 9,
  },
  {
    name: 'Beverages',
    slug: 'beverages',
    description: 'Premium tea, filter coffee, fruit juices, and health drinks.',
    image: 'https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?w=500&auto=format&fit=crop&q=80',
    icon: '🧃',
    displayOrder: 10,
  },
  {
    name: 'Personal Care',
    slug: 'personal-care',
    description: 'Bath soaps, shampoos, toothpastes, skincare, and hygiene essentials.',
    image: 'https://images.unsplash.com/photo-1556228720-195a672e8a03?w=500&auto=format&fit=crop&q=80',
    icon: '🧼',
    displayOrder: 11,
  },
  {
    name: 'Household Cleaning',
    slug: 'household-cleaning',
    description: 'Detergents, dishwashing liquids, floor cleaners, and disinfectants.',
    image: 'https://images.unsplash.com/photo-1585421514738-01798e348b17?w=500&auto=format&fit=crop&q=80',
    icon: '🧹',
    displayOrder: 12,
  },
  {
    name: 'Baby Products',
    slug: 'baby-products',
    description: 'Gentle baby soaps, diapers, wipes, and infant care nutrition.',
    image: 'https://images.unsplash.com/photo-1515488042361-ee00e0ddd4e4?w=500&auto=format&fit=crop&q=80',
    icon: '🍼',
    displayOrder: 13,
  },
];

const SEED_PRODUCTS = [
  // 1. Rice and Atta
  {
    name: 'Aashirvaad Superior MP Sharbati Whole Wheat Atta',
    slug: 'aashirvaad-sharbati-atta-5kg',
    brand: 'Aashirvaad',
    categorySlug: 'rice-and-atta',
    price: 295,
    discountedPrice: 265,
    unit: '5 kg Pack',
    stockQuantity: 120,
    isFeatured: true,
    images: [
      'https://images.unsplash.com/photo-1574323347407-f5e1ad6d020b?w=600&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1586201375761-83865001e31c?w=600&auto=format&fit=crop&q=80',
    ],
    description: '100% pure whole wheat grain atta sourced from the fertile fields of Madhya Pradesh. Makes rotis that remain soft and fluffy for hours.',
    tags: ['atta', 'flour', 'staples', 'wheat', 'bestseller'],
  },
  {
    name: 'India Gate Feast Rozzana Basmati Rice',
    slug: 'india-gate-rozzana-basmati-5kg',
    brand: 'India Gate',
    categorySlug: 'rice-and-atta',
    price: 490,
    discountedPrice: 420,
    unit: '5 kg Bag',
    stockQuantity: 80,
    isFeatured: true,
    images: [
      'https://images.unsplash.com/photo-1586201375761-83865001e31c?w=600&auto=format&fit=crop&q=80',
    ],
    description: 'Aged long-grain basmati rice with exquisite aroma and delicate texture. Ideal for everyday biryani, pulao, and steamed rice.',
    tags: ['rice', 'basmati', 'grains', 'bestseller'],
  },
  {
    name: 'Paven Choice Sona Masoori Raw Rice',
    slug: 'paven-sona-masoori-rice-10kg',
    brand: 'Paven Choice',
    categorySlug: 'rice-and-atta',
    price: 680,
    discountedPrice: 599,
    unit: '10 kg Bag',
    stockQuantity: 65,
    isFeatured: false,
    images: [
      'https://images.unsplash.com/photo-1536304993881-ff6e9eefa2a6?w=600&auto=format&fit=crop&q=80',
    ],
    description: 'Lightweight, aromatic, and easy to digest premium quality Sona Masoori rice directly processed from local mills.',
    tags: ['rice', 'sona masoori', 'staples'],
  },

  // 2. Dals and Pulses
  {
    name: 'Tata Sampann Unpolished Toor Dal',
    slug: 'tata-sampann-toor-dal-1kg',
    brand: 'Tata Sampann',
    categorySlug: 'dals-and-pulses',
    price: 185,
    discountedPrice: 165,
    unit: '1 kg Pouch',
    stockQuantity: 95,
    isFeatured: true,
    images: [
      'https://images.unsplash.com/photo-1599785209707-a456fc1337bb?w=600&auto=format&fit=crop&q=80',
    ],
    description: 'Unpolished toor dal that undergoes no artificial coloring or polishing with water, oil, or leather, retaining its wholesome nutrition and natural flavor.',
    tags: ['toor dal', 'pulses', 'dals', 'protein', 'bestseller'],
  },
  {
    name: 'Paven Choice Yellow Moong Dal',
    slug: 'paven-yellow-moong-dal-1kg',
    brand: 'Paven Choice',
    categorySlug: 'dals-and-pulses',
    price: 140,
    discountedPrice: 125,
    unit: '1 kg Pouch',
    stockQuantity: 70,
    isFeatured: false,
    images: [
      'https://images.unsplash.com/photo-1585994424788-bf962c45e546?w=600&auto=format&fit=crop&q=80',
    ],
    description: 'Quick-cooking split yellow moong lentils packed with dietary fiber and essential vitamins.',
    tags: ['moong dal', 'dals', 'staples'],
  },
  {
    name: 'Organic Kabuli Chana (Chickpeas)',
    slug: 'organic-kabuli-chana-1kg',
    brand: 'Organic Tattva',
    categorySlug: 'dals-and-pulses',
    price: 175,
    discountedPrice: 155,
    unit: '1 kg Pack',
    stockQuantity: 50,
    isFeatured: false,
    images: [
      'https://images.unsplash.com/photo-1515543237350-b3eea1ec8082?w=600&auto=format&fit=crop&q=80',
    ],
    description: 'Large sized, uniform, and delicious Kabuli chana ideal for Punjabi chole and salads.',
    tags: ['chana', 'kabuli', 'pulses'],
  },

  // 3. Cooking Oils
  {
    name: 'Fortune Sunlite Refined Sunflower Oil',
    slug: 'fortune-sunlite-sunflower-oil-1l',
    brand: 'Fortune',
    categorySlug: 'cooking-oils',
    price: 155,
    discountedPrice: 138,
    unit: '1 Litre Pouch',
    stockQuantity: 110,
    isFeatured: true,
    images: [
      'https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?w=600&auto=format&fit=crop&q=80',
    ],
    description: 'Light, healthy, and easy to digest refined sunflower oil enriched with vitamins A & D for daily cooking.',
    tags: ['oil', 'sunflower', 'cooking oil', 'bestseller'],
  },
  {
    name: 'Amul Pure Ghee (Aromatic Cow Ghee)',
    slug: 'amul-pure-ghee-1l',
    brand: 'Amul',
    categorySlug: 'cooking-oils',
    price: 650,
    discountedPrice: 595,
    unit: '1 Litre Tin',
    stockQuantity: 45,
    isFeatured: true,
    images: [
      'https://images.unsplash.com/photo-1628088062854-d1870b4553da?w=600&auto=format&fit=crop&q=80',
    ],
    description: 'Traditional granular aromatic ghee made from fresh cream, offering rich flavor and wholesome goodness for sweets and daily meals.',
    tags: ['ghee', 'amul', 'cooking oil', 'dairy'],
  },

  // 4. Spices and Masalas
  {
    name: 'Everest Turmeric Powder (Haldi)',
    slug: 'everest-turmeric-powder-500g',
    brand: 'Everest',
    categorySlug: 'spices-and-masalas',
    price: 120,
    discountedPrice: 105,
    unit: '500 g Pack',
    stockQuantity: 85,
    isFeatured: false,
    images: [
      'https://images.unsplash.com/photo-1615485290382-441e4d049cb5?w=600&auto=format&fit=crop&q=80',
    ],
    description: 'High curcumin content pure turmeric powder, naturally ground to bring golden color and antiseptic benefits.',
    tags: ['spices', 'haldi', 'turmeric', 'masala'],
  },
  {
    name: 'MDH Deggi Mirch (Natural Red Pepper Powder)',
    slug: 'mdh-deggi-mirch-100g',
    brand: 'MDH',
    categorySlug: 'spices-and-masalas',
    price: 95,
    discountedPrice: 85,
    unit: '100 g Carton',
    stockQuantity: 90,
    isFeatured: false,
    images: [
      'https://images.unsplash.com/photo-1596040033229-a9821ebd058d?w=600&auto=format&fit=crop&q=80',
    ],
    description: 'Unique blend of Indian red peppers delivering vibrant red curry color with a mild, aromatic warmth.',
    tags: ['spices', 'chilli', 'masala'],
  },

  // 5. Fruits
  {
    name: 'Fresh Shimla Royal Apples',
    slug: 'fresh-shimla-royal-apples-1kg',
    brand: 'Paven Fresh',
    categorySlug: 'fruits',
    price: 180,
    discountedPrice: 149,
    unit: '1 kg (approx 4-5 pcs)',
    stockQuantity: 75,
    isFeatured: true,
    images: [
      'https://images.unsplash.com/photo-1560806887-1e4cd0b6cbd6?w=600&auto=format&fit=crop&q=80',
    ],
    description: 'Crisp, sweet, and juicy handpicked apples directly harvested from Himachal Pradesh orchards.',
    tags: ['fruits', 'apple', 'fresh', 'bestseller'],
  },
  {
    name: 'Robusta Fresh Bananas',
    slug: 'robusta-bananas-1kg',
    brand: 'Paven Fresh',
    categorySlug: 'fruits',
    price: 55,
    discountedPrice: 42,
    unit: '1 kg (approx 5-6 pcs)',
    stockQuantity: 100,
    isFeatured: true,
    images: [
      'https://images.unsplash.com/photo-1571771894821-ce9b6c11b08e?w=600&auto=format&fit=crop&q=80',
    ],
    description: 'Naturally ripened nutrient-dense bananas. High in potassium and energy.',
    tags: ['fruits', 'banana', 'fresh'],
  },
  {
    name: 'Fresh Nagpur Sweet Oranges (Mosambi)',
    slug: 'nagpur-mosambi-1kg',
    brand: 'Paven Fresh',
    categorySlug: 'fruits',
    price: 90,
    discountedPrice: 75,
    unit: '1 kg Pack',
    stockQuantity: 60,
    isFeatured: false,
    images: [
      'https://images.unsplash.com/photo-1611080626919-7cf5a9dbab5b?w=600&auto=format&fit=crop&q=80',
    ],
    description: 'Fresh citrus mosambi ideal for morning fruit juices and refreshing vitamin C boost.',
    tags: ['fruits', 'citrus'],
  },

  // 6. Vegetables
  {
    name: 'Farm Fresh Organic Hybrid Tomatoes',
    slug: 'farm-fresh-tomatoes-1kg',
    brand: 'Paven Fresh',
    categorySlug: 'vegetables',
    price: 45,
    discountedPrice: 34,
    unit: '1 kg Pack',
    stockQuantity: 150,
    isFeatured: true,
    images: [
      'https://images.unsplash.com/photo-1592924357228-91a4daadcfea?w=600&auto=format&fit=crop&q=80',
    ],
    description: 'Firm, juicy, and ruby-red tomatoes freshly picked each morning from local verified greenhouses.',
    tags: ['vegetables', 'tomatoes', 'fresh', 'bestseller'],
  },
  {
    name: 'Fresh Red Onions (Pyaz)',
    slug: 'fresh-red-onions-1kg',
    brand: 'Paven Fresh',
    categorySlug: 'vegetables',
    price: 50,
    discountedPrice: 39,
    unit: '1 kg Mesh Bag',
    stockQuantity: 200,
    isFeatured: true,
    images: [
      'https://images.unsplash.com/photo-1618512496248-a07fe83aa8cb?w=600&auto=format&fit=crop&q=80',
    ],
    description: 'High pungency dry red onions, clean and sorted for optimal kitchen shelf life.',
    tags: ['vegetables', 'onions', 'fresh'],
  },
  {
    name: 'Fresh Jyoti Potatoes (Aloo)',
    slug: 'fresh-jyoti-potatoes-1kg',
    brand: 'Paven Fresh',
    categorySlug: 'vegetables',
    price: 40,
    discountedPrice: 30,
    unit: '1 kg Pack',
    stockQuantity: 180,
    isFeatured: false,
    images: [
      'https://images.unsplash.com/photo-1518977676601-b53f82aba655?w=600&auto=format&fit=crop&q=80',
    ],
    description: 'Soil-cleaned fresh table potatoes with thin skin, perfect for boiling, roasting, and frying.',
    tags: ['vegetables', 'potatoes', 'fresh'],
  },

  // 7. Dairy Products
  {
    name: 'Amul Taaza Homogenised Toned Milk',
    slug: 'amul-taaza-toned-milk-1l',
    brand: 'Amul',
    categorySlug: 'dairy-products',
    price: 74,
    discountedPrice: 68,
    unit: '1 Litre Tetra Pack',
    stockQuantity: 120,
    isFeatured: true,
    images: [
      'https://images.unsplash.com/photo-1550583724-b2692b85b150?w=600&auto=format&fit=crop&q=80',
    ],
    description: 'UHT treated long life toned milk with 3.0% milk fat. No boiling required, convenient and fresh.',
    tags: ['milk', 'dairy', 'amul', 'bestseller'],
  },
  {
    name: 'Amul Fresh Malai Paneer',
    slug: 'amul-malai-paneer-200g',
    brand: 'Amul',
    categorySlug: 'dairy-products',
    price: 95,
    discountedPrice: 85,
    unit: '200 g Pack',
    stockQuantity: 60,
    isFeatured: true,
    images: [
      'https://images.unsplash.com/photo-1631452180519-c014fe946bc7?w=600&auto=format&fit=crop&q=80',
    ],
    description: 'Soft, rich, and creamy cottage cheese made from fresh cow milk. Ideal for palak paneer and curries.',
    tags: ['paneer', 'dairy', 'amul'],
  },
  {
    name: 'Amul Salted Butter (Pasteurized)',
    slug: 'amul-salted-butter-100g',
    brand: 'Amul',
    categorySlug: 'dairy-products',
    price: 58,
    discountedPrice: 54,
    unit: '100 g Carton',
    stockQuantity: 80,
    isFeatured: false,
    images: [
      'https://images.unsplash.com/photo-1589985270826-4b7bb135bc9d?w=600&auto=format&fit=crop&q=80',
    ],
    description: 'The taste of India. Classic wholesome salted table butter made from fresh dairy cream.',
    tags: ['butter', 'dairy'],
  },

  // 8. Snacks
  {
    name: 'Haldiram’s Nagpur Aloo Bhujia',
    slug: 'haldirams-aloo-bhujia-400g',
    brand: 'Haldiram',
    categorySlug: 'snacks',
    price: 110,
    discountedPrice: 95,
    unit: '400 g Pack',
    stockQuantity: 115,
    isFeatured: true,
    images: [
      'https://images.unsplash.com/photo-1566478989037-eec170784d0b?w=600&auto=format&fit=crop&q=80',
    ],
    description: 'Spicy and crispy potato-gram flour noodles seasoned with a blend of savory Indian spices.',
    tags: ['snacks', 'namkeen', 'bhujia', 'bestseller'],
  },
  {
    name: 'Lay’s India’s Magic Masala Potato Chips',
    slug: 'lays-magic-masala-chips-90g',
    brand: 'Lay’s',
    categorySlug: 'snacks',
    price: 40,
    discountedPrice: 35,
    unit: '90 g Pouch',
    stockQuantity: 140,
    isFeatured: false,
    images: [
      'https://images.unsplash.com/photo-1527842891421-42eec6e703ea?w=600&auto=format&fit=crop&q=80',
    ],
    description: 'Crispy wafer-thin potato chips generously dusted with spicy tangy magic masala seasoning.',
    tags: ['chips', 'snacks'],
  },

  // 9. Biscuits
  {
    name: 'Britannia Good Day Cashew Cookies',
    slug: 'britannia-good-day-cashew-200g',
    brand: 'Britannia',
    categorySlug: 'biscuits',
    price: 50,
    discountedPrice: 42,
    unit: '200 g Pack',
    stockQuantity: 130,
    isFeatured: true,
    images: [
      'https://images.unsplash.com/photo-1558961363-fa8fdf82db35?w=600&auto=format&fit=crop&q=80',
    ],
    description: 'Rich butter cookies loaded with crunchy real cashews. Pair with your morning and evening cup of chai.',
    tags: ['biscuits', 'cookies', 'tea-time'],
  },
  {
    name: 'Parle-G Original Gluco Biscuits',
    slug: 'parle-g-gluco-biscuits-800g',
    brand: 'Parle',
    categorySlug: 'biscuits',
    price: 90,
    discountedPrice: 80,
    unit: '800 g Family Pack',
    stockQuantity: 160,
    isFeatured: false,
    images: [
      'https://images.unsplash.com/photo-1590080875515-8a3a8dc5735e?w=600&auto=format&fit=crop&q=80',
    ],
    description: 'The world’s largest selling glucose biscuit, nourishing millions of families with wholesome energy.',
    tags: ['biscuits', 'glucose'],
  },

  // 10. Beverages
  {
    name: 'Tata Tea Gold Leaf & Dust Blend',
    slug: 'tata-tea-gold-500g',
    brand: 'Tata Tea',
    categorySlug: 'beverages',
    price: 320,
    discountedPrice: 285,
    unit: '500 g Pouch',
    stockQuantity: 70,
    isFeatured: true,
    images: [
      'https://images.unsplash.com/photo-1576092768241-dec231879fc3?w=600&auto=format&fit=crop&q=80',
    ],
    description: 'Exquisite blend of gently rolled Assam tea leaves with a touch of aromatic long leaves.',
    tags: ['tea', 'beverages', 'chai', 'bestseller'],
  },
  {
    name: 'Nescafe Classic Instant Coffee',
    slug: 'nescafe-classic-instant-coffee-100g',
    brand: 'Nescafe',
    categorySlug: 'beverages',
    price: 215,
    discountedPrice: 195,
    unit: '100 g Glass Jar',
    stockQuantity: 55,
    isFeatured: false,
    images: [
      'https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?w=600&auto=format&fit=crop&q=80',
    ],
    description: 'Rich and aromatic 100% pure coffee powder made from slow-roasted Arabica and Robusta beans.',
    tags: ['coffee', 'beverages'],
  },

  // 11. Personal Care
  {
    name: 'Dettol Original Germ Protection Bathing Soap',
    slug: 'dettol-original-soap-125g-pack4',
    brand: 'Dettol',
    categorySlug: 'personal-care',
    price: 190,
    discountedPrice: 165,
    unit: '125 g (Buy 3 Get 1 Free)',
    stockQuantity: 90,
    isFeatured: true,
    images: [
      'https://images.unsplash.com/photo-1556228720-195a672e8a03?w=600&auto=format&fit=crop&q=80',
    ],
    description: 'Antibacterial bathing bar offering 100% better germ protection for the entire family.',
    tags: ['soap', 'personal care', 'hygiene'],
  },
  {
    name: 'Colgate Strong Teeth Anticavity Toothpaste',
    slug: 'colgate-strong-teeth-500g',
    brand: 'Colgate',
    categorySlug: 'personal-care',
    price: 230,
    discountedPrice: 199,
    unit: '500 g Saver Pack',
    stockQuantity: 85,
    isFeatured: false,
    images: [
      'https://images.unsplash.com/photo-1559591937-e110759f20e8?w=600&auto=format&fit=crop&q=80',
    ],
    description: 'Calcium boost formula that strengthens enamel and provides fresh breath protection all day.',
    tags: ['toothpaste', 'oral care'],
  },

  // 12. Household Cleaning
  {
    name: 'Surf Excel Easy Wash Detergent Powder',
    slug: 'surf-excel-easy-wash-1kg',
    brand: 'Surf Excel',
    categorySlug: 'household-cleaning',
    price: 145,
    discountedPrice: 129,
    unit: '1 kg Pouch',
    stockQuantity: 110,
    isFeatured: true,
    images: [
      'https://images.unsplash.com/photo-1585421514738-01798e348b17?w=600&auto=format&fit=crop&q=80',
    ],
    description: 'Advanced stain removal technology that effortlessly dissolves stubborn collar dirt and oil spots.',
    tags: ['detergent', 'cleaning', 'laundry', 'bestseller'],
  },
  {
    name: 'Vim Dishwash Liquid Gel (Lemon Fresh)',
    slug: 'vim-dishwash-liquid-750ml',
    brand: 'Vim',
    categorySlug: 'household-cleaning',
    price: 160,
    discountedPrice: 139,
    unit: '750 ml Bottle',
    stockQuantity: 95,
    isFeatured: false,
    images: [
      'https://images.unsplash.com/photo-1583947215259-38e31be8751f?w=600&auto=format&fit=crop&q=80',
    ],
    description: 'Powerful degreasing dishwash gel infused with the cleaning power of 100 lemons.',
    tags: ['dishwash', 'cleaning'],
  },

  // 13. Baby Products
  {
    name: 'Pampers All Round Protection Baby Diaper Pants (M)',
    slug: 'pampers-baby-diapers-medium-44',
    brand: 'Pampers',
    categorySlug: 'baby-products',
    price: 699,
    discountedPrice: 589,
    unit: 'Medium (44 Pants)',
    stockQuantity: 40,
    isFeatured: true,
    images: [
      'https://images.unsplash.com/photo-1515488042361-ee00e0ddd4e4?w=600&auto=format&fit=crop&q=80',
    ],
    description: 'Ultra-absorbent diaper pants with anti-rash lotion and up to 12 hours of dry comfort.',
    tags: ['diapers', 'baby care'],
  },
  {
    name: 'Johnson’s Baby Gentle Hair & Body Wash',
    slug: 'johnsons-baby-gentle-wash-200ml',
    brand: 'Johnson’s',
    categorySlug: 'baby-products',
    price: 195,
    discountedPrice: 175,
    unit: '200 ml Bottle',
    stockQuantity: 50,
    isFeatured: false,
    images: [
      'https://images.unsplash.com/photo-1544816155-12df9643f363?w=600&auto=format&fit=crop&q=80',
    ],
    description: 'No more tears formula, dermatologist tested for delicate newborn baby skin.',
    tags: ['baby wash', 'baby care'],
  },
];

export async function seedCatalog() {
  try {
    logger.info('Connecting to database to seed Phase 2 grocery catalog...');
    await connectDatabase();

    logger.info('Seeding 13 grocery categories...');
    const categoryMap: Record<string, any> = {};

    for (const catData of SEED_CATEGORIES) {
      let category = await Category.findOne({ slug: catData.slug });
      if (!category) {
        category = new Category(catData);
        await category.save();
        logger.info(`Created category: ${catData.name}`);
      } else {
        category.name = catData.name;
        category.icon = catData.icon;
        category.displayOrder = catData.displayOrder;
        category.image = catData.image;
        await category.save();
      }
      categoryMap[catData.slug] = category._id;
    }

    logger.info('Seeding grocery products across categories...');
    for (const prodData of SEED_PRODUCTS) {
      const categoryId = categoryMap[prodData.categorySlug];
      if (!categoryId) continue;

      let product = await Product.findOne({ slug: prodData.slug });
      if (!product) {
        product = new Product({
          name: prodData.name,
          slug: prodData.slug,
          brand: prodData.brand,
          category: categoryId,
          price: prodData.price,
          discountedPrice: prodData.discountedPrice,
          unit: prodData.unit,
          stockQuantity: prodData.stockQuantity,
          images: prodData.images,
          isAvailable: true,
          isFeatured: prodData.isFeatured,
          description: prodData.description,
          tags: [...prodData.tags, 'dev-seed'],
        });
        await product.save();
        logger.info(`Created product: ${prodData.name}`);

        // Also create initial inventory tracking entry
        await Inventory.findOneAndUpdate(
          { product: product._id },
          {
            product: product._id,
            currentStock: prodData.stockQuantity,
            reservedStock: 0,
            minThreshold: 10,
            batchNumber: `BATCH-DEV-${Date.now().toString().slice(-4)}`,
            supplierName: 'Paven Central Wholesale Hub',
          },
          { upsert: true, new: true }
        );
      } else {
        product.brand = prodData.brand;
        product.price = prodData.price;
        product.discountedPrice = prodData.discountedPrice;
        product.unit = prodData.unit;
        product.images = prodData.images;
        product.description = prodData.description;
        product.tags = prodData.tags;
        await product.save();
      }
    }

    logger.info('Phase 2 development catalog seeded successfully!');
  } catch (error) {
    logger.error('Failed to seed catalog:', error);
    process.exit(1);
  } finally {
    await disconnectDatabase();
  }
}

if (require.main === module) {
  seedCatalog().then(() => process.exit(0));
}
