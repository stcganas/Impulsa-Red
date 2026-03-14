import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI } from '@google/genai';
import { createClient } from '@supabase/supabase-js';
import path from 'path';

dotenv.config();

console.log("--- SERVIDOR INICIANDO ---");

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

let supabase: any = null;
if (supabaseUrl && supabaseServiceKey) {
  try {
    supabase = createClient(supabaseUrl, supabaseServiceKey);
    console.log("Supabase inicializado correctamente");
    
    // Ensure storage buckets exist
    const buckets = ['app-assets', 'avatars', 'receipts'];
    buckets.forEach(bucketName => {
      supabase.storage.getBucket(bucketName).then(({ data, error }: any) => {
        if (error && error.message.includes('not found')) {
          console.log(`Creating bucket ${bucketName}...`);
          supabase.storage.createBucket(bucketName, { public: true }).then(({ error: createError }: any) => {
            if (createError) console.error(`Error creating bucket ${bucketName}:`, createError);
            else console.log(`Bucket ${bucketName} created successfully`);
          });
        }
      });
    });

    // Add receipt_url column if not exists
    supabase.rpc('exec_sql', { sql: 'ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS receipt_url text;' })
      .then(({ error }: any) => {
        if (error) {
          // If RPC fails, it might be because exec_sql doesn't exist. 
          // We'll just log it. In a real app, we'd use migrations.
          console.warn("Could not add receipt_url column via RPC. Ensure it exists in the database.");
        }
      });
  } catch (err) {
    console.error("Error al inicializar Supabase:", err);
  }
} else {
  console.warn("ADVERTENCIA: Faltan llaves de Supabase. Algunas funciones no estarán disponibles.");
}

