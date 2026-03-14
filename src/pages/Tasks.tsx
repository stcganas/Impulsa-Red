import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Check, Calendar, Star, Trophy, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useUser } from "../contexts/UserContext";
import { supabase } from "../lib/supabase";

interface Task {
  id: string;
  day: string;
  name: string;
  xp: number;
  completed: boolean;
}

export default function Tasks() {
  const { user, refreshUser } = useUser();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [showLevelUp, setShowLevelUp] = useState(false);
  const [levelUpData, setLevelUpData] = useState<any>(null);

  const fetchTasks = async () => {
    if (!user?.id) return;
    try {
      // Get all tasks
      const { data: allTasks, error: tasksError } = await supabase
        .from('tasks')
        .select('*')
        .order('id');
        
      if (tasksError) throw tasksError;

      // Get user's completed tasks
      const { data: userTasks, error: userTasksError } = await supabase
        .from('user_tasks')
        .select('task_id')
        .eq('user_id', user.id);
        
      if (userTasksError) throw userTasksError;

      const completedTaskIds = new Set(userTasks?.map(ut => ut.task_id));

      const formattedTasks = (allTasks || []).map(t => ({
        id: t.id,
        day: t.day,
        name: t.name,
        xp: t.xp,
        completed: completedTaskIds.has(t.id)
      }));

      setTasks(formattedTasks);
    } catch (error) {
      console.error("Error fetching tasks:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTasks();
  }, [user?.id]);

  const completedCount = tasks.filter((t) => t.completed).length;
  const totalXP = completedCount * 100; // This is just for the weekly progress UI
  const progress = (completedCount / tasks.length) * 100;

  const toggleTask = async (id: string, alreadyCompleted: boolean) => {
    if (alreadyCompleted || !user?.id) return;

    try {
      // 1. Insert into user_tasks
      const { error: insertError } = await supabase
        .from('user_tasks')
        .insert({ user_id: user.id, task_id: id });

      if (insertError) throw insertError;

      // 2. Get task XP
      const task = tasks.find(t => t.id === id);
      const xpGained = task?.xp || 100;

      // 3. Update user XP
      const newXp = (user.xp || 0) + xpGained;
      let newLevel = user.level || 1;
      let leveledUp = false;

      if (newXp >= newLevel * 1000) {
        newLevel += 1;
        leveledUp = true;
      }

      const { error: updateError } = await supabase
        .from('users')
        .update({ xp: newXp, level: newLevel })
        .eq('id', user.id);

      if (updateError) throw updateError;
      
      // Update local task state
      setTasks(tasks.map(t => t.id === id ? { ...t, completed: true } : t));
      
      // Handle level up
      if (leveledUp) {
        setLevelUpData({ newLevel, xpGained });
        setShowLevelUp(true);
        setTimeout(() => setShowLevelUp(false), 4000);
      }
      
      // Refresh global user data
      await refreshUser();
    } catch (error) {
      console.error("Error completing task:", error);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <Loader2 className="w-10 h-10 text-blue-600 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 pb-24 relative overflow-hidden">
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
      <div className="bg-slate-900 text-white pt-12 pb-24 px-6 rounded-b-[40px] shadow-xl relative">
        <div className="absolute top-[-20%] right-[-10%] w-[60%] h-[120%] bg-blue-600/20 blur-[80px] rounded-full pointer-events-none" />

        <div className="relative z-10">
          <h1 className="text-3xl font-bold tracking-tight mb-2">
            Tareas Semanales
          </h1>
          <p className="text-slate-400 text-lg">
            Gana XP y sube de nivel más rápido.
          </p>
        </div>
      </div>

      {/* Progress Card */}
      <div className="px-6 -mt-16 relative z-20 mb-8">
        <div className="bg-white rounded-3xl p-6 shadow-xl shadow-slate-200/50 border border-slate-100">
          <div className="flex justify-between items-end mb-4">
            <div>
              <p className="text-slate-500 font-medium text-sm uppercase tracking-wider mb-1">
                Progreso Semanal
              </p>
              <div className="text-3xl font-black text-slate-900 flex items-baseline gap-1">
                {completedCount * 100}{" "}
                <span className="text-lg text-slate-400 font-bold">
                  / 700 XP
                </span>
              </div>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-amber-50 flex items-center justify-center">
              <Star className="w-6 h-6 text-amber-500 fill-amber-500" />
            </div>
          </div>

          <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden mb-2">
            <motion.div
              className="h-full bg-gradient-to-r from-amber-400 to-amber-500 rounded-full"
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.5 }}
            />
          </div>
          <p className="text-sm text-slate-500 font-medium text-center">
            700 XP = 7 niveles por semana
          </p>
        </div>
      </div>

      {/* Task List */}
      <div className="px-6 space-y-4">
        {tasks.map((task, idx) => (
          <motion.div
            key={task.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.05 }}
            onClick={() => toggleTask(task.id, task.completed)}
            className={cn(
              "bg-white rounded-2xl p-4 shadow-sm border transition-all cursor-pointer flex items-center gap-4",
              task.completed
                ? "border-emerald-200 bg-emerald-50/30"
                : "border-slate-100 hover:border-blue-200 hover:shadow-md",
            )}
          >
            <div
              className={cn(
                "w-8 h-8 rounded-xl flex items-center justify-center shrink-0 transition-colors",
                task.completed
                  ? "bg-emerald-500 text-white"
                  : "bg-slate-100 text-slate-400",
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
                <Calendar className="w-3.5 h-3.5 text-slate-400" />
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                  {task.day}
                </span>
              </div>
              <p
                className={cn(
                  "font-bold text-lg transition-colors",
                  task.completed
                    ? "text-slate-400 line-through"
                    : "text-slate-800",
                )}
              >
                {task.name}
              </p>
            </div>

            <div
              className={cn(
                "px-3 py-1.5 rounded-lg font-bold text-sm flex items-center gap-1",
                task.completed
                  ? "bg-emerald-100 text-emerald-700"
                  : "bg-blue-50 text-blue-600",
              )}
            >
              +{task.xp} <span className="text-[10px] uppercase">XP</span>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
