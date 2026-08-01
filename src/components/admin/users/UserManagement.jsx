import { useState } from 'react';
import { useAuthStore } from '../../../store/authStore';
import { usePosStore } from '../../../store/posStore';
import { UserPlus, Trash2, Shield, Store, Coffee, ChefHat } from 'lucide-react';

export default function UserManagement() {
  const { users, addUser, deleteUser, user: currentUser } = useAuthStore();
  const { locations } = usePosStore();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedRole, setSelectedRole] = useState('waiter');

  const handleAddUser = (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const roleVal = formData.get('role');
    const newUser = {
      name: formData.get('name'),
      email: formData.get('email'),
      role: roleVal,
      password: formData.get('password'),
      location_id: roleVal === 'waiter' ? (formData.get('location_id') ? parseInt(formData.get('location_id'), 10) : null) : null
    };
    addUser(newUser);
    setIsModalOpen(false);
    setSelectedRole('waiter');
  };

  const handleDelete = (id) => {
    if (id === currentUser.id) {
      alert("You cannot delete yourself.");
      return;
    }
    if (window.confirm("Are you sure you want to delete this user?")) {
      deleteUser(id);
    }
  };

  const getRoleIcon = (role) => {
    switch(role) {
      case 'admin': return <Shield className="w-4 h-4 text-indigo-500" />;
      case 'manager': return <Store className="w-4 h-4 text-teal-500" />;
      case 'waiter': return <Coffee className="w-4 h-4 text-amber-500" />;
      case 'kitchen_manager': return <ChefHat className="w-4 h-4 text-rose-500" />;
      default: return null;
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-140px)] w-full -m-6 rounded-xl overflow-hidden bg-surface-900">
      <div className="bg-surface-900 border-b border-surface-700 p-4 flex justify-between items-center">
        <div>
          <h2 className="text-lg font-bold text-surface-100">User Management</h2>
          <p className="text-xs text-surface-400 mt-1">Manage staff access and roles across the POS</p>
        </div>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="flex items-center px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded hover:bg-indigo-700 transition"
        >
          <UserPlus className="w-4 h-4 mr-2" />
          Add User
        </button>
      </div>

      <div className="flex-1 p-6 overflow-auto">
        <div className="bg-surface-900 rounded-lg border border-surface-700 shadow-sm overflow-hidden max-w-5xl mx-auto">
          <table className="w-full text-left border-collapse text-sm">
            <thead className="bg-[#f1f5f9] text-surface-300 border-b border-surface-700">
              <tr>
                <th className="p-4 font-semibold">User Details</th>
                <th className="p-4 font-semibold">Role</th>
                <th className="p-4 font-semibold text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {users.map(user => (
                <tr key={user.id} className="hover:bg-surface-900 transition-colors">
                  <td className="p-4">
                    <div className="flex items-center">
                      <div className="w-10 h-10 rounded-full bg-indigo-100 text-indigo-700 font-bold flex items-center justify-center mr-3">
                        {user.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <div className="font-semibold text-surface-100">{user.name} {user.id === currentUser.id && <span className="ml-2 text-xs font-normal text-slate-400">(You)</span>}</div>
                        <div className="text-xs text-surface-400">{user.email}</div>
                      </div>
                    </div>
                  </td>
                  <td className="p-4">
                    <div className="flex items-center space-x-2">
                      {getRoleIcon(user.role)}
                      <span className="font-medium text-slate-700 capitalize">
                        {user.role.replace('_', ' ')}
                        {user.role === 'waiter' && user.location_id && (
                          <span className="ml-2 text-xs bg-orange-100 text-orange-700 px-1.5 py-0.5 rounded font-black">
                            {locations.find(l => l.id === user.location_id)?.name || 'Mapped Area'}
                          </span>
                        )}
                      </span>
                    </div>
                  </td>
                  <td className="p-4 text-center">
                    <button 
                      onClick={() => handleDelete(user.id)}
                      disabled={user.id === currentUser.id}
                      className="p-2 text-slate-400 hover:text-red-600 rounded-lg hover:bg-red-50 disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
                      title="Delete User"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add User Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center z-50 px-4">
          <div className="bg-surface-900 rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
            <div className="px-6 py-4 border-b border-surface-700 flex justify-between items-center">
              <h3 className="font-bold text-lg text-surface-100">Add New User</h3>
            </div>
            <form onSubmit={handleAddUser} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Full Name</label>
                <input type="text" name="name" required className="w-full border border-slate-300 rounded-lg p-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent" placeholder="e.g. John Doe" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Email Address</label>
                <input type="email" name="email" required className="w-full border border-slate-300 rounded-lg p-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent" placeholder="john@appthat.com" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Assign Role</label>
                <select 
                  name="role" 
                  value={selectedRole}
                  onChange={(e) => setSelectedRole(e.target.value)}
                  required 
                  className="w-full border border-slate-300 rounded-lg p-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-surface-900"
                >
                  <option value="waiter">Waiter</option>
                  <option value="kitchen_manager">Kitchen Manager</option>
                  <option value="manager">Store Manager</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
              {selectedRole === 'waiter' && (
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">Assign Area/Location</label>
                  <select name="location_id" className="w-full border border-slate-300 rounded-lg p-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-surface-900">
                    <option value="">All Areas (General)</option>
                    {locations.map(loc => (
                      <option key={loc.id} value={loc.id}>{loc.name}</option>
                    ))}
                  </select>
                </div>
              )}
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Temporary Password</label>
                <input type="password" name="password" required className="w-full border border-slate-300 rounded-lg p-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent" placeholder="••••••••" />
              </div>
              <div className="flex justify-end space-x-3 pt-4 mt-2">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 rounded-lg text-sm font-medium text-surface-300 hover:bg-slate-100 transition">Cancel</button>
                <button type="submit" className="px-6 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 shadow-sm transition">Create User</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
