import { useState } from 'react';
import { usePosStore } from '../../../store/posStore';
import { Plus, Edit, Trash2, Search, X } from 'lucide-react';

export default function MenuConfiguration() {
  const { 
    categories, menuItems, 
    addCategory, updateCategory, deleteCategory, 
    addMenuItem, updateMenuItem, deleteMenuItem 
  } = usePosStore();

  const [activeCategoryId, setActiveCategoryId] = useState(categories[0]?.id || null);
  const [searchQuery, setSearchQuery] = useState('');

  // Modals state
  const [categoryModal, setCategoryModal] = useState({ isOpen: false, isEdit: false, data: null });
  const [itemModal, setItemModal] = useState({ isOpen: false, isEdit: false, data: null });

  // Category CRUD
  const handleSaveCategory = (e) => {
    e.preventDefault();
    const name = e.target.name.value;
    if (categoryModal.isEdit) {
      updateCategory(categoryModal.data.id, { name });
    } else {
      addCategory({ name });
    }
    setCategoryModal({ isOpen: false, isEdit: false, data: null });
  };

  const handleDeleteCategory = (id) => {
    if (window.confirm('Are you sure you want to delete this category? Associated items will also be removed.')) {
      deleteCategory(id);
      if (activeCategoryId === id) {
        setActiveCategoryId(categories.filter(c => c.id !== id)[0]?.id || null);
      }
    }
  };

  // Item CRUD
  const handleSaveItem = (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const newItem = {
      name: formData.get('name'),
      price: Number(formData.get('price')),
      type: formData.get('type'),
      category_id: Number(formData.get('categoryId')),
      is_available: formData.get('is_available') === 'on'
    };

    if (itemModal.isEdit) {
      updateMenuItem(itemModal.data.id, newItem);
    } else {
      addMenuItem(newItem);
    }
    setItemModal({ isOpen: false, isEdit: false, data: null });
  };

  const handleDeleteItem = (id) => {
    if (window.confirm('Are you sure you want to delete this item?')) {
      deleteMenuItem(id);
    }
  };

  const filteredItems = menuItems
    .filter(i => i.category_id === activeCategoryId)
    .filter(i => i.name.toLowerCase().includes(searchQuery.toLowerCase()));

  return (
    <div className="flex h-[calc(100vh-140px)] w-full -m-6 rounded-xl overflow-hidden">
      {/* Categories Sidebar */}
      <div className="w-1/4 min-w-[250px] bg-surface-900 border-r border-surface-700 flex flex-col">
        <div className="p-4 border-b border-surface-700 flex justify-between items-center bg-surface-900">
          <h2 className="font-bold text-surface-100">Categories</h2>
          <button 
            onClick={() => setCategoryModal({ isOpen: true, isEdit: false, data: null })}
            className="p-1.5 bg-rose-500/30 text-rose-600 rounded hover:bg-rose-200 transition"
            title="Add Category"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto">
          {categories.map(category => (
            <div 
              key={category.id} 
              className={`group flex justify-between items-center p-3 cursor-pointer border-l-4 transition-all ${activeCategoryId === category.id ? 'border-rose-600 bg-rose-500/20' : 'border-transparent hover:bg-surface-900'}`}
              onClick={() => setActiveCategoryId(category.id)}
            >
              <span className={`font-medium ${activeCategoryId === category.id ? 'text-rose-700' : 'text-slate-700'}`}>{category.name}</span>
              <div className="flex space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button 
                  onClick={(e) => { e.stopPropagation(); setCategoryModal({ isOpen: true, isEdit: true, data: category }); }}
                  className="p-1 text-slate-400 hover:text-indigo-600"
                >
                  <Edit className="w-4 h-4" />
                </button>
                <button 
                  onClick={(e) => { e.stopPropagation(); handleDeleteCategory(category.id); }}
                  className="p-1 text-slate-400 hover:text-red-600"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
          {categories.length === 0 && (
            <div className="p-6 text-center text-slate-400 text-sm">No categories found.</div>
          )}
        </div>
      </div>

      {/* Items Area */}
      <div className="flex-1 flex flex-col bg-surface-900">
        <div className="p-4 border-b border-surface-700 bg-surface-900 flex justify-between items-center">
          <div className="relative w-64">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
            <input 
              type="text" 
              placeholder="Search items..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded text-sm focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
            />
          </div>
          <button 
            onClick={() => setItemModal({ isOpen: true, isEdit: false, data: null })}
            className="flex items-center px-4 py-2 bg-rose-600 text-white text-sm font-medium rounded hover:bg-rose-700 transition"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Menu Item
          </button>
        </div>

        <div className="flex-1 overflow-auto p-6">
          {activeCategoryId ? (
            <div className="bg-surface-900 rounded-lg border border-surface-700 shadow-sm overflow-hidden">
              <table className="w-full text-left border-collapse text-sm">
                <thead className="bg-[#f1f5f9] text-surface-300 border-b border-surface-700">
                  <tr>
                    <th className="p-3 font-semibold">Item Name</th>
                    <th className="p-3 font-semibold">Type</th>
                    <th className="p-3 font-semibold">Price (₹)</th>
                    <th className="p-3 font-semibold text-center">Status</th>
                    <th className="p-3 font-semibold text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredItems.map(item => (
                    <tr key={item.id} className="hover:bg-surface-900">
                      <td className="p-3 font-medium text-surface-100">{item.name}</td>
                      <td className="p-3">
                        <span className={`px-2 py-1 text-xs font-semibold rounded-full ${item.type === 'veg' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                          {item.type?.toUpperCase() || 'VEG'}
                        </span>
                      </td>
                      <td className="p-3 font-medium text-slate-700">{item.price.toFixed(2)}</td>
                      <td className="p-3 text-center">
                        <label className="relative inline-flex items-center cursor-pointer select-none">
                          <input 
                            type="checkbox" 
                            checked={item.is_available}
                            onChange={() => {
                              updateMenuItem(item.id, { 
                                name: item.name,
                                price: item.price,
                                type: item.type,
                                category_id: item.category_id,
                                is_available: !item.is_available 
                              });
                            }}
                            className="sr-only peer" 
                          />
                          <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-350 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-orange-500"></div>
                          <span className="ml-2 text-xs font-black text-slate-800">
                            {item.is_available ? 'Available' : 'Unavailable'}
                          </span>
                        </label>
                      </td>
                      <td className="p-3">
                        <div className="flex items-center justify-center space-x-2">
                          <button 
                            onClick={() => setItemModal({ isOpen: true, isEdit: true, data: item })}
                            className="p-1.5 border border-surface-700 text-surface-400 rounded hover:bg-slate-100 hover:text-indigo-600"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button 
                            onClick={() => handleDeleteItem(item.id)}
                            className="p-1.5 border border-surface-700 text-surface-400 rounded hover:bg-slate-100 hover:text-red-600"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {filteredItems.length === 0 && (
                    <tr>
                      <td colSpan="5" className="p-6 text-center text-slate-400">No items found in this category.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="h-full flex items-center justify-center text-slate-400">
              Select a category to view items
            </div>
          )}
        </div>
      </div>

      {/* Category Modal */}
      {categoryModal.isOpen && (
        <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center z-50">
          <div className="bg-surface-900 rounded-xl shadow-xl w-full max-w-md overflow-hidden">
            <div className="p-4 border-b border-surface-700 flex justify-between items-center bg-surface-900">
              <h3 className="font-bold text-surface-100">{categoryModal.isEdit ? 'Edit Category' : 'Add Category'}</h3>
              <button onClick={() => setCategoryModal({ isOpen: false, isEdit: false, data: null })} className="text-slate-400 hover:text-surface-300">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSaveCategory} className="p-4 space-y-4">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Category Name</label>
                <input 
                  type="text" 
                  name="name" 
                  required 
                  defaultValue={categoryModal.data?.name || ''} 
                  className="w-full border border-slate-300 rounded-md p-2 text-sm focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                  placeholder="e.g., Beverages"
                />
              </div>
              <div className="flex justify-end space-x-2 pt-2">
                <button type="button" onClick={() => setCategoryModal({ isOpen: false, isEdit: false, data: null })} className="px-4 py-2 border border-slate-300 rounded text-sm font-medium text-surface-300 hover:bg-surface-900">Cancel</button>
                <button type="submit" className="px-4 py-2 bg-rose-600 text-white rounded text-sm font-medium hover:bg-rose-700">Save Category</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Item Modal */}
      {itemModal.isOpen && (
        <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center z-50">
          <div className="bg-surface-900 rounded-xl shadow-xl w-full max-w-lg overflow-hidden">
            <div className="p-4 border-b border-surface-700 flex justify-between items-center bg-surface-900">
              <h3 className="font-bold text-surface-100">{itemModal.isEdit ? 'Edit Menu Item' : 'Add Menu Item'}</h3>
              <button onClick={() => setItemModal({ isOpen: false, isEdit: false, data: null })} className="text-slate-400 hover:text-surface-300">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSaveItem} className="p-4 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="block text-sm font-semibold text-slate-700 mb-1">Item Name</label>
                  <input type="text" name="name" required defaultValue={itemModal.data?.name || ''} className="w-full border border-slate-300 rounded-md p-2 text-sm focus:outline-none focus:border-indigo-500" />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">Price (₹)</label>
                  <input type="number" name="price" required min="0" step="0.01" defaultValue={itemModal.data?.price || ''} className="w-full border border-slate-300 rounded-md p-2 text-sm focus:outline-none focus:border-indigo-500" />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">Category</label>
                  <select name="categoryId" required defaultValue={itemModal.data?.category_id || activeCategoryId || categories[0]?.id} className="w-full border border-slate-300 rounded-md p-2 text-sm focus:outline-none focus:border-indigo-500 bg-surface-900">
                    {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">Type</label>
                  <select name="type" required defaultValue={itemModal.data?.type || 'veg'} className="w-full border border-slate-300 rounded-md p-2 text-sm focus:outline-none focus:border-indigo-500 bg-surface-900">
                    <option value="veg">Veg</option>
                    <option value="non-veg">Non-Veg</option>
                  </select>
                </div>
                <div className="flex items-center pt-6">
                  <label className="flex items-center cursor-pointer">
                    <input type="checkbox" name="is_available" defaultChecked={itemModal.data ? itemModal.data.is_available : true} className="w-4 h-4 text-rose-600 border-slate-300 rounded focus:ring-rose-500" />
                    <span className="ml-2 text-sm font-medium text-slate-700">Available for order</span>
                  </label>
                </div>
              </div>
              <div className="flex justify-end space-x-2 pt-4 border-t border-surface-700 mt-4">
                <button type="button" onClick={() => setItemModal({ isOpen: false, isEdit: false, data: null })} className="px-4 py-2 border border-slate-300 rounded text-sm font-medium text-surface-300 hover:bg-surface-900">Cancel</button>
                <button type="submit" className="px-4 py-2 bg-rose-600 text-white rounded text-sm font-medium hover:bg-rose-700">Save Item</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
