import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Plus, Edit2, Trash2, Loader2, X, CheckCircle, Calendar, AlertTriangle } from 'lucide-react';

interface Task {
  id: string;
  day: string;
  name: string;
  title?: string;
  description?: string;
  xp: number;
  xp_reward?: number;
  type: string;
  conditions?: any;
  is_active?: boolean;
  created_at: string;
}

export default function TaskManagement() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [weeklySchedule, setWeeklySchedule] = useState<any>(null);
  const [endingWeek, setEndingWeek] = useState(false);
  
  const [formData, setFormData] = useState({
    day: '1',
    name: '',
    description: '',
    xp: 100,
    type: 'daily',
    conditions_value: 1,
    conditions_course_id: '',
    conditions_plan_id: '',
    conditions_feature_id: '',
    is_active: true
  });

  useEffect(() => {
    fetchTasks();
    fetchWeeklySchedule();
  }, []);

  const fetchWeeklySchedule = async () => {
    try {
      const { data, error } = await supabase
        .from('settings')
        .select('value')
        .eq('key', 'weekly_schedule')
        .single();
      
      if (!error && data) {
        setWeeklySchedule(data.value);
      }
    } catch (error) {
      console.error('Error fetching weekly schedule:', error);
    }
  };

  const handleEndWeek = async () => {
    if (!window.confirm('¿Estás seguro de finalizar la semana? Esto aplicará sanciones a los usuarios que no hayan completado sus tareas y reiniciará el progreso para la nueva semana.')) return;
    
    setEndingWeek(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('No session');

      const res = await fetch('/api/admin/tasks/end-week', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({ penaltyXp: 50 })
      });
      
      if (!res.ok) throw new Error('Error ending week');
      
      alert('Semana finalizada correctamente. Se han aplicado las sanciones y el progreso ha sido reiniciado.');
      fetchWeeklySchedule();
    } catch (error) {
      console.error('Error ending week:', error);
      alert('Error al finalizar la semana.');
    } finally {
      setEndingWeek(false);
    }
  };

  const handleSeedTasks = async () => {
    if (!window.confirm('¿Deseas sembrar las tareas iniciales recomendadas para la primera semana?')) return;
    
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('No session');

      const res = await fetch('/api/admin/tasks/seed', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      });
      
      if (!res.ok) throw new Error('Error seeding tasks');
      
      alert('Tareas iniciales sembradas correctamente.');
      fetchTasks();
    } catch (error) {
      console.error('Error seeding tasks:', error);
      alert('Error al sembrar tareas.');
      setLoading(false);
    }
  };

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
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('No session');

      // Check if we are adding a daily task and if the limit of 10 is reached
      if (formData.type === 'daily' && !editingTask) {
        const tasksForDay = tasks.filter(t => t.type === 'daily' && t.day === formData.day);
        if (tasksForDay.length >= 10) {
          alert('No puedes crear más de 10 tareas para el mismo día.');
          return;
        }
      }

      // Build conditions object based on type
      let conditions: any = {};
      if (['INVITE_COUNT', 'LOGIN_STREAK', 'TEAM_SIZE', 'SHARE_ACTION', 'FEATURE_USAGE'].includes(formData.type)) {
        conditions.value = Number(formData.conditions_value);
      }
      if (formData.type === 'COURSE_COMPLETED') {
        conditions.course_id = formData.conditions_course_id;
      }
      if (formData.type === 'PLAN_PURCHASE') {
        conditions.plan_id = formData.conditions_plan_id;
      }
      if (formData.type === 'FEATURE_USAGE') {
        conditions.feature_id = formData.conditions_feature_id;
      }

      const taskPayload = {
        day: formData.day,
        name: formData.name, // Keep for backwards compatibility
        title: formData.name,
        description: formData.description,
        xp: formData.xp, // Keep for backwards compatibility
        xp_reward: formData.xp,
        type: formData.type,
        conditions: conditions,
        is_active: formData.is_active
      };

      if (editingTask) {
        const res = await fetch(`/api/admin/tasks/${editingTask.id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`
          },
          body: JSON.stringify(taskPayload)
        });
        if (!res.ok) throw new Error('Error updating task');
      } else {
        const res = await fetch('/api/admin/tasks', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`
          },
          body: JSON.stringify(taskPayload)
        });
        if (!res.ok) throw new Error('Error creating task');
      }
      
      setIsModalOpen(false);
      setEditingTask(null);
      setFormData({ 
        day: '1', name: '', description: '', xp: 100, type: 'daily', 
        conditions_value: 1, conditions_course_id: '', conditions_plan_id: '', conditions_feature_id: '', is_active: true 
      });
      fetchTasks();
    } catch (error) {
      console.error('Error saving task:', JSON.stringify(error, null, 2));
      alert('Error al guardar la tarea. Verifica tus permisos de administrador.');
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('¿Estás seguro de eliminar esta tarea?')) return;
    
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('No session');

      const res = await fetch(`/api/admin/tasks/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      });
      if (!res.ok) throw new Error('Error deleting task');
        
      fetchTasks();
    } catch (error) {
      console.error('Error deleting task:', error);
      alert('Error al eliminar la tarea. Verifica tus permisos de administrador.');
    }
  };

  const openEditModal = (task: Task) => {
    setEditingTask(task);
    setFormData({
      day: task.day,
      name: task.title || task.name,
      description: task.description || '',
      xp: task.xp_reward || task.xp,
      type: task.type || 'daily',
      conditions_value: task.conditions?.value || 1,
      conditions_course_id: task.conditions?.course_id || '',
      conditions_plan_id: task.conditions?.plan_id || '',
      conditions_feature_id: task.conditions?.feature_id || '',
      is_active: task.is_active !== false
    });
    setIsModalOpen(true);
  };

  const deleteAllTasks = async () => {
    if (!window.confirm('¿Estás seguro de eliminar TODAS las tareas? Esta acción no se puede deshacer.')) return;
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('No session');

      const res = await fetch('/api/admin/tasks', {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      });
      if (!res.ok) throw new Error('Error deleting all tasks');
        
      fetchTasks();
    } catch (error: any) {
      console.error('Error deleting all tasks:', error);
      alert('Error al eliminar todas las tareas. Verifica tus permisos de administrador.');
      setLoading(false);
    }
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
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Gestión de Tareas</h2>
          <p className="text-slate-500 dark:text-slate-400 text-sm">Administra las tareas diarias para los usuarios.</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleSeedTasks}
            className="flex items-center gap-2 px-4 py-2 bg-blue-500/10 text-blue-500 hover:bg-blue-500 hover:text-white rounded-xl font-bold transition-colors"
            title="Siembre tareas recomendadas para la primera semana"
          >
            <Calendar className="w-4 h-4" /> Sembrar Tareas
          </button>
          <button
            onClick={deleteAllTasks}
            className="flex items-center gap-2 px-4 py-2 bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white rounded-xl font-bold transition-colors"
          >
            <Trash2 className="w-4 h-4" /> Borrar Todas
          </button>
          <button
            onClick={() => {
              setEditingTask(null);
              setFormData({ 
                day: '1', name: '', description: '', xp: 100, type: 'daily', 
                conditions_value: 1, conditions_course_id: '', conditions_plan_id: '', conditions_feature_id: '', is_active: true 
              });
              setIsModalOpen(true);
            }}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl font-bold transition-colors"
          >
            <Plus className="w-4 h-4" /> Nueva Tarea
          </button>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-800/50 rounded-2xl p-6 border border-slate-200 dark:border-white/5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h3 className="text-lg font-bold flex items-center gap-2 text-slate-900 dark:text-white">
              <Calendar className="w-5 h-5 text-emerald-500" />
              Programación Semanal
            </h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
              {weeklySchedule ? (
                <>
                  Semana actual: {new Date(weeklySchedule.start_date).toLocaleDateString()} - {new Date(weeklySchedule.end_date).toLocaleDateString()}
                </>
              ) : (
                'No hay una semana programada actualmente.'
              )}
            </p>
            <div className="flex items-center gap-2 mt-2 text-xs text-amber-500 bg-amber-500/10 px-3 py-1.5 rounded-lg w-fit">
              <AlertTriangle className="w-4 h-4" />
              Sanción por incumplimiento: -50 XP por tarea
            </div>
          </div>
          <button
            onClick={handleEndWeek}
            disabled={endingWeek}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-500 hover:bg-indigo-600 text-white rounded-xl font-bold transition-colors disabled:opacity-50"
          >
            {endingWeek ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
            Finalizar Semana y Aplicar Sanciones
          </button>
        </div>
      </div>

      <div className="bg-white dark:bg-[#111] rounded-2xl border border-slate-200 dark:border-white/5 overflow-hidden">
        <div className="p-4 space-y-6">
          {[1, 2, 3, 4, 5, 6, 7].map(day => (
            <div key={day} className="border-b border-slate-100 dark:border-white/5 pb-4 last:border-0 last:pb-0">
              <div className="flex justify-between items-center mb-3">
                <h4 className="font-bold text-slate-900 dark:text-white">Día {day}</h4>
                <button
                  onClick={() => {
                    setEditingTask(null);
                    setFormData({ day: day.toString(), name: '', xp: 100, type: 'daily' });
                    setIsModalOpen(true);
                  }}
                  className="text-xs flex items-center gap-1 text-emerald-500 hover:text-emerald-600 font-bold"
                >
                  <Plus className="w-3 h-3" /> Agregar Tarea
                </button>
              </div>
              <div className="space-y-2">
                {tasks.filter(t => t.type === 'daily' && parseInt(t.day) === day).length === 0 ? (
                  <p className="text-xs text-slate-400 italic">No hay tareas para este día.</p>
                ) : (
                  tasks.filter(t => t.type === 'daily' && parseInt(t.day) === day).map(task => (
                    <div key={task.id} className="flex items-center justify-between bg-slate-50 dark:bg-white/5 p-3 rounded-xl">
                      <span className="text-sm font-medium text-slate-700 dark:text-slate-300">{task.name}</span>
                      <div className="flex items-center gap-3">
                        <span className="text-xs text-emerald-500 font-bold">+{task.xp} XP</span>
                        <div className="flex gap-1">
                          <button onClick={() => openEditModal(task)} className="p-1.5 text-blue-500 hover:bg-blue-500/10 rounded-lg"><Edit2 className="w-3.5 h-3.5" /></button>
                          <button onClick={() => handleDelete(task.id)} className="p-1.5 text-red-500 hover:bg-red-500/10 rounded-lg"><Trash2 className="w-3.5 h-3.5" /></button>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          ))}
          
          <div className="border-t border-slate-100 dark:border-white/5 pt-4">
            <div className="flex justify-between items-center mb-3">
              <h4 className="font-bold text-slate-900 dark:text-white">Semanales</h4>
              <button
                onClick={() => {
                  setEditingTask(null);
                  setFormData({ day: '1', name: '', xp: 100, type: 'weekly' });
                  setIsModalOpen(true);
                }}
                className="text-xs flex items-center gap-1 text-emerald-500 hover:text-emerald-600 font-bold"
              >
                <Plus className="w-3 h-3" /> Agregar Tarea
              </button>
            </div>
            <div className="space-y-2">
              {tasks.filter(t => t.type === 'weekly').map(task => (
                <div key={task.id} className="flex items-center justify-between bg-slate-50 dark:bg-white/5 p-3 rounded-xl">
                  <span className="text-sm font-medium text-slate-700 dark:text-slate-300">{task.name}</span>
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-emerald-500 font-bold">+{task.xp} XP</span>
                    <div className="flex gap-1">
                      <button onClick={() => openEditModal(task)} className="p-1.5 text-blue-500 hover:bg-blue-500/10 rounded-lg"><Edit2 className="w-3.5 h-3.5" /></button>
                      <button onClick={() => handleDelete(task.id)} className="p-1.5 text-red-500 hover:bg-red-500/10 rounded-lg"><Trash2 className="w-3.5 h-3.5" /></button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="border-t border-slate-100 dark:border-white/5 pt-4">
            <div className="flex justify-between items-center mb-3">
              <h4 className="font-bold text-slate-900 dark:text-white">Tareas Inteligentes</h4>
              <button
                onClick={() => {
                  setEditingTask(null);
                  setFormData({ 
                    day: '1', name: '', description: '', xp: 100, type: 'INVITE_COUNT', 
                    conditions_value: 1, conditions_course_id: '', conditions_plan_id: '', conditions_feature_id: '', is_active: true 
                  });
                  setIsModalOpen(true);
                }}
                className="text-xs flex items-center gap-1 text-emerald-500 hover:text-emerald-600 font-bold"
              >
                <Plus className="w-3 h-3" /> Agregar Tarea
              </button>
            </div>
            <div className="space-y-2">
              {tasks.filter(t => !['daily', 'weekly'].includes(t.type)).map(task => (
                <div key={task.id} className="flex items-center justify-between bg-slate-50 dark:bg-white/5 p-3 rounded-xl">
                  <div>
                    <span className="text-sm font-medium text-slate-700 dark:text-slate-300 block">{task.title || task.name}</span>
                    <span className="text-xs text-slate-500">{task.type}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-emerald-500 font-bold">+{task.xp_reward || task.xp} XP</span>
                    <div className="flex gap-1">
                      <button onClick={() => openEditModal(task)} className="p-1.5 text-blue-500 hover:bg-blue-500/10 rounded-lg"><Edit2 className="w-3.5 h-3.5" /></button>
                      <button onClick={() => handleDelete(task.id)} className="p-1.5 text-red-500 hover:bg-red-500/10 rounded-lg"><Trash2 className="w-3.5 h-3.5" /></button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-[#111] rounded-3xl border border-slate-200 dark:border-white/10 p-6 w-full max-w-md shadow-2xl">
            <div className="flex justify-between items-center mb-6">
              <h3 className="font-bold text-xl text-slate-900 dark:text-white">{editingTask ? 'Editar Tarea' : 'Nueva Tarea'}</h3>
              <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-slate-100 dark:hover:bg-white/5 rounded-full transition-colors">
                <X className="w-5 h-5 text-slate-500" />
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="space-y-4 max-h-[70vh] overflow-y-auto pr-2">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-slate-500 dark:text-slate-400 ml-1 mb-1 block">Tipo</label>
                  <select 
                    className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 focus:border-emerald-500/50 p-3 rounded-xl outline-none transition-colors text-slate-900 dark:text-white"
                    value={formData.type}
                    onChange={e => setFormData({...formData, type: e.target.value})}
                  >
                    <option value="daily">Diaria</option>
                    <option value="weekly">Semanal</option>
                    <option value="INVITE_COUNT">Invitar Usuarios</option>
                    <option value="PROFILE_COMPLETED">Completar Perfil</option>
                    <option value="COURSE_COMPLETED">Completar Curso</option>
                    <option value="LOGIN_STREAK">Racha de Ingresos</option>
                    <option value="TEAM_SIZE">Tamaño de Equipo</option>
                    <option value="PLAN_PURCHASE">Comprar Plan</option>
                    <option value="SHARE_ACTION">Compartir</option>
                    <option value="FEATURE_USAGE">Usar Función</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs text-slate-500 dark:text-slate-400 ml-1 mb-1 block">Día (Solo Diarias)</label>
                  <input 
                    type="number"
                    min="1"
                    max="7"
                    disabled={formData.type !== 'daily'}
                    required={formData.type === 'daily'}
                    className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 focus:border-emerald-500/50 p-3 rounded-xl outline-none transition-colors text-slate-900 dark:text-white disabled:opacity-50" 
                    value={formData.day} 
                    onChange={e => setFormData({...formData, day: e.target.value})} 
                    placeholder="Ej: 1" 
                  />
                  {formData.type === 'daily' && (
                    <p className="text-[10px] text-slate-400 mt-1 ml-1">Máximo 10 tareas por día.</p>
                  )}
                </div>
              </div>
              
              <div>
                <label className="text-xs text-slate-500 dark:text-slate-400 ml-1 mb-1 block">Nombre de la Tarea</label>
                <input 
                  type="text"
                  required
                  className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 focus:border-emerald-500/50 p-3 rounded-xl outline-none transition-colors text-slate-900 dark:text-white" 
                  value={formData.name} 
                  onChange={e => setFormData({...formData, name: e.target.value})} 
                  placeholder="Ej: Seguir en Instagram" 
                />
              </div>

              <div>
                <label className="text-xs text-slate-500 dark:text-slate-400 ml-1 mb-1 block">Descripción (Opcional)</label>
                <textarea 
                  className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 focus:border-emerald-500/50 p-3 rounded-xl outline-none transition-colors text-slate-900 dark:text-white resize-none" 
                  value={formData.description} 
                  onChange={e => setFormData({...formData, description: e.target.value})} 
                  placeholder="Ej: Sigue nuestra cuenta oficial para estar al tanto de las novedades." 
                  rows={2}
                />
              </div>

              <div>
                <label className="text-xs text-slate-500 dark:text-slate-400 ml-1 mb-1 block">Experiencia (XP)</label>
                <input 
                  type="number"
                  min="0"
                  required
                  className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 focus:border-emerald-500/50 p-3 rounded-xl outline-none transition-colors text-slate-900 dark:text-white" 
                  value={formData.xp} 
                  onChange={e => setFormData({...formData, xp: parseInt(e.target.value) || 0})} 
                  placeholder="Ej: 100" 
                />
              </div>

              {/* Conditional Fields based on Type */}
              {['INVITE_COUNT', 'LOGIN_STREAK', 'TEAM_SIZE', 'SHARE_ACTION', 'FEATURE_USAGE'].includes(formData.type) && (
                <div>
                  <label className="text-xs text-slate-500 dark:text-slate-400 ml-1 mb-1 block">Valor Requerido</label>
                  <input 
                    type="number"
                    min="1"
                    required
                    className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 focus:border-emerald-500/50 p-3 rounded-xl outline-none transition-colors text-slate-900 dark:text-white" 
                    value={formData.conditions_value} 
                    onChange={e => setFormData({...formData, conditions_value: parseInt(e.target.value) || 1})} 
                    placeholder="Ej: 5" 
                  />
                </div>
              )}

              {formData.type === 'COURSE_COMPLETED' && (
                <div>
                  <label className="text-xs text-slate-500 dark:text-slate-400 ml-1 mb-1 block">ID del Curso</label>
                  <input 
                    type="text"
                    required
                    className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 focus:border-emerald-500/50 p-3 rounded-xl outline-none transition-colors text-slate-900 dark:text-white" 
                    value={formData.conditions_course_id} 
                    onChange={e => setFormData({...formData, conditions_course_id: e.target.value})} 
                    placeholder="Ej: course_123" 
                  />
                </div>
              )}

              {formData.type === 'PLAN_PURCHASE' && (
                <div>
                  <label className="text-xs text-slate-500 dark:text-slate-400 ml-1 mb-1 block">ID del Plan</label>
                  <input 
                    type="text"
                    required
                    className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 focus:border-emerald-500/50 p-3 rounded-xl outline-none transition-colors text-slate-900 dark:text-white" 
                    value={formData.conditions_plan_id} 
                    onChange={e => setFormData({...formData, conditions_plan_id: e.target.value})} 
                    placeholder="Ej: plan_premium" 
                  />
                </div>
              )}

              {formData.type === 'FEATURE_USAGE' && (
                <div>
                  <label className="text-xs text-slate-500 dark:text-slate-400 ml-1 mb-1 block">ID de la Función</label>
                  <input 
                    type="text"
                    required
                    className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 focus:border-emerald-500/50 p-3 rounded-xl outline-none transition-colors text-slate-900 dark:text-white" 
                    value={formData.conditions_feature_id} 
                    onChange={e => setFormData({...formData, conditions_feature_id: e.target.value})} 
                    placeholder="Ej: feature_chat" 
                  />
                </div>
              )}

              <div className="flex items-center gap-2 mt-4">
                <input
                  type="checkbox"
                  id="is_active"
                  checked={formData.is_active}
                  onChange={e => setFormData({...formData, is_active: e.target.checked})}
                  className="w-4 h-4 text-emerald-500 rounded border-slate-300 focus:ring-emerald-500"
                />
                <label htmlFor="is_active" className="text-sm text-slate-700 dark:text-slate-300">
                  Tarea Activa
                </label>
              </div>
              
              <div className="pt-4 flex gap-3">
                <button 
                  type="button"
                  onClick={() => setIsModalOpen(false)} 
                  className="flex-1 py-3 bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 text-slate-700 dark:text-white rounded-xl font-bold transition-colors"
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
