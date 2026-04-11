import { useState } from 'react';
import { motion } from 'motion/react';
import { CheckCircle2, Gift, Star, Target, Zap } from 'lucide-react';
import { TaskProgressBar } from './TaskProgressBar';
import { cn } from "../../lib/utils";

export function TaskItem({ task, onClaimed }: { task: any, onClaimed: () => void }) {
  const [claiming, setClaiming] = useState(false);
  const { userTask } = task;

  const handleClaim = async () => {
    if (!userTask.ready_to_claim || userTask.completed || claiming) return;

    setClaiming(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/tasks/claim/${task.id}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      const data = await response.json();
      if (data.success) {
        onClaimed();
        // Optional: Trigger global confetti or toast
      } else {
        console.error('Failed to claim task:', data.error);
      }
    } catch (error) {
      console.error('Error claiming task:', error);
    } finally {
      setClaiming(false);
    }
  };

  const getIcon = () => {
    switch (task.type) {
      case 'INVITE_COUNT': return <Target className="w-5 h-5" />;
      case 'PROFILE_COMPLETED': return <CheckCircle2 className="w-5 h-5" />;
      case 'LOGIN_STREAK': return <Zap className="w-5 h-5" />;
      default: return <Star className="w-5 h-5" />;
    }
  };

  return (
    <div className={cn(
      "bg-white rounded-xl border p-4 transition-all duration-300",
      userTask.completed ? "border-green-200 bg-green-50/50" : 
      userTask.ready_to_claim ? "border-indigo-300 shadow-md shadow-indigo-100" : "border-gray-200"
    )}>
      <div className="flex items-start gap-4">
        <div className={cn(
          "p-3 rounded-lg flex-shrink-0",
          userTask.completed ? "bg-green-100 text-green-600" :
          userTask.ready_to_claim ? "bg-indigo-100 text-indigo-600" : "bg-gray-100 text-gray-500"
        )}>
          {getIcon()}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div>
              <h3 className={cn(
                "font-semibold truncate",
                userTask.completed ? "text-green-900" : "text-gray-900"
              )}>
                {task.title || task.name}
              </h3>
              <p className="text-sm text-gray-500 mt-1 line-clamp-2">
                {task.description || "Completa esta tarea para ganar XP"}
              </p>
            </div>
            <div className="flex items-center gap-1 bg-amber-50 text-amber-700 px-2.5 py-1 rounded-full text-sm font-medium whitespace-nowrap">
              <Star className="w-4 h-4 fill-amber-500 text-amber-500" />
              {task.xp_reward || task.xp} XP
            </div>
          </div>

          <div className="mt-4 flex items-center gap-4">
            <div className="flex-1">
              <TaskProgressBar 
                progress={userTask.progress} 
                required={userTask.required || task.conditions?.value || 1} 
                completed={userTask.completed}
              />
            </div>
            
            <div className="flex-shrink-0">
              {userTask.completed ? (
                <div className="flex items-center gap-1 text-green-600 font-medium text-sm">
                  <CheckCircle2 className="w-5 h-5" />
                  Completada
                </div>
              ) : (
                <motion.button
                  whileHover={userTask.ready_to_claim ? { scale: 1.05 } : {}}
                  whileTap={userTask.ready_to_claim ? { scale: 0.95 } : {}}
                  onClick={handleClaim}
                  disabled={!userTask.ready_to_claim || claiming}
                  className={cn(
                    "px-4 py-2 rounded-lg font-medium text-sm flex items-center gap-2 transition-colors",
                    userTask.ready_to_claim 
                      ? "bg-indigo-600 text-white hover:bg-indigo-700 shadow-md shadow-indigo-200" 
                      : "bg-gray-100 text-gray-400 cursor-not-allowed"
                  )}
                >
                  {claiming ? (
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <Gift className="w-4 h-4" />
                  )}
                  Reclamar
                </motion.button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
