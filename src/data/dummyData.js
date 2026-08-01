export const dummyLocations = [
  { id: 1, name: 'Main Hall', description: 'Indoor AC dining area' },
  { id: 2, name: 'Garden', description: 'Outdoor open-air dining' },
  { id: 3, name: 'Pool Side', description: 'Premium tables near the pool' },
];

export const dummyTables = [
  { id: 1, location_id: 1, table_number: 'T1', status: 'available' },
  { id: 2, location_id: 1, table_number: 'T2', status: 'occupied' },
  { id: 3, location_id: 1, table_number: 'T3', status: 'available' },
  { id: 4, location_id: 2, table_number: 'G1', status: 'available' },
  { id: 5, location_id: 2, table_number: 'G2', status: 'reserved' },
  { id: 6, location_id: 3, table_number: 'P1', status: 'available' },
];

export const dummyCategories = [
  { id: 1, name: 'Starters', display_order: 1 },
  { id: 2, name: 'Main Course', display_order: 2 },
  { id: 3, name: 'Breads', display_order: 3 },
  { id: 4, name: 'Desserts', display_order: 4 },
  { id: 5, name: 'Beverages', display_order: 5 },
];

export const dummyMenuItems = [
  { id: 1, category_id: 1, name: 'Paneer Tikka', price: 250, is_available: true, description: 'Grilled cottage cheese' },
  { id: 2, category_id: 1, name: 'Crispy Corn', price: 180, is_available: true, description: 'Fried corn with spices' },
  { id: 3, category_id: 1, name: 'Chicken 65', price: 300, is_available: true, description: 'Spicy deep-fried chicken' },
  
  { id: 4, category_id: 2, name: 'Butter Chicken', price: 450, is_available: true, description: 'Rich tomato gravy' },
  { id: 5, category_id: 2, name: 'Dal Makhani', price: 320, is_available: true, description: 'Slow cooked black lentils' },
  { id: 6, category_id: 2, name: 'Mutton Rogan Josh', price: 550, is_available: true, description: 'Kashmiri style mutton' },

  { id: 7, category_id: 3, name: 'Butter Naan', price: 50, is_available: true, description: '' },
  { id: 8, category_id: 3, name: 'Garlic Naan', price: 70, is_available: true, description: '' },
  { id: 9, category_id: 3, name: 'Tandoori Roti', price: 30, is_available: true, description: '' },

  { id: 10, category_id: 4, name: 'Gulab Jamun', price: 120, is_available: true, description: '2 pieces' },
  { id: 11, category_id: 4, name: 'Chocolate Brownie', price: 180, is_available: true, description: 'With vanilla ice cream' },

  { id: 12, category_id: 5, name: 'Fresh Lime Soda', price: 90, is_available: true, description: 'Sweet or Salted' },
  { id: 13, category_id: 5, name: 'Mango Lassi', price: 120, is_available: true, description: 'Sweet yogurt drink' },
];

export const dummyOrders = [
  {
    id: 101, // Mock DB ID
    table_id: 2, // Corresponds to T2 which is occupied
    status: 'open',
    subtotal: 500,
    tax_amount: 25,
    total_amount: 525,
    items: [
      { id: 1, menu_item_id: 1, quantity: 2, status: 'served', name: 'Paneer Tikka', price: 250 }
    ]
  }
];
