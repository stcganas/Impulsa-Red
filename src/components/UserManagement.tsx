import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Search, Loader2, Trash2, Edit2, Play, Pause, ChevronDown, ChevronUp, Mail, Phone, MapPin, Calendar, Award, CheckSquare, Wallet, Users, Hash, Shield, X } from 'lucide-react';

interface UserData {
  id: string;
  name: string;
  email: string;
  role: string;
  status: string;
  created_at: string;
  level?: number;
  plan?: string;
  referral_code?: string;
  phone?: string;
  address?: string;
  avatar_url?: string;
  completedTasks?: number;
  walletBalance?: number;
  referralCount?: number;
}

export default function UserManagement() {
  const [users, setUsers] = useState<UserData[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('todos');
  const [expandedUserId, setExpandedUserId] = useState<string | null>(null);
  
  // Edit Modal State
  const [isEditMode, setIsEditMode] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserData | null>(null);
  const [editFormData, setEditFormData] = useState({ name: '', email: '', role: '', phone: '', address: '' });

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('No session');

      const response = await fetch('/api/admin/users', {
        headers: { 'Authorization': `Bearer ${session.access_token}` }
      });

      if (!response.ok) throw new Error('Error fetching users');

      const usersData = await response.json();
      setUsers(usersData || []);
    } catch (error) {
      console.error("Error fetching users:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleUserAction = async (id: string, action: string, data?: any) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('No session');

      let url = `/api/admin/users/${id}`;
      let method = 'PATCH';
      let body = data;

      if (action === 'delete') {
        method = 'DELETE';
      }

      const response = await fetch(url, {
        method,
        headers: { 
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        },
        body: body ? JSON.stringify(body) : undefined
      });

      if (!response.ok) throw new Error(`Error performing ${action}`);
      
      fetchUsers();
      setIsEditMode(false);
      setSelectedUser(null);
    } catch (error) {
      console.error(`Error performing ${action}:`, error);
      alert('Error al realizar la acción');
    }
  };

  const filteredUsers = users.filter(u => 
    (roleFilter === 'todos' || u.role === roleFilter) &&
    (u.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.id.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const toggleExpand = (id: string) => {
    setExpandedUserId(expandedUserId === id ? null : id);
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0
    }).format(amount);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4">
        <div className="flex justify-between items-center">
          <h2 className="text-2xl font-bold">Gestión de Usuarios</h2>
          <div className="bg-white/5 px-4 py-2 rounded-full border border-white/5 flex items-center gap-2 w-64 focus-within:border-emerald-500/50 transition-colors">
            <Search className="w-4 h-4 text-slate-500" />
            <input 
              type="text" 
              placeholder="Buscar por nombre, email o ID..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="bg-transparent border-none focus:ring-0 text-sm w-full placeholder:text-slate-600 outline-none"
            />
          </div>
        </div>
        
        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
          {['todos', 'admin', 'user', 'leader', 'referral'].map(role => (
            <button
              key={role}
              onClick={() => setRoleFilter(role)}
              className={`px-4 py-2 rounded-full text-xs font-bold capitalize transition-all ${
                roleFilter === role 
                  ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/20' 
                  : 'bg-white/5 text-slate-400 hover:bg-white/10'
              }`}
            >
              {role}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="w-10 h-10 text-emerald-500 animate-spin" />
        </div>
      ) : (
        <div className="grid gap-4">
          {filteredUsers.map((user) => (
            <div 
              key={user.id} 
              className={`bg-[#111] border transition-all duration-300 overflow-hidden ${
                expandedUserId === user.id 
                  ? 'border-emerald-500/30 shadow-lg shadow-emerald-500/5 rounded-2xl' 
                  : 'border-white/5 hover:border-white/10 rounded-xl'
              }`}
            >
              {/* Collapsed Header */}
              <div 
                className="p-4 flex items-center justify-between cursor-pointer select-none"
                onClick={() => toggleExpand(user.id)}
              >
                <div className="flex items-center gap-4">
                  {user.avatar_url ? (
                    <img src={user.avatar_url} alt={user.name} className="w-12 h-12 rounded-full object-cover border border-white/10" />
                  ) : (
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-emerald-500/20 to-blue-500/20 border border-white/5 flex items-center justify-center text-emerald-500 font-bold text-lg">
                      {user.name?.charAt(0).toUpperCase() || 'U'}
                    </div>
                  )}
                  <div>
                    <h3 className="font-bold text-base flex items-center gap-2">
                      {user.name || 'Usuario Sin Nombre'}
                      {user.role === 'admin' && <Shield className="w-3.5 h-3.5 text-emerald-500" />}
                    </h3>
                    <p className="text-xs text-slate-500 font-mono mt-0.5">ID: {user.id.substring(0, 8)}...</p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                    user.status === 'active' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-amber-500/10 text-amber-500'
                  }`}>
                    {user.status || 'active'}
                  </div>
                  <button className="p-2 text-slate-400 hover:text-white transition-colors rounded-full hover:bg-white/5">
                    {expandedUserId === user.id ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              {/* Expanded Content */}
              {expandedUserId === user.id && (
                <div className="px-4 pb-4 pt-2 border-t border-white/5 bg-black/20">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 p-4">
                    
                    {/* Personal Info */}
                    <div className="space-y-4">
                      <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Información Personal</h4>
                      <div className="space-y-3">
                        <div className="flex items-start gap-3">
                          <Mail className="w-4 h-4 text-slate-400 mt-0.5" />
                          <div>
                            <p className="text-[10px] text-slate-500">Email</p>
                            <p className="text-sm font-medium">{user.email}</p>
                          </div>
                        </div>
                        <div className="flex items-start gap-3">
                          <Phone className="w-4 h-4 text-slate-400 mt-0.5" />
                          <div>
                            <p className="text-[10px] text-slate-500">Teléfono</p>
                            <p className="text-sm font-medium">{user.phone || 'No especificado'}</p>
                          </div>
                        </div>
                        <div className="flex items-start gap-3">
                          <MapPin className="w-4 h-4 text-slate-400 mt-0.5" />
                          <div>
                            <p className="text-[10px] text-slate-500">Dirección</p>
                            <p className="text-sm font-medium">{user.address || 'No especificada'}</p>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Platform Stats */}
                    <div className="space-y-4">
                      <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Estadísticas</h4>
                      <div className="space-y-3">
                        <div className="flex items-start gap-3">
                          <Award className="w-4 h-4 text-emerald-500 mt-0.5" />
                          <div>
                            <p className="text-[10px] text-slate-500">Nivel</p>
                            <p className="text-sm font-medium">Nivel {user.level || 1} ({user.plan || 'Free'})</p>
                          </div>
                        </div>
                        <div className="flex items-start gap-3">
                          <CheckSquare className="w-4 h-4 text-blue-500 mt-0.5" />
                          <div>
                            <p className="text-[10px] text-slate-500">Tareas Completadas</p>
                            <p className="text-sm font-medium">{user.completedTasks || 0} tareas</p>
                          </div>
                        </div>
                        <div className="flex items-start gap-3">
                          <Wallet className="w-4 h-4 text-amber-500 mt-0.5" />
                          <div>
                            <p className="text-[10px] text-slate-500">Saldo de Billetera</p>
                            <p className="text-sm font-medium">{formatCurrency(user.walletBalance || 0)}</p>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Account Details */}
                    <div className="space-y-4">
                      <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Detalles de Cuenta</h4>
                      <div className="space-y-3">
                        <div className="flex items-start gap-3">
                          <Calendar className="w-4 h-4 text-slate-400 mt-0.5" />
                          <div>
                            <p className="text-[10px] text-slate-500">Fecha de Registro</p>
                            <p className="text-sm font-medium">{formatDate(user.created_at)}</p>
                          </div>
                        </div>
                        <div className="flex items-start gap-3">
                          <Users className="w-4 h-4 text-purple-500 mt-0.5" />
                          <div>
                            <p className="text-[10px] text-slate-500">Referidos</p>
                            <p className="text-sm font-medium">{user.referralCount || 0} usuarios</p>
                          </div>
                        </div>
                        <div className="flex items-start gap-3">
                          <Hash className="w-4 h-4 text-slate-400 mt-0.5" />
                          <div>
                            <p className="text-[10px] text-slate-500">Código de Referencia</p>
                            <p className="text-sm font-mono bg-white/5 px-2 py-0.5 rounded mt-0.5">{user.referral_code || 'N/A'}</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Actions Bar */}
                  <div className="mt-4 pt-4 border-t border-white/5 flex flex-wrap gap-3 justify-end">
                    <button 
                      onClick={() => { 
                        setSelectedUser(user); 
                        setIsEditMode(true); 
                        setEditFormData({ 
                          name: user.name || '', 
                          email: user.email || '', 
                          role: user.role || 'user',
                          phone: user.phone || '',
                          address: user.address || ''
                        }); 
                      }} 
                      className="flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 rounded-lg text-sm font-medium transition-colors"
                    >
                      <Edit2 className="w-4 h-4 text-blue-400" /> Editar
                    </button>
                    
                    <button 
                      onClick={() => handleUserAction(user.id, 'update', { status: user.status === 'active' ? 'paused' : 'active' })} 
                      className="flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 rounded-lg text-sm font-medium transition-colors"
                    >
                      {user.status === 'active' ? (
                        <><Pause className="w-4 h-4 text-amber-400" /> Pausar</>
                      ) : (
                        <><Play className="w-4 h-4 text-emerald-400" /> Activar</>
                      )}
                    </button>
                    
                    <button 
                      onClick={() => { if(confirm('¿Estás seguro de que deseas eliminar este usuario permanentemente?')) handleUserAction(user.id, 'delete') }} 
                      className="flex items-center gap-2 px-4 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-500 rounded-lg text-sm font-medium transition-colors"
                    >
                      <Trash2 className="w-4 h-4" /> Eliminar
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
          
          {filteredUsers.length === 0 && (
            <div className="text-center py-12 bg-[#111] rounded-2xl border border-white/5">
              <p className="text-slate-500">No se encontraron usuarios que coincidan con la búsqueda.</p>
            </div>
          )}
        </div>
      )}

      {/* Edit Modal */}
      {isEditMode && selectedUser && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-[#111] rounded-3xl border border-white/10 p-6 w-full max-w-md shadow-2xl">
            <div className="flex justify-between items-center mb-6">
              <h3 className="font-bold text-xl">Editar Usuario</h3>
              <button onClick={() => setIsEditMode(false)} className="p-2 hover:bg-white/5 rounded-full transition-colors">
                <X className="w-5 h-5 text-slate-500" />
              </button>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="text-xs text-slate-500 ml-1 mb-1 block">Nombre Completo</label>
                <input 
                  className="w-full bg-white/5 border border-white/10 focus:border-emerald-500/50 p-3 rounded-xl outline-none transition-colors" 
                  value={editFormData.name} 
                  onChange={e => setEditFormData({...editFormData, name: e.target.value})} 
                  placeholder="Nombre" 
                />
              </div>
              
              <div>
                <label className="text-xs text-slate-500 ml-1 mb-1 block">Correo Electrónico</label>
                <input 
                  className="w-full bg-white/5 border border-white/10 focus:border-emerald-500/50 p-3 rounded-xl outline-none transition-colors" 
                  value={editFormData.email} 
                  onChange={e => setEditFormData({...editFormData, email: e.target.value})} 
                  placeholder="Email" 
                  disabled
                />
                <p className="text-[10px] text-slate-500 mt-1 ml-1">El correo no se puede modificar por seguridad.</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-slate-500 ml-1 mb-1 block">Teléfono</label>
                  <input 
                    className="w-full bg-white/5 border border-white/10 focus:border-emerald-500/50 p-3 rounded-xl outline-none transition-colors" 
                    value={editFormData.phone} 
                    onChange={e => setEditFormData({...editFormData, phone: e.target.value})} 
                    placeholder="Teléfono" 
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-500 ml-1 mb-1 block">Rol</label>
                  <select 
                    className="w-full bg-white/5 border border-white/10 focus:border-emerald-500/50 p-3 rounded-xl outline-none transition-colors appearance-none" 
                    value={editFormData.role} 
                    onChange={e => setEditFormData({...editFormData, role: e.target.value})}
                  >
                    <option value="user">User</option>
                    <option value="admin">Admin</option>
                    <option value="leader">Leader</option>
                    <option value="referral">Referral</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-xs text-slate-500 ml-1 mb-1 block">Dirección</label>
                <input 
                  className="w-full bg-white/5 border border-white/10 focus:border-emerald-500/50 p-3 rounded-xl outline-none transition-colors" 
                  value={editFormData.address} 
                  onChange={e => setEditFormData({...editFormData, address: e.target.value})} 
                  placeholder="Dirección completa" 
                />
              </div>
              
              <div className="pt-4 flex gap-3">
                <button 
                  onClick={() => setIsEditMode(false)} 
                  className="flex-1 py-3 bg-white/5 hover:bg-white/10 rounded-xl font-bold transition-colors"
                >
                  Cancelar
                </button>
                <button 
                  onClick={() => handleUserAction(selectedUser.id, 'update', editFormData)} 
                  className="flex-1 py-3 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl font-bold transition-colors shadow-lg shadow-emerald-500/20"
                >
                  Guardar Cambios
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
