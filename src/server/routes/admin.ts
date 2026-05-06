import { Router } from 'express';

export function adminRoutes(services: any) {
  const { supabase, authenticate, authorizeAdmin, calculatePercentage, updateWalletBalance, processPlanPurchase, evaluateTasks, checkDailyReset, getOrCreateProfile, sendNotification } = services;
  const router = Router();



  // Approve Transaction (Admin only)
  router.post('/transactions/approve', authenticate, authorizeAdmin, async (req: any, res: any) => {
    try {
      const { transactionId } = req.body;
      if (!transactionId) return res.status(400).json({ error: 'Transaction ID is required' });

      // Get transaction details
      const { data: tx, error: txError } = await supabase
        .from('transactions')
        .select('*')
        .eq('id', transactionId)
        .single();

      if (txError || !tx) throw new Error("Transaction not found");
      if (tx.status !== 'pending') throw new Error("Transaction is already processed");

      if (tx.type === 'plan_purchase') {
        await processPlanPurchase(tx);
      }

      // Update transaction status
      const { error: updateError } = await supabase
        .from('transactions')
        .update({ status: 'completed' })
        .eq('id', transactionId);

      if (updateError) throw updateError;

      res.json({ success: true });
    } catch (error: any) {
      console.error('Error in /api/admin/transactions/approve:', error);
      res.status(500).json({ error: error.message || 'Error al aprobar transacción' });
    }
  });


  // Update Transaction Status (Withdrawals, etc.)
  router.post('/transactions/update-status', authenticate, authorizeAdmin, async (req: any, res: any) => {
    try {
      const { transactionId, status, rejectionReason } = req.body;

      // Get transaction details
      const { data: tx, error: txError } = await supabase
        .from('transactions')
        .select('*, users!transactions_user_id_fkey(name)')
        .eq('id', transactionId)
        .single();

      if (txError || !tx) return res.status(404).json({ error: 'Transacción no encontrada' });

      // Update status
      const { error: updateError } = await supabase
        .from('transactions')
        .update({ status })
        .eq('id', transactionId);

      if (updateError) throw updateError;

      // Update user's wallet balance
      await updateWalletBalance(tx.user_id);

      // Send notification to user
      let title = "";
      let message = "";
      if (tx.type === 'withdrawal') {
        if (status === 'completed') {
          title = "Retiro Aprobado";
          message = `Tu solicitud de retiro por $${Number(tx.amount).toLocaleString('es-CO')} ha sido aprobada.`;
        } else if (status === 'rejected') {
          title = "Retiro Rechazado";
          message = `Tu solicitud de retiro por $${Number(tx.amount).toLocaleString('es-CO')} ha sido rechazada.${rejectionReason ? ` Motivo: ${rejectionReason}` : ''}`;
        }
      } else if (tx.type === 'plan_purchase') {
        if (status === 'rejected') {
          title = "Compra de Plan Rechazada";
          message = `Tu comprobante de pago para el plan ha sido rechazado.${rejectionReason ? ` Motivo: ${rejectionReason}` : ''}`;
        }
      }

      if (title && message) {
        await sendNotification({
          userId: tx.user_id,
          title,
          message,
          type: status === 'completed' ? 'success' : 'error'
        });
      }

      res.json({ success: true });
    } catch (error) {
      console.error('Error in /api/admin/transactions/update-status:', error);
      res.status(500).json({ error: 'Error al actualizar estado de transacción' });
    }
  });


  // Admin Stats
  router.get('/dashboard-data', authenticate, authorizeAdmin, async (req: any, res: any) => {
    try {
      // Fetch total users
      const { count: totalUsersCount } = await supabase
        .from('users')
        .select('*', { count: 'exact', head: true });

      // Fetch active users (status = 'active')
      const { count: activeUsersCount } = await supabase
        .from('users')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'active');

      // Fetch total transactions and volume
      const { data: transactionsData } = await supabase
        .from('transactions')
        .select('amount, status');

      const totalTransactions = transactionsData ? transactionsData.length : 0;
      const totalVolume = transactionsData 
        ? transactionsData.reduce((sum: number, tx: any) => sum + Number(tx.amount || 0), 0) 
        : 0;

      // Fetch recent transactions
      const { data: recentTxs, error: txsError } = await supabase
        .from('transactions')
        .select(`
          id,
          type,
          amount,
          created_at,
          user_id
        `)
        .order('created_at', { ascending: false })
        .limit(5);

      if (txsError) {
        console.error("Error fetching recent transactions:", txsError);
      }

      // Fetch user names for recent transactions manually to avoid join issues
      let recentActivity = [];
      if (recentTxs && recentTxs.length > 0) {
        const userIds = [...new Set(recentTxs.map((tx: any) => tx.user_id))];
        const { data: usersData } = await supabase
          .from('users')
          .select('id, name')
          .in('id', userIds);
        
        const userMap = new Map(usersData?.map((u: any) => [u.id, u.name]) || []);
        
        recentActivity = recentTxs.map((tx: any) => ({
          ...tx,
          users: { name: userMap.get(tx.user_id) || "Usuario" }
        }));
      }

      // Fetch Pending Tickets
      const { count: ticketCount } = await supabase
        .from('tickets')
        .select('*', { count: 'exact', head: true })
        .neq('status', 'resolved');

      res.json({
        totalUsers: totalUsersCount || 0,
        activeUsers: activeUsersCount || 0,
        totalTransactions,
        totalVolume,
        recentActivity: recentActivity,
        pendingTickets: ticketCount || 0
      });
    } catch (error: any) {
      console.error("Error in /api/admin/dashboard-data:", error);
      res.status(500).json({ error: error.message });
    }
  });


  // Admin: Get Scheduler Status
  router.get('/notifications/scheduler', authenticate, authorizeAdmin, async (req: any, res: any) => {
    try {
      // Fetch dynamic scheduled notifications
      const { data: customTasks } = await supabase
        .from('scheduled_notifications')
        .select(`
          *,
          user:user_id(name)
        `)
        .eq('status', 'pending')
        .order('scheduled_at', { ascending: true });

      res.json({
        active: true,
        tasks: [
          {
            id: 'hourly-reminders',
            name: 'Recordatorios de Tareas (Cada hora)',
            schedule: '0 * * * *',
            description: 'Envía notificaciones a usuarios con tareas pendientes.'
          },
          {
            id: 'daily-motivation',
            name: 'Motivación Diaria (8:00 AM)',
            schedule: '0 8 * * *',
            description: 'Envía una frase motivacional a todos los usuarios.'
          },
          {
            id: 'weekly-summary',
            name: 'Resumen Semanal (Lunes 9:00 AM)',
            schedule: '0 9 * * 1',
            description: 'Envía un resumen de actividad al inicio de semana.'
          }
        ],
        customTasks: customTasks || []
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });


  // Admin: Create Scheduled Notification
  router.post('/notifications/schedule', authenticate, authorizeAdmin, async (req: any, res: any) => {
    try {
      const { title, message, type, scheduledAt, userId, targetRole } = req.body;
      
      if (!title || !message || !scheduledAt) {
        return res.status(400).json({ error: 'Título, mensaje y fecha son requeridos' });
      }

      const { data, error } = await supabase
        .from('scheduled_notifications')
        .insert({
          title,
          message,
          type: type || 'info',
          scheduled_at: scheduledAt,
          user_id: userId || null,
          target_role: targetRole || null,
          status: 'pending'
        })
        .select()
        .single();

      if (error) throw error;
      res.json(data);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });


  // Admin: Cancel Scheduled Notification
  router.delete('/notifications/schedule/:id', authenticate, authorizeAdmin, async (req: any, res: any) => {
    try {
      const { id } = req.params;
      const { error } = await supabase
        .from('scheduled_notifications')
        .delete()
        .eq('id', id);

      if (error) throw error;
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });


  // Admin: Send Global Notification
  router.post('/notifications/global', authenticate, authorizeAdmin, async (req: any, res: any) => {
    try {
      const { title, message, type, targetRole } = req.body;
      if (!title || !message) {
        return res.status(400).json({ error: 'Título y mensaje son requeridos' });
      }

      // Fetch users to notify
      let query = supabase.from('users').select('id');
      if (targetRole && targetRole !== 'todos') {
        query = query.eq('role', targetRole);
      }
      
      const { data: targetUsers, error: usersError } = await query;
      if (usersError) throw usersError;

      if (!targetUsers || targetUsers.length === 0) {
        return res.json({ success: true, count: 0, message: 'No hay usuarios que coincidan con el filtro' });
      }

      // Prepare notifications
      const notifications = targetUsers.map(u => ({
        userId: u.id,
        title,
        message,
        type: type || 'info'
      }));

      // Send in batches using the service
      await sendNotification(notifications);

      res.json({ success: true, count: notifications.length });
    } catch (error: any) {
      console.error("Error sending global notification:", error);
      res.status(500).json({ error: error.message });
    }
  });


  // Admin Transactions
  router.get('/transactions', authenticate, async (req: any, res: any) => {
    try {







    const adminUser = req.user;

      // Check if admin
      const { data: adminProfile } = await supabase.from('users').select('role').eq('id', adminUser.id).single();
      if (adminProfile?.role !== 'admin') return res.status(403).json({ error: 'No autorizado' });

      const { data, error } = await supabase
        .from('transactions')
        .select(`
          *,
          users!transactions_user_id_fkey (
            name,
            email
          )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      res.json(data || []);
    } catch (error: any) {
      console.error("Error in /api/admin/transactions:", error);
      res.status(500).json({ error: error.message });
    }
  });


  // System Status (Admin only)
  router.get('/system-status', authenticate, authorizeAdmin, async (req: any, res: any) => {
    try {
      const status = {
        database: supabase ? 'up' : 'down',
        gemini_api: (process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY !== 'MY_GEMINI_API_KEY') ? 'up' : 'down',
        auth: 'up', 
        auth_server: 'up', // Match interface in frontend
        storage: 'up', 
        server: 'up',
        timestamp: new Date().toISOString(),
        env: process.env.NODE_ENV || 'development'
      };

      res.json(status);
    } catch (error: any) {
      console.error("[SYSTEM STATUS ERROR]", error);
      res.status(500).json({ error: error.message });
    }
  });


  // Update Global Setting (Admin Only)
  router.post('/app-config', authenticate, authorizeAdmin, async (req: any, res: any) => {
    try {







    const user = req.user;





      const { key, value } = req.body;

      const { error: upsertError } = await supabase
        .from('settings')
        .upsert({ key, value }, { onConflict: 'key' });

      if (upsertError) throw upsertError;

      res.json({ success: true });
    } catch (error) {
      console.error('Error in POST /api/admin/app-config:', error);
      res.status(500).json({ error: 'Error al actualizar configuración' });
    }
  });


  // Tickets - List All (Admin)
  router.get('/tickets', authenticate, async (req: any, res: any) => {
    try {






    const user = req.user;

      const { data: profile, error: profileError } = await supabase.from('users').select('role').eq('id', user.id).single();
      
      if (profileError || profile?.role !== 'admin') {
        console.warn('Unauthorized admin access attempt:', user.id, profileError);
        return res.status(403).json({ error: 'Forbidden' });
      }

      const { data, error } = await supabase
        .from('tickets')
        .select('*, user:user_id(name, email)')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Supabase error in GET /api/admin/tickets:', JSON.stringify(error, null, 2));
        throw error;
      }
      res.json(data);
    } catch (error: any) {
      console.error('Error in GET /api/admin/tickets:', error.message || error);
      res.status(500).json({ error: 'Error al obtener tickets', details: error.message || error });
    }
  });


  // Tickets - Resolve (Admin)
  router.post('/tickets/:id/resolve', authenticate, authorizeAdmin, async (req: any, res: any) => {
    try {
      const { id } = req.params;
      const { admin_reply } = req.body;

      const { data, error } = await supabase
        .from('tickets')
        .update({
          status: 'resolved',
          admin_reply,
          resolved_at: new Date().toISOString()
        })
        .eq('id', id)
        .select().single();

      if (error) throw error;

      // Notify user
      await sendNotification({
        userId: data.user_id,
        title: 'Ticket Resuelto',
        message: `Tu ticket "${data.subject}" ha sido resuelto.`,
        type: 'success'
      });

      res.json(data);
    } catch (error) {
      console.error('Error in POST /api/admin/tickets/:id/resolve:', error);
      res.status(500).json({ error: 'Error al resolver ticket' });
    }
  });


  // Get All Users (Bypasses RLS - Admin Only)
  router.get('/users', authenticate, authorizeAdmin, async (req: any, res: any) => {
    try {
      // Fetch all users using service role key (which bypasses RLS)
      const { data: users, error: usersError } = await supabase
        .from('users')
        .select('*');

      if (usersError) {
        console.error("Error fetching all users on server:", usersError);
        return res.status(500).json({ error: 'Error al obtener los usuarios' });
      }

      // Fetch all user_tasks to count completed tasks per user
      const { data: userTasks } = await supabase.from('user_tasks').select('user_id');
      
      // Fetch all transactions to calculate wallet balance per user
      const { data: transactions } = await supabase.from('transactions').select('user_id, amount').eq('status', 'completed');

      // Fetch all referrals to count referrals per user
      const { data: referrals } = await supabase.from('users').select('referred_by');

      const usersWithStats = users.map(u => {
        const completedTasks = userTasks?.filter(t => t.user_id === u.id).length || 0;
        const walletBalance = transactions?.filter(t => t.user_id === u.id).reduce((sum, t) => sum + (t.amount || 0), 0) || 0;
        const referralCount = referrals?.filter(r => r.referred_by === u.id).length || 0;
        
        return {
          ...u,
          completedTasks,
          walletBalance,
          referralCount
        };
      });

      res.json(usersWithStats);
    } catch (error) {
      console.error('Error in /api/admin/users:', error);
      res.status(500).json({ error: 'Error interno del servidor' });
    }
  });


  // Update User (Bypasses RLS - Admin Only)
  router.patch('/users/:id', authenticate, authorizeAdmin, async (req: any, res: any) => {
    try {







    const user = req.user;





      const { id } = req.params;
      const { status, role, name, email, phone, address, wallet_balance, xp } = req.body;

      const { error: updateError } = await supabase
        .from('users')
        .update({ status, role, name, email, phone, address, wallet_balance, xp })
        .eq('id', id);

      if (updateError) throw updateError;

      res.json({ success: true });
    } catch (error) {
      console.error('Error in PATCH /api/admin/users/:id:', error);
      res.status(500).json({ error: 'Error al actualizar usuario' });
    }
  });


  // Delete User (Bypasses RLS - Admin Only)
  router.delete('/users/:id', authenticate, authorizeAdmin, async (req: any, res: any) => {
    try {







    const user = req.user;





      const { id } = req.params;

      // Prevent admin from deleting themselves
      if (id === user.id) {
        return res.status(400).json({ error: 'No puedes eliminar tu propia cuenta' });
      }

      // Check if service role key is configured
      if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
        return res.status(500).json({ 
          error: 'La clave SUPABASE_SERVICE_ROLE_KEY no está configurada. Es necesaria para eliminar usuarios completamente.' 
        });
      }

      // Delete from Supabase Auth (this will cascade to public.users and other tables)
      const { error: deleteError } = await supabase.auth.admin.deleteUser(id);

      if (deleteError) {
        console.error('Error deleting user from auth:', deleteError);
        throw deleteError;
      }

      res.json({ success: true });
    } catch (error: any) {
      console.error('Error in DELETE /api/admin/users/:id:', error);
      res.status(500).json({ error: error.message || 'Error al eliminar usuario' });
    }
  });


  // Admin Tasks Management (Bypasses RLS)
  router.post('/tasks', authenticate, authorizeAdmin, async (req: any, res: any) => {
    try {






    const user = req.user;




      const { day, name, xp, type, title, description, conditions, xp_reward, is_active } = req.body;

      // Check if limit of 10 tasks per day is reached
      if (type === 'daily') {
        const { data: existingTasks, error: countError } = await supabase
          .from('tasks')
          .select('id')
          .eq('day', day)
          .eq('type', 'daily');
        
        if (countError) throw countError;
        if (existingTasks && existingTasks.length >= 10) {
          return res.status(400).json({ error: 'No se pueden crear más de 10 tareas para el mismo día.' });
        }
      }

      const { data, error } = await supabase.from('tasks').insert([{ 
        day, 
        name, 
        xp, 
        type: type || 'daily',
        title: title || name,
        description,
        conditions: conditions || {},
        xp_reward: xp_reward || xp,
        is_active: is_active !== false
      }]).select();
      if (error) {
        console.error('Supabase error creating task:', JSON.stringify(error, null, 2));
        throw error;
      }
      res.json({ success: true, data });
    } catch (error) {
      console.error('Error creating task:', error);
      res.status(500).json({ error: 'Error al crear la tarea' });
    }
  });


  router.post('/tasks/seed', authenticate, authorizeAdmin, async (req: any, res: any) => {
    try {






    const user = req.user;




      const initialTasks = [
        { day: '1', name: 'Configura tu Perfil Financiero', xp: 100, type: 'daily', description: 'Completa todos tus datos en la sección de perfil para empezar con pie derecho.', is_active: true },
        { day: '2', name: 'Invita a tu primer Socio', xp: 200, type: 'daily', description: 'Usa tu código de referido para invitar a alguien a la plataforma.', is_active: true },
        { day: '3', name: 'Mira el Video de Bienvenida', xp: 150, type: 'daily', description: 'Aprende los conceptos básicos de nuestra red financiera en el video introductorio.', is_active: true },
        { day: '4', name: 'Únete al Canal de Estrategias', xp: 100, type: 'daily', description: 'Mantente al día con las últimas estrategias uniéndote a nuestro canal oficial.', is_active: true },
        { day: '5', name: 'Comparte tu Link en Redes', xp: 150, type: 'daily', description: 'Aumenta tu alcance compartiendo tu link de invitación en tus redes sociales.', is_active: true },
        { day: '6', name: 'Completa el Módulo 1 de Entrenamiento', xp: 250, type: 'daily', description: 'Finaliza la primera lección de nuestro curso de crecimiento financiero.', is_active: true },
        { day: '7', name: 'Alcanza 3 Referidos Activos', xp: 500, type: 'daily', description: 'Consigue que 3 de tus invitados activen su primer plan.', is_active: true },
        { day: '1', name: 'Invita a 5 personas esta semana', xp: 1000, type: 'weekly', description: 'Demuestra tu liderazgo invitando a 5 nuevos socios esta semana.', is_active: true },
        { day: '1', name: 'Completa todas las tareas diarias', xp: 1500, type: 'weekly', description: 'Mantén la disciplina y completa las 7 tareas diarias de la semana.', is_active: true }
      ];

      // Insert tasks
      const { error } = await supabase.from('tasks').insert(initialTasks);
      if (error) throw error;

      res.json({ success: true, message: 'Tareas iniciales sembradas correctamente' });
    } catch (error) {
      console.error('Error seeding tasks:', error);
      res.status(500).json({ error: 'Error al sembrar tareas' });
    }
  });


  router.put('/tasks/:id', authenticate, authorizeAdmin, async (req: any, res: any) => {
    try {






    const user = req.user;




      const { id } = req.params;
      const { day, name, xp, type, title, description, conditions, xp_reward, is_active } = req.body;
      const { data, error } = await supabase.from('tasks').update({ 
        day, 
        name, 
        xp, 
        type,
        title,
        description,
        conditions,
        xp_reward,
        is_active
      }).eq('id', id).select();
      if (error) throw error;
      res.json({ success: true, data });
    } catch (error) {
      console.error('Error updating task:', error);
      res.status(500).json({ error: 'Error al actualizar la tarea' });
    }
  });


  router.delete('/tasks/:id', authenticate, authorizeAdmin, async (req: any, res: any) => {
    try {






    const user = req.user;




      const { id } = req.params;
      
      // Delete related user_tasks first to avoid foreign key constraint errors
      await supabase.from('user_tasks').delete().eq('task_id', id);
      
      const { error } = await supabase.from('tasks').delete().eq('id', id);
      if (error) throw error;
      res.json({ success: true });
    } catch (error) {
      console.error('Error deleting task:', error);
      res.status(500).json({ error: 'Error al eliminar la tarea' });
    }
  });


  router.delete('/tasks', authenticate, authorizeAdmin, async (req: any, res: any) => {
    try {






    const user = req.user;




      // Delete all user_tasks first to avoid foreign key constraint errors
      await supabase.from('user_tasks').delete().neq('task_id', '00000000-0000-0000-0000-000000000000');
      
      const { error } = await supabase.from('tasks').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      if (error) throw error;
      res.json({ success: true });
    } catch (error) {
      console.error('Error deleting all tasks:', error);
      res.status(500).json({ error: 'Error al eliminar todas las tareas', details: error });
    }
  });


  router.post('/tasks/end-week', authenticate, authorizeAdmin, async (req: any, res: any) => {
    try {






    const user = req.user;




      const { penaltyXp = 50 } = req.body;

      // Fetch all users, tasks, and user_tasks
      const { data: users } = await supabase.from('users').select('id, xp, compliance_score');
      const { data: tasks } = await supabase.from('tasks').select('id, name, xp');
      const { data: userTasks } = await supabase.from('user_tasks').select('user_id, task_id');

      if (!users || !tasks) throw new Error('Failed to fetch data');

      const userTasksMap = new Map<string, Set<string>>();
      
      if (userTasks) {
        userTasks.forEach(ut => {
          if (!userTasksMap.has(ut.user_id)) {
            userTasksMap.set(ut.user_id, new Set());
          }
          userTasksMap.get(ut.user_id)!.add(ut.task_id);
        });
      }

      // Calculate penalties and create penalty tasks
      for (const u of users) {
        const userCompletedTaskIds = userTasksMap.get(u.id) || new Set();
        const missedTasks = tasks.filter(t => !userCompletedTaskIds.has(t.id));
        
        if (missedTasks.length > 0) {
          const totalPenaltyXp = missedTasks.length * penaltyXp;
          const newXp = Math.max(0, (u.xp || 0) - totalPenaltyXp);
          const newCompliance = Math.max(0, (u.compliance_score || 100) - (missedTasks.length * 5));
          
          await supabase.from('users').update({ 
            xp: newXp,
            compliance_score: newCompliance
          }).eq('id', u.id);

          // Create penalty tasks
          const penaltyTasksToInsert = missedTasks.map(t => ({
            user_id: u.id,
            name: `Castigo por: ${t.name}`,
            xp: Math.floor(t.xp * 0.5),
            is_completed: false,
            original_task_id: t.id
          }));

          await supabase.from('penalty_tasks').insert(penaltyTasksToInsert);

          // Notify user
          await sendNotification({
            userId: u.id,
            title: 'Semana Finalizada - Sanciones Aplicadas',
            message: `La semana ha terminado. No completaste ${missedTasks.length} tareas. Se han aplicado sanciones de XP y cumplimiento, y se han generado tareas de castigo.`,
            type: 'warning'
          });
        } else {
          // All tasks completed!
          const newCompliance = Math.min(100, (u.compliance_score || 100) + 5);
          await supabase.from('users').update({
            compliance_score: newCompliance
          }).eq('id', u.id);

          await sendNotification({
            userId: u.id,
            title: '¡Semana Perfecta!',
            message: 'Has completado todas tus tareas de la semana. Tu cumplimiento ha mejorado.',
            type: 'success'
          });
        }
      }

      // Clear user_tasks
      await supabase.from('user_tasks').delete().neq('task_id', '00000000-0000-0000-0000-000000000000');

      // Update weekly_schedule setting
      const nextWeekStart = new Date();
      const nextWeekEnd = new Date();
      nextWeekEnd.setDate(nextWeekEnd.getDate() + 7);
      
      const { data: existingSchedule } = await supabase.from('settings').select('id').eq('key', 'weekly_schedule').single();
      
      const scheduleData = {
        start_date: nextWeekStart.toISOString(),
        end_date: nextWeekEnd.toISOString(),
        penalty_xp: penaltyXp
      };

      if (existingSchedule) {
        await supabase.from('settings').update({ value: scheduleData }).eq('key', 'weekly_schedule');
      } else {
        await supabase.from('settings').insert({ key: 'weekly_schedule', value: scheduleData });
      }

      res.json({ success: true, message: 'Semana finalizada y sanciones aplicadas' });
    } catch (error) {
      console.error('Error ending week:', error);
      res.status(500).json({ error: 'Error al finalizar la semana', details: error });
    }
  });


  router.post('/users/:id/penalty-tasks', authenticate, authorizeAdmin, async (req: any, res: any) => {
    try {
      const targetUserId = req.params.id;
      const { name, xp } = req.body;

      if (!name || !xp) return res.status(400).json({ error: 'Name and XP are required' });

      const { data: newTask, error } = await supabase.from('penalty_tasks').insert({
        user_id: targetUserId,
        name,
        xp,
        is_completed: false
      }).select().single();

      if (error) throw error;

      // Notify user
      await supabase.from('notifications').insert({
        user_id: targetUserId,
        title: 'Nueva Tarea de Castigo',
        message: `Se te ha asignado una tarea de castigo: ${name}. Complétala para recuperar XP.`,
        type: 'alert'
      });

      res.json({ success: true, task: newTask });
    } catch (error) {
      console.error('Error adding penalty task:', error);
      res.status(500).json({ error: 'Error al agregar tarea de castigo', details: error });
    }
  });
  return router;
}
