import { Router } from 'express';

export function tasksRoutes(services: any) {
  const { supabase, authenticate, authorizeAdmin, calculatePercentage, updateWalletBalance, processPlanPurchase, evaluateTasks, checkDailyReset, getOrCreateProfile, sendNotification } = services;
  const router = Router();



  router.post('/tasks/claim/:id', authenticate, async (req: any, res: any) => {
    try {






    const user = req.user;

      const taskId = req.params.id;

      // Check if task is ready to claim
      const { data: userTask } = await supabase
        .from('user_tasks')
        .select('*, tasks(xp_reward)')
        .eq('user_id', user.id)
        .eq('task_id', taskId)
        .single();

      if (!userTask || !userTask.ready_to_claim || userTask.completed) {
        return res.status(400).json({ error: 'Task not ready to claim or already completed' });
      }

      // Mark as completed
      await supabase
        .from('user_tasks')
        .update({
          completed: true,
          ready_to_claim: false,
          completed_at: new Date().toISOString()
        })
        .eq('id', userTask.id);

      // Add XP
      const xpReward = userTask.tasks?.xp_reward || 0;
      
      // Get current user profile
      const { data: profile } = await supabase
        .from('users')
        .select('xp, level, plan')
        .eq('id', user.id)
        .single();

      if (profile) {
        const newXp = (profile.xp || 0) + xpReward;
        let newLevel = Math.floor(newXp / 1000) + 1;
        if (newLevel > 100) newLevel = 100;
        let newPercentage = profile.percentage || 0;
        let leveledUp = newLevel > (profile.level || 1);

        if (leveledUp) {
          newPercentage = calculatePercentage(newLevel, profile.plan || 'Básico');
        }

        await supabase
          .from('users')
          .update({ xp: newXp, level: newLevel, percentage: newPercentage })
          .eq('id', user.id);

        res.json({ success: true, xpGained: xpReward, leveledUp, newLevel, newPercentage });
      } else {
        res.json({ success: true, xpGained: xpReward, leveledUp: false });
      }
    } catch (error: any) {
      console.error('Error claiming task:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // --- END SMART TASKS ENGINE ---

  // Complete a task
  router.post('/tasks/complete/:id', authenticate, async (req: any, res: any) => {







    try {
    const authUser = req.user;

      const taskId = req.params.id;

      // Check daily reset before completing
      await checkDailyReset(authUser.id);

      // 1. Get task details to know XP reward
      const { data: task, error: taskError } = await supabase
        .from('tasks')
        .select('*')
        .eq('id', taskId)
        .single();

      if (taskError || !task) return res.status(404).json({ error: 'Tarea no encontrada' });

      // 2. Check if already completed today
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const { data: existingTask } = await supabase
        .from('user_tasks')
        .select('*')
        .eq('user_id', authUser.id)
        .eq('task_id', taskId)
        .gte('completed_at', today.toISOString())
        .single();

      if (existingTask) return res.status(400).json({ error: 'Tarea ya completada hoy' });

      // 3. Update user_tasks
      const { error: utError } = await supabase
        .from('user_tasks')
        .insert({
          user_id: authUser.id,
          task_id: taskId,
          completed_at: new Date().toISOString()
        });

      if (utError) throw utError;

      // 4. Update user XP and Level
      const { data: profile } = await supabase
        .from('users')
        .select('xp, level, plan')
        .eq('id', authUser.id)
        .single();

      if (!profile) throw new Error("Perfil no encontrado");

      const xpGained = task.xp || 100;
      const newXp = (profile.xp || 0) + xpGained;
      let newLevel = Math.floor(newXp / 1000) + 1;
      if (newLevel > 100) newLevel = 100;
      let leveledUp = newLevel > (profile.level || 1);
      let newPercentage = profile.percentage;

      // Level up logic
      if (leveledUp) {
        newPercentage = calculatePercentage(newLevel, profile.plan || 'Básico');
      }

      await supabase
        .from('users')
        .update({
          xp: newXp,
          level: newLevel,
          percentage: newPercentage
        })
        .eq('id', authUser.id);

      res.json({ 
        success: true, 
        xpGained, 
        newXp, 
        newLevel, 
        leveledUp,
        newPercentage
      });
    } catch (error: any) {
      console.error('Error in /api/tasks/complete:', error);
      res.status(500).json({ error: error.message });
    }
  });
// Activate Tasks
  router.post('/tasks/activate', authenticate, async (req: any, res: any) => {
    try {







    const authUser = req.user;

      // Get user profile (using helper to ensure it exists)
      const profile = await getOrCreateProfile(authUser.id, authUser.email, authUser.user_metadata);

      // Check if already active
      if (profile.is_tasks_active) {
        return res.status(400).json({ error: 'Las tareas ya están activas' });
      }

      const startDate = new Date();
      const endDate = new Date();
      endDate.setDate(startDate.getDate() + 7);

      // Update user
      const { error: updateError } = await supabase
        .from('users')
        .update({
          is_tasks_active: true,
          task_start_date: startDate.toISOString(),
          task_end_date: endDate.toISOString()
        })
        .eq('id', authUser.id);

      if (updateError) throw updateError;

      // Notify user
      await sendNotification({
        userId: authUser.id,
        title: 'Tareas Activadas',
        message: 'Tu ciclo de tareas de 7 días ha comenzado. ¡Buena suerte!',
        type: 'success'
      });

      res.json({ 
        success: true, 
        task_start_date: startDate.toISOString(), 
        task_end_date: endDate.toISOString() 
      });
    } catch (error: any) {
      console.error('Error in /api/tasks/activate:', error);
      res.status(500).json({ error: error.message || 'Error al activar tareas' });
    }
  });


  router.get('/tasks/status', authenticate, async (req: any, res: any) => {
    try {






    const authUser = req.user;

      const user = await getOrCreateProfile(authUser.id, authUser.email, authUser.user_metadata);

      // Check if cycle has ended
      if (user.is_tasks_active && user.task_end_date && new Date() > new Date(user.task_end_date)) {
        // Cycle ended! Apply penalties
        
        // 1. Get all tasks for the 7-day cycle
        const { data: allTasks } = await supabase.from('tasks').select('*');
        
        // 2. Get user's completed tasks for this cycle
        const { data: completedTasks } = await supabase
          .from('user_tasks')
          .select('task_id')
          .eq('user_id', user.id);
        
        const completedIds = new Set(completedTasks?.map(ct => ct.task_id) || []);
        const uncompletedTasks = (allTasks || []).filter(t => !completedIds.has(t.id));

        // 3. Create penalty tasks for each uncompleted task
        if (uncompletedTasks.length > 0) {
          const penaltyTasks = uncompletedTasks.map(t => ({
            user_id: user.id,
            name: `Penalización: ${t.name}`,
            xp: Math.floor(t.xp * 0.5), // Penalty tasks give less XP
            is_completed: false,
            original_task_id: t.id
          }));

          await supabase.from('penalty_tasks').insert(penaltyTasks);
          
          // Deduct some XP or lower compliance
          const penaltyXp = uncompletedTasks.length * 50;
          const newCompliance = Math.max(0, (user.compliance_score || 100) - (uncompletedTasks.length * 5));
          
          await supabase.from('users').update({
            xp: Math.max(0, (user.xp || 0) - penaltyXp),
            compliance_score: newCompliance,
            is_tasks_active: false, // Deactivate tasks until next payment
            inventory_status: 'Inactivo'
          }).eq('id', user.id);

          // Notify user
          await sendNotification({
            userId: user.id,
            title: 'Ciclo de Tareas Finalizado',
            message: `Tu ciclo de 7 días ha terminado. No completaste ${uncompletedTasks.length} tareas. Se han aplicado sanciones y se han generado tareas de castigo.`,
            type: 'warning'
          });
        } else {
          // All tasks completed! Great job.
          await supabase.from('users').update({
            is_tasks_active: false,
            inventory_status: 'Inactivo',
            compliance_score: Math.min(100, (user.compliance_score || 100) + 5)
          }).eq('id', user.id);

          await sendNotification({
            userId: user.id,
            title: '¡Ciclo Completado!',
            message: '¡Felicidades! Has completado todas tus tareas del ciclo de 7 días. Tu cumplimiento ha mejorado.',
            type: 'success'
          });
        }

        // Clear user_tasks for the next cycle
        await supabase.from('user_tasks').delete().eq('user_id', user.id);
        
        return res.json({ cycleEnded: true });
      }

      res.json({ cycleEnded: false });
    } catch (error) {
      console.error('Error checking task status:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });


  // Get Penalty Tasks
  router.get('/tasks/penalty', authenticate, async (req: any, res: any) => {
    try {






    const authUser = req.user;

      const { data, error } = await supabase
        .from('penalty_tasks')
        .select('*')
        .eq('user_id', authUser.id)
        .eq('is_completed', false);

      if (error) throw error;
      res.json(data || []);
    } catch (error: any) {
      console.error('Error fetching penalty tasks:', JSON.stringify(error, null, 2));
      res.status(500).json({ error: 'Internal server error' });
    }
  });


  // Complete Penalty Task
  router.post('/tasks/complete-penalty/:id', authenticate, async (req: any, res: any) => {
    try {






    const authUser = req.user;

      const { id } = req.params;

      const { data: penaltyTask, error: fetchError } = await supabase
        .from('penalty_tasks')
        .select('*')
        .eq('id', id)
        .eq('user_id', authUser.id)
        .single();

      if (fetchError || !penaltyTask) return res.status(404).json({ error: 'Penalty task not found' });
      if (penaltyTask.is_completed) return res.status(400).json({ error: 'Task already completed' });

      // Update penalty task
      await supabase.from('penalty_tasks').update({ is_completed: true }).eq('id', id);

      // Add XP to user
      const { data: profile } = await supabase.from('users').select('xp, level, plan').eq('id', authUser.id).single();
      if (profile) {
        const xpGained = penaltyTask.xp || 50;
        const newXp = (profile.xp || 0) + xpGained;
        let newLevel = Math.floor(newXp / 1000) + 1;
        if (newLevel > 100) newLevel = 100;
        let leveledUp = newLevel > (profile.level || 1);
        let newPercentage = profile.percentage;

        if (leveledUp) {
          // Recalculate percentage
          newPercentage = calculatePercentage(newLevel, profile.plan || 'Básico');
        }

        await supabase.from('users').update({ xp: newXp, level: newLevel, percentage: newPercentage }).eq('id', authUser.id);
        res.json({ success: true, xpGained, leveledUp, newLevel, newPercentage });
      } else {
        res.json({ success: true, xpGained: 0, leveledUp: false, newLevel: 1, newPercentage: 0 });
      }
    } catch (error) {
      console.error('Error completing penalty task:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });
  return router;
}
