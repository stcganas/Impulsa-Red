import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Plus, Edit2, Trash2, Loader2, X, CheckCircle } from 'lucide-react';

interface Task {
  id: string;
  day: string;
  name: string;
  xp: number;
  created_at: string;
}

export default function TaskManagement() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  
  const [formData, setFormData] = useState({
    day: '1',
    name: '',
    xp: 100
  });

  useEffect(() => {
    fetchTasks();
  }, []);

  const fetchTasks = async () => {
    try {
      const { data, error } = await supabase
        .from('tasks')
        .select('*')
        .order('day', { ascending: true });
        
      if (error) throw error;
      setTasks(data || []);
    } catch (error) {
      console.error('Error fetching tasks:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingTask) {
        const { error } = await supabase
          .from('tasks')
          .update({
            day: formData.day,
            name: formData.name,
            xp: formData.xp
          })
          .eq('id', editingTask.id);
          
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('tasks')
          .insert([{
            day: formData.day,
            name: formData.name,
            xp: formData.xp
          }]);
          
        if (error) throw error;
      }
      
      setIsModalOpen(false);
      setEditingTask(null);
      setFormData({ day: '1', name: '', xp: 100 });
      fetchTasks();
    } catch (error) {
      console.error('Error saving task:', error);
      alert('Error al guardar la tarea');
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('¿Estás seguro de eliminar esta tarea?')) return;
    
    try {
      const { error } = await supabase
        .from('tasks')
        .delete()
        .eq('id', id);
        
      if (error) throw error;
      fetchTasks();
    } catch (error) {
      console.error('Error deleting task:', error);
      alert('Error al eliminar la tarea');
    }
  };

  const openEditModal = (task: Task) => {
    setEditingTask(task);
    setFormData({
      day: task.day,
      name: task.name,
      xp: task.xp
    });
    setIsModalOpen(true);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="w-8 h-8 text-emerald-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Gestión de Tareas</h2>
          <p className="text-slate-400 text-sm">Administra las tareas diarias para los usuarios.</p>
        </div>
        <button
          onClick={() => {
            setEditingTask(null);
            setFormData({ day: '1', name: '', xp: 100 });
            setIsModalOpen(true);
          }}
          className="flex items-center gap-2 px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl font-bold transition-colors"
        >
          <Plus className="w-4 h-4" /> Nueva Tarea
        </button>
      </div>

      <div className="bg-[#111] rounded-2xl border border-white/5 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-white/5 text-slate-400">
              <tr>
                <th className="p-4 font-medium">Día</th>
                <th className="p-4 font-medium">Nombre de la Tarea</th>
                <th className="p-4 font-medium">XP</th>
                <th className="p-4 font-medium text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {tasks.length === 0 ? (
                <tr>
                  <td colSpan={4} className="p-8 text-center text-slate-500">
                    No hay tareas configuradas.
                  </td>
                </tr>
              ) : (
                tasks.map((task) => (
                  <tr key={task.id} className="hover:bg-white/5 transition-colors">
                    <td className="p-4">
                      <span className="bg-white/10 px-2 py-1 rounded text-xs font-bold">Día {task.day}</span>
                    </td>
                    <td className="p-4 font-medium">{task.name}</td>
                    <td className="p-4 text-emerald-500 font-bold">+{task.xp} XP</td>
                    <td className="p-4 flex justify-end gap-2">
                      <button
                        onClick={() => openEditModal(task)}
                        className="p-2 bg-blue-500/10 text-blue-500 hover:bg-blue-500 hover:text-white rounded-lg transition-colors"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(task.id)}
                        className="p-2 bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white rounded-lg transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-[#111] rounded-3xl border border-white/10 p-6 w-full max-w-md shadow-2xl">
            <div className="flex justify-between items-center mb-6">
              <h3 className="font-bold text-xl">{editingTask ? 'Editar Tarea' : 'Nueva Tarea'}</h3>
              <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-white/5 rounded-full transition-colors">
                <X className="w-5 h-5 text-slate-500" />
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="text-xs text-slate-500 ml-1 mb-1 block">Día</label>
                <input 
                  type="number"
                  min="1"
                  required
                  className="w-full bg-white/5 border border-white/10 focus:border-emerald-500/50 p-3 rounded-xl outline-none transition-colors" 
                  value={formData.day} 
                  onChange={e => setFormData({...formData, day: e.target.value})} 
                  placeholder="Ej: 1" 
                />
              </div>
              
              <div>
                <label className="text-xs text-slate-500 ml-1 mb-1 block">Nombre de la Tarea</label>
                <input 
                  type="text"
                  required
                  className="w-full bg-white/5 border border-white/10 focus:border-emerald-500/50 p-3 rounded-xl outline-none transition-colors" 
                  value={formData.name} 
                  onChange={e => setFormData({...formData, name: e.target.value})} 
                  placeholder="Ej: Seguir en Instagram" 
                />
              </div>

              <div>
                <label className="text-xs text-slate-500 ml-1 mb-1 block">Experiencia (XP)</label>
                <input 
                  type="number"
                  min="0"
                  required
                  className="w-full bg-white/5 border border-white/10 focus:border-emerald-500/50 p-3 rounded-xl outline-none transition-colors" 
                  value={formData.xp} 
                  onChange={e => setFormData({...formData, xp: parseInt(e.target.value) || 0})} 
                  placeholder="Ej: 100" 
                />
              </div>
              
              <div className="pt-4 flex gap-3">
                <button 
                  type="button"
                  onClick={() => setIsModalOpen(false)} 
                  className="flex-1 py-3 bg-white/5 hover:bg-white/10 rounded-xl font-bold transition-colors"
                >
                  Cancelar
                </button>
                <button 
                  type="submit"
                  className="flex-1 py-3 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl font-bold transition-colors shadow-lg shadow-emerald-500/20 flex justify-center items-center gap-2"
                >
                  <CheckCircle className="w-4 h-4" /> Guardar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
