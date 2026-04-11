import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Check, Calendar, Star, Trophy, Loader2, AlertTriangle, Play, Zap, ShieldCheck, Package } from "lucide-react";
import { cn } from "@/lib/utils";
import { useUser } from "../contexts/UserContext";
import { supabase } from "../lib/supabase";
import { calculatePercentage } from "../utils/levelUtils";
import { TaskList } from "../components/tasks/TaskList";

interface Task {
  id: string;
  day: string;
  name: string;
  xp: number;
  completed: boolean;
  isPenalty?: boolean;
  type?: 'daily' | 'weekly';
}

export default function Tasks() {
  const { user, refreshUser } = useUser();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [penaltyTasks, setPenaltyTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [activating, setActivating] = useState(false);
  const [showLevelUp, setShowLevelUp] = useState(false);
  const [levelUpData, setLevelUpData] = useState<any>(null);
  const [currentRelativeDay, setCurrentRelativeDay] = useState(1);
  const [taskActivationCost, setTaskActivationCost] = useState(5000);

  const fetchTasks = async () => {
    if (!user?.id) return;
    console.log("Fetching tasks for user:", user.id);
    try {
      // Check health first
      try {
        const healthRes = await fetch('/api/health');
        console.log("API Health check:", healthRes.status);
      } catch (e) {
        console.error("API Health check failed:", e);
      }

      // Check cycle status first
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        console.log("Session found, fetching status...");
        try {
          const statusRes = await fetch('/api/tasks/status', {
            headers: { 'Authorization': `Bearer ${session.access_token}` }
          });
          console.log("Status response status:", statusRes.status);
          if (statusRes.ok) {
            const statusData = await statusRes.json();
            console.log("Status data:", statusData);
            if (statusData.cycleEnded) {
              await refreshUser();
              return;
            }
          }
        } catch (e) {
          console.error("Error fetching /api/tasks/status:", e);
          throw e;
        }
      } else {
        console.warn("No session found in fetchTasks");
      }

      // Fetch activation cost
      const { data: costSetting } = await supabase
        .from('settings')
        .select('value')
        .eq('key', 'task_activation_cost')
        .single();
      if (costSetting) setTaskActivationCost(Number(costSetting.value));

      // Calculate relative day if tasks are active
      if (user.is_tasks_active && user.task_start_date) {
        const start = new Date(user.task_start_date);
        const now = new Date();
        const diffTime = Math.abs(now.getTime() - start.getTime());
        const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24)) + 1;
        setCurrentRelativeDay(Math.min(7, diffDays));
      }

      // Get all tasks
      const { data: allTasks, error: tasksError } = await supabase
        .from('tasks')
        .select('*')
        .order('id');
        
      if (tasksError) throw tasksError;

      // Get user's completed tasks for today
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const { data: userTasks, error: userTasksError } = await supabase
        .from('user_tasks')
        .select('task_id')
        .eq('user_id', user.id)
        .gte('completed_at', today.toISOString());
        
      if (userTasksError) throw userTasksError;

      const completedTaskIds = new Set(userTasks?.map(ut => ut.task_id));

      const formattedTasks = (allTasks || []).map(t => ({
        id: t.id,
        day: t.day,
        name: t.name,
        xp: t.xp,
        type: t.type || 'daily',
        completed: completedTaskIds.has(t.id)
      }));

      setTasks(formattedTasks);

      // Fetch penalty tasks
      if (session) {
        const res = await fetch('/api/tasks/penalty', {
          headers: { 'Authorization': `Bearer ${session.access_token}` }
        });
        if (res.ok) {
          const pTasks = await res.json();
          setPenaltyTasks(pTasks.map((pt: any) => ({ ...pt, isPenalty: true })));
        }
      }

    } catch (error) {
      console.error("Error fetching tasks:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTasks();
  }, [user?.id, user?.is_tasks_active]);

  const handleActivate = async () => {
    if (!user?.id || activating) return;
    
    setActivating(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('No session');

      const res = await fetch('/api/tasks/activate', {
        method: 'POST',
        headers: { 
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Error al activar tareas');
      }

      await refreshUser();
    } catch (error: any) {
      console.error("Error activating tasks:", error);
      alert(error.message);
    } finally {
      setActivating(false);
    }
  };

  const toggleTask = async (id: string, alreadyCompleted: boolean, isPenalty: boolean = false) => {
    if (alreadyCompleted || !user?.id || !user.is_tasks_active) return;

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('No session');

      let xpGained = 0;
      let leveledUp = false;
      let newLevel = user.level || 1;
      let newPercentage = user.percentage;

      if (isPenalty) {
        const res = await fetch(`/api/tasks/complete-penalty/${id}`, {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${session.access_token}` }
        });
        
        if (!res.ok) throw new Error('Error completing penalty task');
        const data = await res.json();
        xpGained = data.xpGained;
        leveledUp = data.leveledUp;
        newLevel = data.newLevel;
        newPercentage = data.newPercentage;
        
        setPenaltyTasks(penaltyTasks.map(t => t.id === id ? { ...t, completed: true } : t));
      } else {
        const res = await fetch(`/api/tasks/complete/${id}`, {
          method: 'POST',
          headers: { 
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ type: 'daily' }) // Default to daily for now
        });

        if (!res.ok) {
          const errorData = await res.json();
          throw new Error(errorData.error || 'Error completing task');
        }

        const data = await res.json();
        xpGained = data.xpGained;
        leveledUp = data.leveledUp;
        newLevel = data.newLevel;
        newPercentage = data.newPercentage;
        
        // Update local task state
        setTasks(tasks.map(t => t.id === id ? { ...t, completed: true } : t));
      }
      
      // Handle level up
      if (leveledUp) {
        setLevelUpData({ newLevel, xpGained, newPercentage });
        setShowLevelUp(true);
        setTimeout(() => setShowLevelUp(false), 4000);
      }
      
      // Refresh global user data
      await refreshUser();
    } catch (error) {
      console.error("Error completing task:", error);
      alert(error instanceof Error ? error.message : "Error al completar la tarea");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-[#0a0a0a] flex items-center justify-center">
        <Loader2 className="w-10 h-10 text-blue-600 animate-spin" />
      </div>
    );
  }

  // Filter tasks for current relative day and weekly tasks
  const dailyTasks = tasks.filter(t => t.type === 'daily' && parseInt(t.day) === currentRelativeDay);
  const weeklyTasks = tasks.filter(t => t.type === 'weekly');
  
  const activeTasks = [...dailyTasks, ...weeklyTasks];
  const completedCount = activeTasks.filter((t) => t.completed).length + penaltyTasks.filter(t => t.completed).length;
  const totalTasksCount = activeTasks.length + penaltyTasks.length;
  const progress = totalTasksCount > 0 ? (completedCount / totalTasksCount) * 100 : 0;

  if (!user?.is_tasks_active) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-[#0a0a0a] pb-24 px-6 pt-12">
        <div className="max-w-md mx-auto space-y-8">
          <div className="text-center space-y-4">
            <div className="w-20 h-20 bg-blue-600 rounded-3xl flex items-center justify-center mx-auto shadow-xl shadow-blue-600/20">
              <Zap className="w-10 h-10 text-white" />
            </div>
            <h1 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">
              Activa tus Tareas
            </h1>
            <p className="text-slate-500 dark:text-slate-400 text-lg leading-relaxed">
              Comienza tu ciclo de 7 días para ganar XP, subir de nivel y aumentar tus comisiones.
            </p>
          </div>

          <div className="bg-white dark:bg-[#111] rounded-[32px] p-8 border border-slate-100 dark:border-white/5 shadow-xl space-y-6">
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 flex items-center justify-center shrink-0">
                  <Calendar className="w-5 h-5 text-emerald-500" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 dark:text-white">Ciclo de 7 Días</h3>
                  <p className="text-sm text-slate-500 dark:text-slate-400">Tu semana comienza hoy mismo.</p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-500/10 flex items-center justify-center shrink-0">
                  <Trophy className="w-5 h-5 text-blue-500" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 dark:text-white">Recompensas de XP</h3>
                  <p className="text-sm text-slate-500 dark:text-slate-400">Gana experiencia por cada tarea.</p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-500/10 flex items-center justify-center shrink-0">
                  <ShieldCheck className="w-5 h-5 text-amber-500" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 dark:text-white">Cumplimiento</h3>
                  <p className="text-sm text-slate-500 dark:text-slate-400">Tu inventario y cumplimiento se activan.</p>
                </div>
              </div>
            </div>

            <div className="pt-4 border-t border-slate-100 dark:border-white/5">
              <button
                onClick={handleActivate}
                disabled={activating}
                className="w-full py-4 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-2xl font-bold text-lg shadow-lg shadow-blue-600/20 transition-all flex items-center justify-center gap-2"
              >
                {activating ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <>
                    <Play className="w-5 h-5 fill-current" />
                    Comenzar Ahora
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#0a0a0a] pb-24 relative overflow-hidden">
      {/* Level Up Animation Overlay */}
      <AnimatePresence>
        {showLevelUp && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.2 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/80 backdrop-blur-sm"
          >
            <motion.div
              initial={{ y: 50 }}
              animate={{ y: 0 }}
              className="bg-gradient-to-br from-amber-400 to-amber-600 p-8 rounded-[40px] text-center shadow-2xl shadow-amber-500/50 max-w-xs w-full mx-4"
            >
              <div className="w-24 h-24 bg-white rounded-full flex items-center justify-center mx-auto mb-6 shadow-inner">
                <Trophy className="w-12 h-12 text-amber-500" />
              </div>
              <h2 className="text-3xl font-black text-white mb-2 tracking-tight">
                ¡Nivel {levelUpData?.newLevel}!
              </h2>
              <p className="text-amber-100 font-medium text-lg">
                Has ganado {levelUpData?.xpGained} XP
              </p>
              <p className="text-white font-bold mt-4 text-xl">
                Comisión: {levelUpData?.newPercentage?.toFixed(1)}%
              </p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      <div className="bg-slate-900 dark:bg-[#111] text-white pt-12 pb-24 px-6 rounded-b-[40px] shadow-xl relative transition-colors duration-300">
        <div className="absolute top-[-20%] right-[-10%] w-[60%] h-[120%] bg-blue-600/20 blur-[80px] rounded-full pointer-events-none" />

        <div className="relative z-10">
          <h1 className="text-3xl font-bold tracking-tight mb-2">
            Día {currentRelativeDay} de 7
          </h1>
          <p className="text-slate-400 text-lg">
            Completa tus tareas para subir de nivel.
          </p>
          {user.task_end_date && (
            <div className="mt-4 flex items-center gap-2 text-sm bg-white/10 w-fit px-4 py-2 rounded-full backdrop-blur-md border border-white/10">
              <Calendar className="w-4 h-4 text-emerald-400" />
              <span>
                Finaliza: {new Date(user.task_end_date).toLocaleDateString()}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Progress Card */}
      <div className="px-6 -mt-16 relative z-20 mb-8">
        <div className="bg-white dark:bg-[#111] rounded-3xl p-6 shadow-xl shadow-slate-200/50 dark:shadow-black/20 border border-slate-100 dark:border-white/5">
          <div className="flex justify-between items-end mb-4">
            <div>
              <p className="text-slate-500 dark:text-slate-400 font-medium text-sm uppercase tracking-wider mb-1">
                Progreso del Día
              </p>
              <div className="text-3xl font-black text-slate-900 dark:text-white flex items-baseline gap-1">
                {completedCount}{" "}
                <span className="text-lg text-slate-400 dark:text-slate-600 font-bold">
                  / {totalTasksCount} Tareas
                </span>
              </div>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-amber-50 dark:bg-amber-500/10 flex items-center justify-center">
              <Star className="w-6 h-6 text-amber-500 fill-amber-500" />
            </div>
          </div>

          <div className="w-full bg-slate-100 dark:bg-white/5 rounded-full h-3 overflow-hidden mb-2">
            <motion.div
              className="h-full bg-gradient-to-r from-amber-400 to-amber-500 rounded-full"
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.5 }}
            />
          </div>
          <p className="text-sm text-slate-500 dark:text-slate-400 font-medium text-center">
            {Math.round(progress)}% Completado
          </p>
        </div>
      </div>

      {/* Inventory & Compliance Status */}
      <div className="px-6 mb-8">
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-white dark:bg-[#111] p-4 rounded-2xl border border-slate-100 dark:border-white/5 shadow-sm flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 flex items-center justify-center shrink-0">
              <Package className="w-5 h-5 text-emerald-500" />
            </div>
            <div>
              <p className="text-[10px] uppercase font-bold text-slate-400 dark:text-slate-500 tracking-wider">Inventario</p>
              <p className="text-sm font-bold text-slate-900 dark:text-white">{user.inventory_status || 'Inactivo'}</p>
            </div>
          </div>
          <div className="bg-white dark:bg-[#111] p-4 rounded-2xl border border-slate-100 dark:border-white/5 shadow-sm flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-500/10 flex items-center justify-center shrink-0">
              <ShieldCheck className="w-5 h-5 text-blue-500" />
            </div>
            <div>
              <p className="text-[10px] uppercase font-bold text-slate-400 dark:text-slate-500 tracking-wider">Cumplimiento</p>
              <p className="text-sm font-bold text-slate-900 dark:text-white">{user.compliance_score || 100}%</p>
            </div>
          </div>
        </div>
      </div>

      {/* Task List */}
      <div className="px-6 space-y-4">
        {penaltyTasks.length > 0 && (
          <div className="mb-6">
            <h2 className="text-lg font-bold text-red-600 dark:text-red-500 mb-3 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5" />
              Tareas de Castigo
            </h2>
            <div className="space-y-4">
              {penaltyTasks.map((task, index) => (
                <motion.div
                  key={task.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  onClick={() => toggleTask(task.id, task.completed, true)}
                  className={cn(
                    "bg-white dark:bg-[#111] rounded-2xl p-4 shadow-sm border transition-all cursor-pointer flex items-center gap-4",
                    task.completed
                      ? "border-emerald-200 dark:border-emerald-500/20 bg-emerald-50/30 dark:bg-emerald-500/5"
                      : "border-red-200 dark:border-red-500/20 bg-red-50/30 dark:bg-red-500/5 hover:border-red-300 dark:hover:border-red-500/40 hover:shadow-md"
                  )}
                >
                  <div
                    className={cn(
                      "w-8 h-8 rounded-xl flex items-center justify-center shrink-0 transition-colors",
                      task.completed
                        ? "bg-emerald-500 text-white"
                        : "bg-red-100 dark:bg-red-500/10 text-red-400 dark:text-red-500"
                    )}
                  >
                    <Check
                      className={cn(
                        "w-5 h-5",
                        task.completed ? "opacity-100" : "opacity-0"
                      )}
                    />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <AlertTriangle className="w-3.5 h-3.5 text-red-400 dark:text-red-500" />
                      <span className="text-xs font-bold text-red-500 uppercase tracking-wider">
                        Castigo
                      </span>
                    </div>
                    <h3
                      className={cn(
                        "text-sm font-bold transition-colors",
                        task.completed ? "text-slate-400 dark:text-slate-600 line-through" : "text-slate-900 dark:text-white"
                      )}
                    >
                      {task.name}
                    </h3>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="inline-flex items-center justify-center px-2.5 py-1 rounded-lg bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-500 font-bold text-xs border border-amber-100 dark:border-amber-500/20">
                      +{task.xp} XP
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        )}

        {weeklyTasks.length > 0 && (
          <div className="mb-6">
            <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-3 flex items-center gap-2">
              <Star className="w-5 h-5 text-amber-500" />
              Tareas Semanales
            </h2>
            <div className="space-y-4">
              {weeklyTasks.map((task, idx) => (
                <motion.div
                  key={task.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.05 }}
                  onClick={() => toggleTask(task.id, task.completed)}
                  className={cn(
                    "bg-white dark:bg-[#111] rounded-2xl p-4 shadow-sm border transition-all cursor-pointer flex items-center gap-4",
                    task.completed
                      ? "border-emerald-200 dark:border-emerald-500/20 bg-emerald-50/30 dark:bg-emerald-500/5"
                      : "border-slate-100 dark:border-white/5 hover:border-blue-200 dark:hover:border-blue-500/40 hover:shadow-md",
                  )}
                >
                  <div
                    className={cn(
                      "w-8 h-8 rounded-xl flex items-center justify-center shrink-0 transition-colors",
                      task.completed
                        ? "bg-emerald-500 text-white"
                        : "bg-slate-100 dark:bg-white/5 text-slate-400 dark:text-slate-600",
                    )}
                  >
                    <Check
                      className={cn(
                        "w-5 h-5",
                        task.completed ? "opacity-100" : "opacity-0",
                      )}
                    />
                  </div>

                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <Star className="w-3.5 h-3.5 text-amber-400" />
                      <span className="text-xs font-bold text-slate-500 dark:text-slate-500 uppercase tracking-wider">
                        Semanal
                      </span>
                    </div>
                    <p
                      className={cn(
                        "font-bold text-lg transition-colors",
                        task.completed
                          ? "text-slate-400 dark:text-slate-600 line-through"
                          : "text-slate-800 dark:text-slate-200",
                      )}
                    >
                      {task.name}
                    </p>
                  </div>

                  <div
                    className={cn(
                      "px-3 py-1.5 rounded-lg font-bold text-sm flex items-center gap-1",
                      task.completed
                        ? "bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-500"
                        : "bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400",
                    )}
                  >
                    +{task.xp} <span className="text-[10px] uppercase">XP</span>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        )}

        <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-3">Tareas de Hoy</h2>
        {dailyTasks.length === 0 ? (
          <div className="bg-white dark:bg-[#111] rounded-3xl p-8 text-center border border-dashed border-slate-200 dark:border-white/10">
            <Calendar className="w-12 h-12 text-slate-300 dark:text-slate-700 mx-auto mb-4" />
            <p className="text-slate-500 dark:text-slate-400 font-medium">No hay tareas programadas para hoy.</p>
          </div>
        ) : (
          dailyTasks.map((task, idx) => (
            <motion.div
              key={task.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.05 }}
              onClick={() => toggleTask(task.id, task.completed)}
              className={cn(
                "bg-white dark:bg-[#111] rounded-2xl p-4 shadow-sm border transition-all cursor-pointer flex items-center gap-4",
                task.completed
                  ? "border-emerald-200 dark:border-emerald-500/20 bg-emerald-50/30 dark:bg-emerald-500/5"
                  : "border-slate-100 dark:border-white/5 hover:border-blue-200 dark:hover:border-blue-500/40 hover:shadow-md",
              )}
            >
              <div
                className={cn(
                  "w-8 h-8 rounded-xl flex items-center justify-center shrink-0 transition-colors",
                  task.completed
                    ? "bg-emerald-500 text-white"
                    : "bg-slate-100 dark:bg-white/5 text-slate-400 dark:text-slate-600",
                )}
              >
                <Check
                  className={cn(
                    "w-5 h-5",
                    task.completed ? "opacity-100" : "opacity-0",
                  )}
                />
              </div>

              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <Calendar className="w-3.5 h-3.5 text-slate-400 dark:text-slate-600" />
                  <span className="text-xs font-bold text-slate-500 dark:text-slate-500 uppercase tracking-wider">
                    Día {task.day}
                  </span>
                </div>
                <p
                  className={cn(
                    "font-bold text-lg transition-colors",
                    task.completed
                      ? "text-slate-400 dark:text-slate-600 line-through"
                      : "text-slate-800 dark:text-slate-200",
                  )}
                >
                  {task.name}
                </p>
              </div>

              <div
                className={cn(
                  "px-3 py-1.5 rounded-lg font-bold text-sm flex items-center gap-1",
                  task.completed
                    ? "bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-500"
                    : "bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400",
                )}
              >
                +{task.xp} <span className="text-[10px] uppercase">XP</span>
              </div>
            </motion.div>
          ))
        )}
      </div>
      {/* Smart Tasks List */}
      <div className="px-6 mt-8 mb-8">
        <TaskList userId={user.id} />
      </div>

    </div>
  );
}
