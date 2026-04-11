import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  BookOpen, 
  Play, 
  Clock, 
  Star, 
  ChevronRight, 
  Search,
  Filter,
  Award,
  Check,
  Trophy,
  Loader2
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useUser } from "../contexts/UserContext";
import { supabase } from "../lib/supabase";
import { calculatePercentage } from "../utils/levelUtils";

interface Course {
  id: number;
  title: string;
  description: string;
  videoUrl: string;
  xp: number;
  category?: string;
  duration?: string;
  lessons?: number;
  rating?: number;
  image?: string;
}

import { TaskEngine } from "../utils/TaskEngine";

export default function Training() {
  const { user, refreshUser } = useUser();
  const [courses, setCourses] = useState<Course[]>([]);
  const [completedCourses, setCompletedCourses] = useState<number[]>([]);
  const [loading, setLoading] = useState(true);
  const [showLevelUp, setShowLevelUp] = useState(false);
  const [levelUpData, setLevelUpData] = useState<any>(null);
  const [completingId, setCompletingId] = useState<number | null>(null);

  const fetchData = async () => {
    if (!user?.id) return;
    
    try {
      // Fetch courses from settings
      const { data: settingsData, error: settingsError } = await supabase
        .from('settings')
        .select('value')
        .eq('key', 'courses_list')
        .single();
        
      if (!settingsError && settingsData) {
        // Add default values for UI if missing in DB
        const dbCourses = (settingsData.value as Course[]).map(c => ({
          ...c,
          category: c.category || "General",
          duration: c.duration || "45 min",
          lessons: c.lessons || 1,
          rating: c.rating || 5.0,
          image: c.image || `https://picsum.photos/seed/${c.id}/400/250`
        }));
        setCourses(dbCourses);
      }

      // Fetch completed courses
      const { data: completedData, error: completedError } = await supabase
        .from('user_courses')
        .select('course_id')
        .eq('user_id', user.id);
        
      if (completedError) throw completedError;
      
      setCompletedCourses(completedData.map(d => d.course_id));
    } catch (error) {
      console.error("Error fetching training data:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [user?.id]);

  const completeCourse = async (courseId: number, xp: number) => {
    if (!user?.id || completedCourses.includes(courseId)) return;
    
    setCompletingId(courseId);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("No session");

      const response = await fetch(`/api/courses/complete/${courseId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({ xpReward: xp })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Error al completar el curso');
      }

      const result = await response.json();

      setCompletedCourses([...completedCourses, courseId]);
      
      // Trigger COURSE_COMPLETED event
      await TaskEngine.triggerEvent('COURSE_COMPLETED', 1, { course_id: courseId.toString() });

      if (result.leveledUp) {
        setLevelUpData({ newLevel: result.newLevel, xpGained: result.xpGained });
        setShowLevelUp(true);
        setTimeout(() => setShowLevelUp(false), 4000);
      }
      
      await refreshUser();
    } catch (error) {
      console.error("Error completing course:", error);
      alert(error instanceof Error ? error.message : "Error al completar el curso");
    } finally {
      setCompletingId(null);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-[#0a0a0a] flex items-center justify-center transition-colors duration-300">
        <Loader2 className="w-10 h-10 text-blue-600 dark:text-blue-400 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#0a0a0a] pb-24 relative overflow-hidden transition-colors duration-300">
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
                Comisión: {levelUpData?.newPercentage.toFixed(1)}%
              </p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      <div className="bg-slate-900 dark:bg-[#111] text-white pt-12 pb-24 px-6 rounded-b-[40px] shadow-xl relative transition-colors duration-300">
        <div className="absolute top-[-20%] right-[-10%] w-[60%] h-[120%] bg-blue-600/20 blur-[80px] rounded-full pointer-events-none" />

        <div className="relative z-10">
          <h1 className="text-3xl font-bold tracking-tight mb-2">Capacitación</h1>
          <p className="text-slate-400 dark:text-slate-500 text-lg">Domina el arte del crecimiento financiero.</p>
        </div>
      </div>

      {/* Search & Filter */}
      <div className="px-6 -mt-8 relative z-20 mb-8">
        <div className="bg-white dark:bg-[#111] rounded-2xl p-2 shadow-lg border border-slate-100 dark:border-white/5 flex items-center gap-2">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 dark:text-slate-600" />
            <input 
              type="text" 
              placeholder="Buscar cursos..." 
              className="w-full pl-10 pr-4 py-3 bg-transparent focus:outline-none font-medium text-slate-700 dark:text-slate-200 placeholder:text-slate-400 dark:placeholder:text-slate-600"
            />
          </div>
          <button className="w-12 h-12 rounded-xl bg-slate-50 dark:bg-white/5 flex items-center justify-center text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/10 transition-colors">
            <Filter className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Categories */}
      <div className="px-6 mb-8 overflow-x-auto flex gap-3 no-scrollbar">
        {["Todos", "Marketing", "Ventas", "Redes", "Liderazgo"].map((cat, i) => (
          <button 
            key={cat}
            className={cn(
              "px-6 py-2 rounded-full font-bold text-sm whitespace-nowrap transition-all",
              i === 0 
                ? "bg-blue-600 text-white shadow-md shadow-blue-200 dark:shadow-blue-900/20" 
                : "bg-white dark:bg-[#111] text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-white/10"
            )}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Course List */}
      <div className="px-6 space-y-6">
        <h2 className="text-xl font-bold text-slate-900 dark:text-slate-200 flex items-center gap-2">
          <Star className="w-5 h-5 text-amber-500 fill-amber-500" />
          Cursos Destacados
        </h2>

        {courses.map((course, idx) => (
          <motion.div
            key={course.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.1 }}
            className="bg-white dark:bg-[#111] rounded-3xl overflow-hidden shadow-sm border border-slate-100 dark:border-white/5 group active:scale-[0.98] transition-all"
          >
            <div className="relative h-48 overflow-hidden">
              <img 
                src={course.image} 
                alt={course.title} 
                className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                referrerPolicy="no-referrer"
              />
              <div className="absolute top-4 left-4">
                <span className="px-3 py-1 rounded-full bg-white/90 dark:bg-black/80 backdrop-blur-sm text-blue-600 dark:text-blue-400 text-[10px] font-black uppercase tracking-widest shadow-sm">
                  {course.category}
                </span>
              </div>
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent flex items-end p-6">
                <div className="flex items-center gap-4 text-white/90 text-xs font-bold">
                  <div className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {course.duration}
                  </div>
                  <div className="flex items-center gap-1">
                    <BookOpen className="w-3 h-3" />
                    {course.lessons} lecciones
                  </div>
                </div>
              </div>
              <button 
                onClick={() => completeCourse(course.id, course.xp)}
                disabled={completedCourses.includes(course.id) || completingId === course.id}
                className={cn(
                  "absolute bottom-4 right-4 w-12 h-12 rounded-full flex items-center justify-center shadow-lg transition-all",
                  completedCourses.includes(course.id) 
                    ? "bg-emerald-500 text-white shadow-emerald-500/40" 
                    : "bg-blue-600 text-white shadow-blue-500/40 hover:scale-110"
                )}
              >
                {completingId === course.id ? (
                  <Loader2 className="w-5 h-5 animate-spin text-white" />
                ) : completedCourses.includes(course.id) ? (
                  <Check className="w-5 h-5 text-white" />
                ) : (
                  <Play className="w-5 h-5 fill-white" />
                )}
              </button>
            </div>

            <div className="p-6">
              <div className="flex justify-between items-start mb-2">
                <h3 className="text-lg font-bold text-slate-900 dark:text-slate-200 leading-tight flex-1 mr-2">
                  {course.title}
                </h3>
                <div className="flex items-center gap-1 text-amber-500 font-bold text-sm">
                  <Star className="w-4 h-4 fill-amber-500" />
                  {course.rating}
                </div>
              </div>
              <p className="text-slate-500 dark:text-slate-500 text-sm mb-4 line-clamp-2">
                {course.description}
              </p>
              
              <div className="flex items-center justify-between pt-4 border-t border-slate-50 dark:border-white/5">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-500/10 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                    <Award className="w-5 h-5" />
                  </div>
                  <span className="text-sm font-black text-emerald-600 dark:text-emerald-400">+{course.xp} XP</span>
                </div>
                <button 
                  onClick={() => completeCourse(course.id, course.xp)}
                  disabled={completedCourses.includes(course.id) || completingId === course.id}
                  className={cn(
                    "font-bold text-sm flex items-center gap-1 transition-colors",
                    completedCourses.includes(course.id) ? "text-emerald-600 dark:text-emerald-400" : "text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300"
                  )}
                >
                  {completedCourses.includes(course.id) ? "Completado" : "Completar Curso"}
                  {!completedCourses.includes(course.id) && <ChevronRight className="w-4 h-4" />}
                </button>
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