async function startServer() {
  try {
    const app = express();
    const PORT = 3000;

    app.use(cors());
    app.use(express.json());

  // --- API ROUTES ---

  // Health check
  app.get('/api/health', (req, res) => {
    res.json({ 
      status: 'ok',
      supabase: {
        url_configured: !!process.env.VITE_SUPABASE_URL,
        anon_key_configured: !!process.env.VITE_SUPABASE_ANON_KEY,
        service_key_configured: !!process.env.SUPABASE_SERVICE_ROLE_KEY
      }
    });
  });

  // Process Referral
  app.post('/api/referrals/process', async (req, res) => {
    try {
      const authHeader = req.headers.authorization;
      if (!authHeader) return res.status(401).json({ error: 'No token provided' });
      
      const token = authHeader.split(' ')[1];
      const { data: { user }, error: authError } = await supabase.auth.getUser(token);
      
      if (authError || !user) {
        return res.status(401).json({ error: 'Invalid token' });
      }

      const { referrerCode } = req.body;
      if (!referrerCode) return res.json({ success: true, message: 'No referral code provided' });

      // Find referrer
      const { data: referrer, error: referrerError } = await supabase
        .from('users')
        .select('id')
        .eq('referral_code', referrerCode)
        .single();

      if (referrerError || !referrer) {
        return res.status(400).json({ error: 'Código de referido inválido' });
      }

      // Check if user already has a referrer
      const { data: existingReferral } = await supabase
        .from('referrals')
        .select('id')
        .eq('referred_id', user.id)
        .single();

      if (existingReferral) {
        return res.status(400).json({ error: 'El usuario ya tiene un referido' });
      }

      // Insert referral
      const { error: insertError } = await supabase
        .from('referrals')
        .insert({
          referrer_id: referrer.id,
          referred_id: user.id
        });

      if (insertError) {
        console.error("Error inserting referral:", insertError);
        return res.status(500).json({ error: 'Error al procesar el referido' });
      }

      // Notify Referrer
      const { data: newUser } = await supabase.from('users').select('name').eq('id', user.id).single();
      await supabase.from('notifications').insert({
        user_id: referrer.id,
        title: '¡Nuevo Referido!',
        message: `${newUser?.name || 'Un nuevo usuario'} se ha unido usando tu código.`,
        type: 'info'
      });

      res.json({ success: true });
    } catch (error) {
      console.error('Error processing referral:', error);
      res.status(500).json({ error: 'Error interno del servidor' });
    }
  });

  // Purchase Plan (Creates a pending transaction)
  app.post('/api/plans/purchase', async (req, res) => {
    try {
      const authHeader = req.headers.authorization;
      if (!authHeader) return res.status(401).json({ error: 'No token provided' });
      
      const token = authHeader.split(' ')[1];
      const { data: { user: authUser }, error: authError } = await supabase.auth.getUser(token);
      
      if (authError || !authUser) {
        return res.status(401).json({ error: 'Invalid token' });
      }

      const { planId, receiptUrl } = req.body;
      
      const plans = {
        'basic': { name: 'Básico', price: 15000, percentage: 5 },
        'advanced': { name: 'Avanzado', price: 30000, percentage: 10 },
        'pro': { name: 'Pro', price: 60000, percentage: 20 },
        'elite': { name: 'Élite', price: 120000, percentage: 30 }
      };

      const selectedPlan = plans[planId as keyof typeof plans];
      if (!selectedPlan) {
        return res.status(400).json({ error: 'Plan inválido' });
      }

      // Create a pending transaction
      const { data: transaction, error: txError } = await supabase
        .from('transactions')
        .insert({
          user_id: authUser.id,
          amount: selectedPlan.price,
          type: 'plan_purchase',
          status: 'pending',
          receipt_url: receiptUrl
        })
        .select()
        .single();

      if (txError) throw txError;

      res.json({ success: true, transaction });
    } catch (error: any) {
      console.error('Error in /api/plans/purchase:', error);
      res.status(500).json({ error: error.message || 'Error al procesar la compra' });
    }
  });

  // Approve Transaction (Admin only)
  app.post('/api/admin/transactions/approve', async (req, res) => {
    try {
      const authHeader = req.headers.authorization;
      if (!authHeader) return res.status(401).json({ error: 'No token provided' });
      
      const token = authHeader.split(' ')[1];
      const { data: { user: adminUser }, error: authError } = await supabase.auth.getUser(token);
      
      if (authError || !adminUser) return res.status(401).json({ error: 'Invalid token' });

      // Check if admin
      const { data: adminProfile } = await supabase.from('users').select('role').eq('id', adminUser.id).single();
      if (adminProfile?.role !== 'admin') return res.status(403).json({ error: 'Unauthorized' });

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
        // 1. Identify plan from amount
        const amount = Math.abs(tx.amount);
        let planName = 'Básico';
        let percentage = 5;
        
        if (amount >= 120000) { planName = 'Élite'; percentage = 30; }
        else if (amount >= 60000) { planName = 'Pro'; percentage = 20; }
        else if (amount >= 30000) { planName = 'Avanzado'; percentage = 10; }

        // 2. Update user plan
        const { error: userUpdateError } = await supabase
          .from('users')
          .update({ 
            plan: planName,
            percentage: percentage
          })
          .eq('id', tx.user_id);

        if (userUpdateError) throw userUpdateError;

        // 3. Process referral commission
        const { data: referral } = await supabase
          .from('referrals')
          .select('referrer_id')
          .eq('referred_id', tx.user_id)
          .single();

        if (referral) {
          // Get referrer's current percentage
          const { data: referrer } = await supabase
            .from('users')
            .select('percentage, name')
            .eq('id', referral.referrer_id)
            .single();

          if (referrer) {
            const commissionAmount = amount * (referrer.percentage / 100);
            
            await supabase.from('transactions').insert({
              user_id: referral.referrer_id,
              referred_id: tx.user_id,
              amount: commissionAmount,
              commission: referrer.percentage,
              type: 'referral_commission',
              status: 'completed'
            });

            // Notify Referrer
            await supabase.from('notifications').insert({
              user_id: referral.referrer_id,
              title: '¡Comisión Recibida!',
              message: `Has recibido $${commissionAmount.toLocaleString('es-CO')} por la compra de plan de un referido.`,
              type: 'success'
            });
          }
        }

        // Notify User that plan is approved
        await supabase.from('notifications').insert({
          user_id: tx.user_id,
          title: 'Plan Activado',
          message: `Tu plan ${planName} ha sido activado con éxito. ¡Disfruta de tus beneficios!`,
          type: 'success'
        });
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
  app.post('/api/admin/transactions/update-status', async (req, res) => {
    try {
      const authHeader = req.headers.authorization;
      if (!authHeader) return res.status(401).json({ error: 'No token provided' });
      
      const token = authHeader.split(' ')[1];
      const { data: { user: adminUser }, error: authError } = await supabase.auth.getUser(token);
      
      if (authError || !adminUser) return res.status(401).json({ error: 'Invalid token' });

      // Check if user is admin
      const { data: adminProfile } = await supabase.from('users').select('role').eq('id', adminUser.id).single();
      if (adminProfile?.role !== 'admin') return res.status(403).json({ error: 'Forbidden' });

      const { transactionId, status } = req.body;

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

      // Send notification to user
      let title = "";
      let message = "";
      if (tx.type === 'withdrawal') {
        if (status === 'completed') {
          title = "Retiro Aprobado";
          message = `Tu solicitud de retiro por $${Number(tx.amount).toLocaleString('es-CO')} ha sido aprobada.`;
        } else if (status === 'rejected') {
          title = "Retiro Rechazado";
          message = `Tu solicitud de retiro por $${Number(tx.amount).toLocaleString('es-CO')} ha sido rechazada.`;
          
          // Revert balance if rejected
          const { data: userProfile } = await supabase.from('users').select('wallet_balance').eq('id', tx.user_id).single();
          if (userProfile) {
            await supabase.from('users').update({ 
              wallet_balance: (userProfile.wallet_balance || 0) + Math.abs(tx.amount) 
            }).eq('id', tx.user_id);
          }
        }
      }

      if (title && message) {
        await supabase.from('notifications').insert({
          user_id: tx.user_id,
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

  // Mentor Chat
  app.post('/api/mentor/chat', async (req, res) => {
    try {
      const { message, context } = req.body;
      if (!process.env.GEMINI_API_KEY) {
        return res.status(500).json({ error: 'GEMINI_API_KEY not configured' });
      }

      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      const systemInstruction = `Eres el Mentor Financiero IA de ImpulsaRed. Tu objetivo es ayudar a los usuarios a crecer su red de referidos, motivarlos a completar sus tareas diarias, darles estrategias de ventas y explicarles cómo subir de nivel para alcanzar el 70% de comisión. 
      
      Contexto del usuario actual:
      - Nombre: ${context?.name || 'Usuario'}
      - Nivel: ${context?.level || 1}
      - Plan: ${context?.plan || 'Gratis'}
      - Saldo: $${(context?.balance || 0).toLocaleString('es-CO')}
      - Referidos Directos: ${context?.referralsCount || 0}
      
      Sé entusiasta, profesional y motivador. Usa un tono de líder de equipo. Menciona datos de su progreso si es relevante para motivarlo.`;

      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: message,
        config: {
          systemInstruction,
        }
      });

      res.json({ reply: response.text });
    } catch (error) {
      console.error('Gemini Error:', error);
      res.status(500).json({ error: 'Error comunicando con el Mentor IA' });
    }
  });

  // Update Password
  app.post('/api/user/change-password', async (req, res) => {
    try {
      const authHeader = req.headers.authorization;
      if (!authHeader) return res.status(401).json({ error: 'No token provided' });
      
      const token = authHeader.split(' ')[1];
      const { data: { user }, error: authError } = await supabase.auth.getUser(token);
      
      if (authError || !user) return res.status(401).json({ error: 'Invalid token' });

      const { newPassword } = req.body;
      if (!newPassword || newPassword.length < 6) {
        return res.status(400).json({ error: 'La contraseña debe tener al menos 6 caracteres' });
      }

      const { error: updateError } = await supabase.auth.admin.updateUserById(user.id, {
        password: newPassword
      });

      if (updateError) throw updateError;

      res.json({ success: true });
    } catch (error: any) {
      console.error('Error in /api/user/change-password:', error);
      res.status(500).json({ error: error.message || 'Error al cambiar contraseña' });
    }
  });

  // Get Global Settings
  app.get('/api/settings', async (req, res) => {
    try {
      const { data, error } = await supabase.from('settings').select('*');
      if (error) throw error;
      
      const settings: Record<string, any> = {};
      data.forEach(s => {
        settings[s.key] = s.value;
      });
      
      res.json(settings);
    } catch (error) {
      console.error('Error in GET /api/settings:', error);
      res.status(500).json({ error: 'Error al obtener configuraciones' });
    }
  });

  // Update Global Setting (Admin Only)
  app.post('/api/admin/settings', async (req, res) => {
    try {
      const authHeader = req.headers.authorization;
      if (!authHeader) return res.status(401).json({ error: 'No token provided' });
      
      const token = authHeader.split(' ')[1];
      const { data: { user }, error: authError } = await supabase.auth.getUser(token);
      
      if (authError || !user) return res.status(401).json({ error: 'Invalid token' });

      // Check if user is admin
      const { data: profile } = await supabase.from('users').select('role').eq('id', user.id).single();
      if (profile?.role !== 'admin') return res.status(403).json({ error: 'Forbidden' });

      const { key, value } = req.body;

      const { error: upsertError } = await supabase
        .from('settings')
        .upsert({ key, value }, { onConflict: 'key' });

      if (upsertError) throw upsertError;

      res.json({ success: true });
    } catch (error) {
      console.error('Error in POST /api/admin/settings:', error);
      res.status(500).json({ error: 'Error al actualizar configuración' });
    }
  });

  // Get User Profile (Bypasses RLS recursion issues)
  app.get('/api/user/profile', async (req, res) => {
    try {
      const authHeader = req.headers.authorization;
      if (!authHeader) return res.status(401).json({ error: 'No token provided' });
      
      const token = authHeader.split(' ')[1];
      const { data: { user }, error: authError } = await supabase.auth.getUser(token);
      
      if (authError || !user) {
        return res.status(401).json({ error: 'Invalid token' });
      }

      // Fetch profile using service role key (which bypasses RLS)
      console.log("Fetching profile for user ID:", user.id);
      const { data: profile, error: profileError } = await supabase
        .from('users')
        .select('*')
        .eq('id', user.id)
        .single();

      if (profileError) {
        if (profileError.code === 'PGRST116') {
          console.warn("Profile not found for user ID:", user.id, ". Creating default profile.");
          // Create default profile
          const { data: newProfile, error: insertError } = await supabase
            .from('users')
            .insert({
              id: user.id,
              name: user.user_metadata?.full_name || user.email?.split('@')[0] || 'Usuario',
              email: user.email,
              role: 'user',
              plan: 'free',
              level: 1,
              xp: 0,
              percentage: 0,
            })
            .select()
            .single();
            
          if (insertError) {
            console.error("Error creating default profile:", JSON.stringify(insertError, null, 2));
            return res.status(500).json({ error: 'Error al crear perfil por defecto', details: insertError });
          }
          return res.json(newProfile);
        }
        console.error("Error fetching profile on server for user", user.id, ":", JSON.stringify(profileError, null, 2));
        return res.status(500).json({ error: 'Error al obtener el perfil', details: profileError });
      }

      res.json(profile);
    } catch (error) {
      console.error('Error in /api/user/profile:', error);
      res.status(500).json({ error: 'Error interno del servidor' });
    }
  });

  // Get All Users (Bypasses RLS - Admin Only)
  app.get('/api/admin/users', async (req, res) => {
    try {
      const authHeader = req.headers.authorization;
      if (!authHeader) return res.status(401).json({ error: 'No token provided' });
      
      const token = authHeader.split(' ')[1];
      const { data: { user }, error: authError } = await supabase.auth.getUser(token);
      
      if (authError || !user) {
        return res.status(401).json({ error: 'Invalid token' });
      }

      // Check if user is admin
      const { data: profile, error: profileError } = await supabase
        .from('users')
        .select('role')
        .eq('id', user.id)
        .single();

      if (profileError || profile?.role !== 'admin') {
        return res.status(403).json({ error: 'Forbidden' });
      }

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
  app.patch('/api/admin/users/:id', async (req, res) => {
    try {
      const authHeader = req.headers.authorization;
      if (!authHeader) return res.status(401).json({ error: 'No token provided' });
      
      const token = authHeader.split(' ')[1];
      const { data: { user }, error: authError } = await supabase.auth.getUser(token);
      
      if (authError || !user) return res.status(401).json({ error: 'Invalid token' });

      // Check if user is admin
      const { data: profile } = await supabase.from('users').select('role').eq('id', user.id).single();
      if (profile?.role !== 'admin') return res.status(403).json({ error: 'Forbidden' });

      const { id } = req.params;
      const { status, role, name, email, phone, address } = req.body;

      const { error: updateError } = await supabase
        .from('users')
        .update({ status, role, name, email, phone, address })
        .eq('id', id);

      if (updateError) throw updateError;

      res.json({ success: true });
    } catch (error) {
      console.error('Error in PATCH /api/admin/users/:id:', error);
      res.status(500).json({ error: 'Error al actualizar usuario' });
    }
  });

  // Delete User (Bypasses RLS - Admin Only)
  app.delete('/api/admin/users/:id', async (req, res) => {
    try {
      const authHeader = req.headers.authorization;
      if (!authHeader) return res.status(401).json({ error: 'No token provided' });
      
      const token = authHeader.split(' ')[1];
      const { data: { user }, error: authError } = await supabase.auth.getUser(token);
      
      if (authError || !user) return res.status(401).json({ error: 'Invalid token' });

      // Check if user is admin
      const { data: profile } = await supabase.from('users').select('role').eq('id', user.id).single();
      if (profile?.role !== 'admin') return res.status(403).json({ error: 'Forbidden' });

      const { id } = req.params;

      const { error: deleteError } = await supabase
        .from('users')
        .delete()
        .eq('id', id);

      if (deleteError) throw deleteError;

      res.json({ success: true });
    } catch (error) {
      console.error('Error in DELETE /api/admin/users/:id:', error);
      res.status(500).json({ error: 'Error al eliminar usuario' });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

    app.listen(PORT, '0.0.0.0', () => {
      console.log(`Server running on http://localhost:${PORT}`);
    });
  } catch (error: any) {
    console.error('Critical server error:', error);
  }
}

startServer();
