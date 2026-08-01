import { useState } from 'react';
import { usePosStore } from '../../../store/posStore';
import { Plus, Edit, Trash2, X } from 'lucide-react';

export default function TableConfiguration() {
  const { 
    locations, tables, 
    addLocation, updateLocation, deleteLocation, 
    addTable, updateTable, deleteTable 
  } = usePosStore();

  const [activeLocationId, setActiveLocationId] = useState(locations[0]?.id || null);

  // Modals state
  const [areaModal, setAreaModal] = useState({ isOpen: false, isEdit: false, data: null });
  const [tableModal, setTableModal] = useState({ isOpen: false, isEdit: false, data: null });

  // Area (Location) CRUD
  const handleSaveArea = (e) => {
    e.preventDefault();
    const name = e.target.name.value;
    if (areaModal.isEdit) {
      updateLocation(areaModal.data.id, { name });
    } else {
      addLocation({ name });
    }
    setAreaModal({ isOpen: false, isEdit: false, data: null });
  };

  const handleDeleteArea = (id) => {
    if (window.confirm('Are you sure you want to delete this area? Associated tables will also be removed.')) {
      deleteLocation(id);
      if (activeLocationId === id) {
        setActiveLocationId(locations.filter(l => l.id !== id)[0]?.id || null);
      }
    }
  };

  // Table CRUD
  const handleSaveTable = (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const newTable = {
      table_number: formData.get('table_number'),
      capacity: Number(formData.get('capacity')),
      location_id: Number(formData.get('location_id'))
    };

    if (tableModal.isEdit) {
      updateTable(tableModal.data.id, newTable);
    } else {
      addTable(newTable);
    }
    setTableModal({ isOpen: false, isEdit: false, data: null });
  };

  const handleDeleteTable = (id) => {
    if (window.confirm('Are you sure you want to delete this table?')) {
      deleteTable(id);
    }
  };

  const filteredTables = tables.filter(t => t.location_id === activeLocationId);

  return (
    <div className="flex flex-col h-[calc(100vh-140px)] w-full -m-6 rounded-xl overflow-hidden bg-surface-900">
      
      {/* Top Header / Areas */}
      <div className="bg-surface-900 border-b border-surface-700 p-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-surface-100">Table & Area Configuration</h2>
          <button 
            onClick={() => setAreaModal({ isOpen: true, isEdit: false, data: null })}
            className="flex items-center px-3 py-1.5 bg-rose-500/30 text-rose-700 text-sm font-medium rounded hover:bg-rose-200 transition"
          >
            <Plus className="w-4 h-4 mr-1" />
            Add Area
          </button>
        </div>
        
        <div className="flex space-x-2 overflow-x-auto pb-2">
          {locations.map(location => (
            <div 
              key={location.id}
              className={`group flex items-center shrink-0 px-4 py-2 border rounded-full cursor-pointer transition-colors ${activeLocationId === location.id ? 'border-rose-600 bg-rose-500/20 text-rose-700 font-semibold' : 'border-slate-300 bg-surface-900 text-surface-300 hover:bg-surface-900'}`}
              onClick={() => setActiveLocationId(location.id)}
            >
              <span>{location.name}</span>
              <div className="flex ml-2 space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button onClick={(e) => { e.stopPropagation(); setAreaModal({ isOpen: true, isEdit: true, data: location }); }} className="text-slate-400 hover:text-indigo-600">
                  <Edit className="w-3.5 h-3.5" />
                </button>
                <button onClick={(e) => { e.stopPropagation(); handleDeleteArea(location.id); }} className="text-slate-400 hover:text-red-600">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
          {locations.length === 0 && (
            <div className="text-sm text-surface-400 py-2">No areas found. Add an area to get started.</div>
          )}
        </div>
      </div>

      {/* Tables Grid */}
      <div className="flex-1 p-6 overflow-auto">
        {activeLocationId ? (
          <div>
            <div className="flex justify-between items-center mb-6">
              <h3 className="font-semibold text-slate-700">Tables in {locations.find(l => l.id === activeLocationId)?.name}</h3>
              <button 
                onClick={() => setTableModal({ isOpen: true, isEdit: false, data: null })}
                className="flex items-center px-4 py-2 bg-rose-600 text-white text-sm font-medium rounded hover:bg-rose-700 transition"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Table
              </button>
            </div>
            
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
              {filteredTables.map(table => (
                <div key={table.id} className="bg-surface-900 border border-surface-700 rounded-xl p-4 shadow-sm flex flex-col items-center relative group">
                  <div className="absolute top-2 right-2 flex space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => setTableModal({ isOpen: true, isEdit: true, data: table })} className="p-1 text-slate-400 hover:text-indigo-600 bg-surface-900 rounded">
                      <Edit className="w-3 h-3" />
                    </button>
                    <button onClick={() => handleDeleteTable(table.id)} className="p-1 text-slate-400 hover:text-red-600 bg-surface-900 rounded">
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                  <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-3 border-4 border-white shadow-sm">
                    <span className="text-xl font-bold text-slate-700">{table.table_number || table.name}</span>
                  </div>
                  <span className="text-xs font-semibold text-surface-400 uppercase tracking-wider">{table.capacity} Seats</span>
                </div>
              ))}
            </div>
            {filteredTables.length === 0 && (
              <div className="flex flex-col items-center justify-center py-12 text-slate-400">
                <div className="w-16 h-16 border-2 border-dashed border-slate-300 rounded-full flex items-center justify-center mb-3">
                  <span className="text-slate-300">T</span>
                </div>
                <p>No tables configured for this area.</p>
              </div>
            )}
          </div>
        ) : (
           <div className="h-full flex items-center justify-center text-slate-400">
              Select or create an area to manage tables
            </div>
        )}
      </div>

      {/* Area Modal */}
      {areaModal.isOpen && (
        <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center z-50">
          <div className="bg-surface-900 rounded-xl shadow-xl w-full max-w-sm overflow-hidden">
            <div className="p-4 border-b border-surface-700 flex justify-between items-center bg-surface-900">
              <h3 className="font-bold text-surface-100">{areaModal.isEdit ? 'Edit Area' : 'Add Area'}</h3>
              <button onClick={() => setAreaModal({ isOpen: false, isEdit: false, data: null })} className="text-slate-400 hover:text-surface-300">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSaveArea} className="p-4 space-y-4">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Area Name</label>
                <input 
                  type="text" 
                  name="name" 
                  required 
                  defaultValue={areaModal.data?.name || ''} 
                  className="w-full border border-slate-300 rounded-md p-2 text-sm focus:outline-none focus:border-indigo-500"
                  placeholder="e.g., Rooftop"
                />
              </div>
              <div className="flex justify-end space-x-2 pt-2">
                <button type="button" onClick={() => setAreaModal({ isOpen: false, isEdit: false, data: null })} className="px-4 py-2 border border-slate-300 rounded text-sm font-medium text-surface-300 hover:bg-surface-900">Cancel</button>
                <button type="submit" className="px-4 py-2 bg-rose-600 text-white rounded text-sm font-medium hover:bg-rose-700">Save</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Table Modal */}
      {tableModal.isOpen && (
        <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center z-50">
          <div className="bg-surface-900 rounded-xl shadow-xl w-full max-w-sm overflow-hidden">
            <div className="p-4 border-b border-surface-700 flex justify-between items-center bg-surface-900">
              <h3 className="font-bold text-surface-100">{tableModal.isEdit ? 'Edit Table' : 'Add Table'}</h3>
              <button onClick={() => setTableModal({ isOpen: false, isEdit: false, data: null })} className="text-slate-400 hover:text-surface-300">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSaveTable} className="p-4 space-y-4">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Table Name / Number</label>
                <input type="text" name="table_number" required defaultValue={tableModal.data?.table_number || tableModal.data?.name || ''} className="w-full border border-slate-300 rounded-md p-2 text-sm focus:outline-none focus:border-indigo-500" placeholder="e.g., T1" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Seating Capacity</label>
                <input type="number" name="capacity" required min="1" defaultValue={tableModal.data?.capacity || 4} className="w-full border border-slate-300 rounded-md p-2 text-sm focus:outline-none focus:border-indigo-500" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Area</label>
                <select name="location_id" required defaultValue={tableModal.data?.location_id || activeLocationId || locations[0]?.id} className="w-full border border-slate-300 rounded-md p-2 text-sm focus:outline-none focus:border-indigo-500 bg-surface-900">
                  {locations.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
                </select>
              </div>
              <div className="flex justify-end space-x-2 pt-4 mt-2 border-t border-surface-700">
                <button type="button" onClick={() => setTableModal({ isOpen: false, isEdit: false, data: null })} className="px-4 py-2 border border-slate-300 rounded text-sm font-medium text-surface-300 hover:bg-surface-900">Cancel</button>
                <button type="submit" className="px-4 py-2 bg-rose-600 text-white rounded text-sm font-medium hover:bg-rose-700">Save</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
