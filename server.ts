import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI } from '@google/genai';
import { createClient } from '@supabase/supabase-js';
import path from 'path';

function calculatePercentage(level: number, plan: string): number {
  if (level >= 100) return 70.00;
  
  let baseCommission = 5;
  const planLower = plan?.toLowerCase() || 'básico';
  
  if (planLower.includes('avanzado')) baseCommission = 10;
  else if (planLower.includes('pro')) baseCommission = 20;
  else if (planLower.includes('elite') || planLower.includes('élite')) baseCommission = 30;
  
  const increment = (70 - baseCommission) / 99;
  const percentage = baseCommission + (level - 1) * increment;
  
  return Number(percentage.toFixed(2));
}

dotenv.config();

console.log("--- SERVIDOR INICIANDO ---");

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || '';

console.log("Supabase URL configured:", !!supabaseUrl);
console.log("Supabase Service Key configured:", !!supabaseServiceKey);

let supabase: any = null;
if (supabaseUrl && supabaseServiceKey) {
  try {
    supabase = createClient(supabaseUrl, supabaseServiceKey);
    console.log("Supabase inicializado correctamente");
    
    // Ensure storage buckets exist
    const buckets = ['app-assets', 'avatars', 'receipts'];
    buckets.forEach(bucketName => {
      supabase.storage.getBucket(bucketName)
        .then(({ data, error }: any) => {
          if (error && error.message.includes('not found')) {
            console.log(`Creating bucket ${bucketName}...`);
            return supabase.storage.createBucket(bucketName, { public: true });
          }
          return { data, error };
        })
        .then(({ error: createError }: any) => {
          if (createError) console.error(`Error with bucket ${bucketName}:`, createError);
          else console.log(`Bucket ${bucketName} checked/created successfully`);
        })
        .catch((err: any) => {
          console.error(`Unhandled error in bucket ${bucketName} check:`, err);
        });
    });

    // Add receipt_url column if not exists
    supabase.rpc('exec_sql', { sql: 'ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS receipt_url text;' })
      .then(({ error }: any) => {
        if (error) console.warn("Could not add receipt_url column via RPC.");
        else console.log("receipt_url column check completed");
      })
      .catch((err: any) => {
        console.error("Unhandled error in exec_sql RPC:", err);
      });

    // Add task-related and invitation columns to users table
    const addTaskColumnsSql = `
      ALTER TABLE public.users ADD COLUMN IF NOT EXISTS is_tasks_active boolean DEFAULT false;
      ALTER TABLE public.users ADD COLUMN IF NOT EXISTS task_start_date timestamp with time zone;
      ALTER TABLE public.users ADD COLUMN IF NOT EXISTS task_end_date timestamp with time zone;
      ALTER TABLE public.users ADD COLUMN IF NOT EXISTS wallet_balance numeric DEFAULT 0;
      ALTER TABLE public.users ADD COLUMN IF NOT EXISTS inventory_status text DEFAULT 'Inactivo';
      ALTER TABLE public.users ADD COLUMN IF NOT EXISTS compliance_score integer DEFAULT 100;
      ALTER TABLE public.users ADD COLUMN IF NOT EXISTS username text;
      ALTER TABLE public.users ADD COLUMN IF NOT EXISTS photo_url text;
      ALTER TABLE public.users ADD COLUMN IF NOT EXISTS invite_title text;
      ALTER TABLE public.users ADD COLUMN IF NOT EXISTS invite_message text;
      ALTER TABLE public.users ADD COLUMN IF NOT EXISTS invite_banner text;
      ALTER TABLE public.users ADD COLUMN IF NOT EXISTS invite_whatsapp_message text;
      ALTER TABLE public.users ADD COLUMN IF NOT EXISTS last_reset_at timestamp with time zone;
      
      CREATE TABLE IF NOT EXISTS public.events (
        id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
        user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
        event_type text NOT NULL,
        value numeric DEFAULT 1,
        metadata jsonb DEFAULT '{}'::jsonb,
        created_at timestamp with time zone DEFAULT now()
      );

      CREATE TABLE IF NOT EXISTS public.tasks (
        id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
        name text,
        day text DEFAULT '1',
        xp integer DEFAULT 0,
        type text DEFAULT 'daily',
        created_at timestamp with time zone DEFAULT now()
      );

      ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS title text;
      ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS description text;
      ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS conditions jsonb DEFAULT '{}'::jsonb;
      ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS xp_reward integer DEFAULT 0;
      ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS is_active boolean DEFAULT true;

      -- Migrate existing tasks data if needed
      UPDATE public.tasks SET title = name WHERE title IS NULL AND name IS NOT NULL;
      UPDATE public.tasks SET xp_reward = xp WHERE xp_reward = 0 AND xp IS NOT NULL;

      CREATE TABLE IF NOT EXISTS public.user_tasks (
        id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
        user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
        task_id uuid REFERENCES public.tasks(id) ON DELETE CASCADE,
        progress numeric DEFAULT 0,
        required numeric DEFAULT 1,
        completed boolean DEFAULT false,
        ready_to_claim boolean DEFAULT false,
        completed_at timestamp with time zone,
        UNIQUE(user_id, task_id)
      );

      ALTER TABLE public.user_tasks ADD COLUMN IF NOT EXISTS progress numeric DEFAULT 0;
      ALTER TABLE public.user_tasks ADD COLUMN IF NOT EXISTS required numeric DEFAULT 1;
      ALTER TABLE public.user_tasks ADD COLUMN IF NOT EXISTS completed boolean DEFAULT false;
      ALTER TABLE public.user_tasks ADD COLUMN IF NOT EXISTS ready_to_claim boolean DEFAULT false;
      ALTER TABLE public.user_tasks ADD COLUMN IF NOT EXISTS completed_at timestamp with time zone;
      
      -- Feature System Tables
      CREATE TABLE IF NOT EXISTS public.plans (
        id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
        name text NOT NULL,
        price numeric NOT NULL DEFAULT 0,
        level integer NOT NULL DEFAULT 1,
        description text,
        created_at timestamptz DEFAULT now()
      );

      CREATE TABLE IF NOT EXISTS public.features (
        id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
        key text NOT NULL UNIQUE,
        name text NOT NULL,
        description text,
        default_value jsonb NOT NULL,
        created_at timestamptz DEFAULT now()
      );

      CREATE TABLE IF NOT EXISTS public.plan_features (
        id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
        plan_id uuid REFERENCES public.plans(id) ON DELETE CASCADE,
        feature_id uuid REFERENCES public.features(id) ON DELETE CASCADE,
        value jsonb NOT NULL,
        UNIQUE(plan_id, feature_id)
      );

      ALTER TABLE public.users ADD COLUMN IF NOT EXISTS plan_id uuid REFERENCES public.plans(id);
      
      -- Seed Default Plans
      INSERT INTO public.plans (id, name, price, level, description)
      VALUES 
        ('00000000-0000-0000-0000-000000000000', 'Básico', 15000, 1, 'Plan ideal para empezar a construir tu red.'),
        ('11111111-1111-1111-1111-111111111111', 'Avanzado', 30000, 2, 'Para usuarios que buscan mayor rentabilidad y herramientas.'),
        ('22222222-2222-2222-2222-222222222222', 'Pro', 60000, 3, 'El equilibrio perfecto entre inversión y beneficios exponenciales.'),
        ('33333333-3333-3333-3333-333333333333', 'Élite', 120000, 4, 'Máxima rentabilidad, soporte VIP y acceso total a la plataforma.')
      ON CONFLICT (id) DO UPDATE SET 
        name = EXCLUDED.name, 
        price = EXCLUDED.price, 
        description = EXCLUDED.description;

      -- Assign default plan to users without one
      UPDATE public.users SET plan_id = '00000000-0000-0000-0000-000000000000' WHERE plan_id IS NULL;

      -- Seed Default Features
      INSERT INTO public.features (key, name, description, default_value)
      VALUES 
        ('commission_level_1', 'Comisión Nivel 1', 'Porcentaje de comisión por referidos directos', '0.05'),
        ('commission_increment', 'Incremento por Nivel', 'Aumento de comisión por cada nivel subido', '0.0065'),
        ('max_referrals', 'Máximo de Referidos', 'Número máximo de personas que puedes referir', '1000000'),
        ('support_type', 'Tipo de Soporte', 'Nivel de atención al cliente', '"Estándar"'),
        ('marketing_material', 'Material de Marketing', 'Acceso a recursos para promocionar', '"Básico"'),
        ('mentorship', 'Mentorías', 'Acceso a sesiones de mentoría', '"No"'),
        ('automation_tools', 'Herramientas de Automatización', 'Uso de bots y herramientas automáticas', '"No"'),
        ('vip_events', 'Eventos VIP', 'Acceso a eventos presenciales exclusivos', '"No"')
      ON CONFLICT (key) DO UPDATE SET
        name = EXCLUDED.name,
        description = EXCLUDED.description;

      -- Seed Plan Features (We need to link them, but since we don't know the feature IDs easily in raw SQL without a DO block, we can do it via a quick script or just leave the features to be configured via the admin panel. Let's use a DO block to seed plan features)
      DO $$
      DECLARE
        f_comm1 uuid; f_inc uuid; f_supp uuid; f_mkt uuid; f_ment uuid; f_auto uuid; f_vip uuid;
      BEGIN
        SELECT id INTO f_comm1 FROM public.features WHERE key = 'commission_level_1';
        SELECT id INTO f_inc FROM public.features WHERE key = 'commission_increment';
        SELECT id INTO f_supp FROM public.features WHERE key = 'support_type';
        SELECT id INTO f_mkt FROM public.features WHERE key = 'marketing_material';
        SELECT id INTO f_ment FROM public.features WHERE key = 'mentorship';
        SELECT id INTO f_auto FROM public.features WHERE key = 'automation_tools';
        SELECT id INTO f_vip FROM public.features WHERE key = 'vip_events';

        -- Básico
        INSERT INTO public.plan_features (plan_id, feature_id, value) VALUES ('00000000-0000-0000-0000-000000000000', f_comm1, '"0.05"') ON CONFLICT (plan_id, feature_id) DO UPDATE SET value = EXCLUDED.value;
        INSERT INTO public.plan_features (plan_id, feature_id, value) VALUES ('00000000-0000-0000-0000-000000000000', f_inc, '"0.0065"') ON CONFLICT (plan_id, feature_id) DO UPDATE SET value = EXCLUDED.value;
        INSERT INTO public.plan_features (plan_id, feature_id, value) VALUES ('00000000-0000-0000-0000-000000000000', f_supp, '"Estándar"') ON CONFLICT (plan_id, feature_id) DO UPDATE SET value = EXCLUDED.value;
        INSERT INTO public.plan_features (plan_id, feature_id, value) VALUES ('00000000-0000-0000-0000-000000000000', f_mkt, '"Básico"') ON CONFLICT (plan_id, feature_id) DO UPDATE SET value = EXCLUDED.value;

        -- Avanzado
        INSERT INTO public.plan_features (plan_id, feature_id, value) VALUES ('11111111-1111-1111-1111-111111111111', f_comm1, '"0.10"') ON CONFLICT (plan_id, feature_id) DO UPDATE SET value = EXCLUDED.value;
        INSERT INTO public.plan_features (plan_id, feature_id, value) VALUES ('11111111-1111-1111-1111-111111111111', f_inc, '"0.0060"') ON CONFLICT (plan_id, feature_id) DO UPDATE SET value = EXCLUDED.value;
        INSERT INTO public.plan_features (plan_id, feature_id, value) VALUES ('11111111-1111-1111-1111-111111111111', f_supp, '"Prioritario"') ON CONFLICT (plan_id, feature_id) DO UPDATE SET value = EXCLUDED.value;
        INSERT INTO public.plan_features (plan_id, feature_id, value) VALUES ('11111111-1111-1111-1111-111111111111', f_mkt, '"Avanzado"') ON CONFLICT (plan_id, feature_id) DO UPDATE SET value = EXCLUDED.value;

        -- Pro
        INSERT INTO public.plan_features (plan_id, feature_id, value) VALUES ('22222222-2222-2222-2222-222222222222', f_comm1, '"0.20"') ON CONFLICT (plan_id, feature_id) DO UPDATE SET value = EXCLUDED.value;
        INSERT INTO public.plan_features (plan_id, feature_id, value) VALUES ('22222222-2222-2222-2222-222222222222', f_inc, '"0.0050"') ON CONFLICT (plan_id, feature_id) DO UPDATE SET value = EXCLUDED.value;
        INSERT INTO public.plan_features (plan_id, feature_id, value) VALUES ('22222222-2222-2222-2222-222222222222', f_supp, '"Prioritario"') ON CONFLICT (plan_id, feature_id) DO UPDATE SET value = EXCLUDED.value;
        INSERT INTO public.plan_features (plan_id, feature_id, value) VALUES ('22222222-2222-2222-2222-222222222222', f_ment, '"Grupales"') ON CONFLICT (plan_id, feature_id) DO UPDATE SET value = EXCLUDED.value;
        INSERT INTO public.plan_features (plan_id, feature_id, value) VALUES ('22222222-2222-2222-2222-222222222222', f_auto, '"Sí"') ON CONFLICT (plan_id, feature_id) DO UPDATE SET value = EXCLUDED.value;

        -- Élite
        INSERT INTO public.plan_features (plan_id, feature_id, value) VALUES ('33333333-3333-3333-3333-333333333333', f_comm1, '"0.30"') ON CONFLICT (plan_id, feature_id) DO UPDATE SET value = EXCLUDED.value;
        INSERT INTO public.plan_features (plan_id, feature_id, value) VALUES ('33333333-3333-3333-3333-333333333333', f_inc, '"0.0040"') ON CONFLICT (plan_id, feature_id) DO UPDATE SET value = EXCLUDED.value;
        INSERT INTO public.plan_features (plan_id, feature_id, value) VALUES ('33333333-3333-3333-3333-333333333333', f_supp, '"VIP 24/7"') ON CONFLICT (plan_id, feature_id) DO UPDATE SET value = EXCLUDED.value;
        INSERT INTO public.plan_features (plan_id, feature_id, value) VALUES ('33333333-3333-3333-3333-333333333333', f_ment, '"1 a 1"') ON CONFLICT (plan_id, feature_id) DO UPDATE SET value = EXCLUDED.value;
        INSERT INTO public.plan_features (plan_id, feature_id, value) VALUES ('33333333-3333-3333-3333-333333333333', f_auto, '"Sí Avanzado"') ON CONFLICT (plan_id, feature_id) DO UPDATE SET value = EXCLUDED.value;
        INSERT INTO public.plan_features (plan_id, feature_id, value) VALUES ('33333333-3333-3333-3333-333333333333', f_vip, '"Sí"') ON CONFLICT (plan_id, feature_id) DO UPDATE SET value = EXCLUDED.value;
      END $$;
      
      ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS type text DEFAULT 'daily';
      ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS day text DEFAULT '1';

      CREATE TABLE IF NOT EXISTS public.settings (
        id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
        key text NOT NULL UNIQUE,
        value jsonb NOT NULL,
        created_at timestamptz DEFAULT now()
      );

      -- Seed Default Settings
      INSERT INTO public.settings (key, value)
      VALUES 
        ('app_name', '"ImpulsaRed"'),
        ('app_logo', 'null'),
        ('maintenance_mode', 'false'),
        ('min_withdrawal', '50'),
        ('max_withdrawal', '1000'),
        ('withdrawal_fee', '5')
      ON CONFLICT (key) DO NOTHING;

      CREATE TABLE IF NOT EXISTS public.penalty_tasks (
        id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
        user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
        name text NOT NULL,
        xp integer DEFAULT 0,
        is_completed boolean DEFAULT false,
        original_task_id uuid REFERENCES public.tasks(id) ON DELETE SET NULL,
        created_at timestamp with time zone DEFAULT now()
      );

      CREATE TABLE IF NOT EXISTS public.invite_clicks (
        id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
        referral_code text NOT NULL,
        ip text,
        device text,
        user_agent text,
        created_at timestamp with time zone DEFAULT now()
      );

      -- Settings RLS Policies
      ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;

      DROP POLICY IF EXISTS "Public read access to settings" ON public.settings;
      CREATE POLICY "Public read access to settings" ON public.settings
        FOR SELECT USING (true);

      DROP POLICY IF EXISTS "Admin write access to settings" ON public.settings;
      CREATE POLICY "Admin write access to settings" ON public.settings
        FOR ALL
        TO authenticated
        USING (
          EXISTS (
            SELECT 1 FROM public.users
            WHERE users.id = auth.uid() AND users.role = 'admin'
          )
        );

      -- Storage RLS Policies
      ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

      DROP POLICY IF EXISTS "Public Access to app-assets" ON storage.objects;
      CREATE POLICY "Public Access to app-assets" ON storage.objects
        FOR SELECT
        USING (bucket_id = 'app-assets');

      DROP POLICY IF EXISTS "Authenticated users can upload to app-assets" ON storage.objects;
      CREATE POLICY "Authenticated users can upload to app-assets" ON storage.objects
        FOR INSERT
        TO authenticated
        WITH CHECK (bucket_id = 'app-assets');

      DROP POLICY IF EXISTS "Authenticated users can update their uploads in app-assets" ON storage.objects;
      CREATE POLICY "Authenticated users can update their uploads in app-assets" ON storage.objects
        FOR UPDATE
        TO authenticated
        USING (bucket_id = 'app-assets' AND owner = auth.uid());

      DROP POLICY IF EXISTS "Authenticated users can delete their uploads in app-assets" ON storage.objects;
      CREATE POLICY "Authenticated users can delete their uploads in app-assets" ON storage.objects
        FOR DELETE
        TO authenticated
        USING (bucket_id = 'app-assets' AND owner = auth.uid());
    `;
    supabase.rpc('exec_sql', { sql: addTaskColumnsSql })
      .then(({ error }: any) => {
        if (error) console.warn("Could not add task columns via RPC.", error);
        else console.log("Database schema and storage RLS policies updated successfully.");
      })
      .catch((err: any) => {
        console.error("Unhandled error in addTaskColumnsSql RPC:", err);
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
    app.use(express.json({ limit: '10mb' }));
    app.use(express.urlencoded({ limit: '10mb', extended: true }));

    // Logger middleware
    app.use((req, res, next) => {
      console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
      next();
    });

    // Supabase check middleware
    app.use((req, res, next) => {
      if (!supabase && !req.url.startsWith('/api/health')) {
        return res.status(503).json({ error: 'Servicio no disponible: Supabase no inicializado' });
      }
      next();
    });

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

  // Test policies
  app.get('/api/test-policies', async (req, res) => {
    try {
      const sql = `
        ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;
      `;
      const { data, error } = await supabase.rpc('exec_sql', { sql });
      res.json({ success: true, data, error });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // Upload Image
  app.post('/api/upload-image', async (req, res) => {
    try {
      const authHeader = req.headers.authorization;
      if (!authHeader) return res.status(401).json({ error: 'No token provided' });
      
      const token = authHeader.split(' ')[1];
      const { data: { user }, error: authError } = await supabase.auth.getUser(token);
      
      if (authError || !user) return res.status(401).json({ error: 'Invalid token' });

      const { bucket, fileName, base64Data, contentType } = req.body;
      
      if (!bucket || !fileName || !base64Data) {
         return res.status(400).json({ error: 'Missing parameters' });
      }

      // Remove data URL prefix if present
      const base64String = base64Data.replace(/^data:image\/\w+;base64,/, '');
      const buffer = Buffer.from(base64String, 'base64');

      const { data, error } = await supabase.storage
        .from(bucket)
        .upload(fileName, buffer, {
          contentType: contentType || 'image/jpeg',
          upsert: true
        });

      if (error) throw error;

      const { data: { publicUrl } } = supabase.storage
        .from(bucket)
        .getPublicUrl(fileName);

      res.json({ success: true, publicUrl });
    } catch (err: any) {
      console.error('Upload error:', err);
      res.status(500).json({ error: err.message });
    }
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

      // Check today's referrals for viral multiplier
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const { data: todaysReferrals } = await supabase
        .from('referrals')
        .select('id')
        .eq('referrer_id', referrer.id)
        .gte('created_at', today.toISOString());

      const refsToday = todaysReferrals?.length || 1;
      let multiplier = 1;
      if (refsToday >= 10) multiplier = 3;
      else if (refsToday >= 5) multiplier = 2;
      else if (refsToday >= 3) multiplier = 1.5;

      // Add XP to direct referrer (+100 XP * multiplier)
      const { data: refProfile } = await supabase.from('users').select('xp, level, plan').eq('id', referrer.id).single();
      if (refProfile) {
        const xpGained = Math.floor(100 * multiplier);
        const newXp = (refProfile.xp || 0) + xpGained;
        let newLevel = Math.floor(newXp / 1000) + 1;
        if (newLevel > 100) newLevel = 100;
        let newPercentage = refProfile.percentage;

        if (newLevel > (refProfile.level || 1)) {
          newPercentage = calculatePercentage(newLevel, refProfile.plan || 'Básico');
        }

        await supabase.from('users').update({ xp: newXp, level: newLevel, percentage: newPercentage }).eq('id', referrer.id);
      }

      // Check for level 2 referrer (+50 XP)
      const { data: level2Referral } = await supabase
        .from('referrals')
        .select('referrer_id')
        .eq('referred_id', referrer.id)
        .single();

      if (level2Referral && level2Referral.referrer_id) {
        const { data: ref2Profile } = await supabase.from('users').select('xp, level, plan').eq('id', level2Referral.referrer_id).single();
        if (ref2Profile) {
          const xpGained2 = 50;
          const newXp2 = (ref2Profile.xp || 0) + xpGained2;
          let newLevel2 = Math.floor(newXp2 / 1000) + 1;
          if (newLevel2 > 100) newLevel2 = 100;
          let newPercentage2 = ref2Profile.percentage;

          if (newLevel2 > (ref2Profile.level || 1)) {
            newPercentage2 = calculatePercentage(newLevel2, ref2Profile.plan || 'Básico');
          }

          await supabase.from('users').update({ xp: newXp2, level: newLevel2, percentage: newPercentage2 }).eq('id', level2Referral.referrer_id);
        }
      }

      // Notify Referrer
      const { data: newUser } = await supabase.from('users').select('name').eq('id', user.id).single();
      const xpGained = Math.floor(100 * multiplier);
      await supabase.from('notifications').insert({
        user_id: referrer.id,
        title: '¡Nuevo Referido!',
        message: `${newUser?.name || 'Un nuevo usuario'} se ha unido usando tu código. ¡Has ganado ${xpGained} XP!`,
        type: 'info'
      });

      // Trigger Smart Tasks events for the referrer
      try {
        // 1. Trigger USER_REFERRED event (increments INVITE_COUNT tasks)
        await evaluateTasks(referrer.id, {
          event_type: 'USER_REFERRED',
          value: 1,
          metadata: { referred_user_id: user.id }
        });

        // 2. Trigger TEAM_UPDATED event (updates TEAM_SIZE tasks)
        // Calculate new team size for the referrer
        const { count: teamSize } = await supabase
          .from('referrals')
          .select('*', { count: 'exact', head: true })
          .eq('referrer_id', referrer.id);
          
        if (teamSize !== null) {
          await evaluateTasks(referrer.id, {
            event_type: 'TEAM_UPDATED',
            value: teamSize,
            metadata: { new_member_id: user.id }
          });
        }
      } catch (taskError) {
        console.error('Error evaluating tasks for referral:', taskError);
        // Don't fail the referral process if task evaluation fails
      }

      res.json({ success: true });
    } catch (error) {
      console.error('Error processing referral:', error);
      res.status(500).json({ error: 'Error interno del servidor' });
    }
  });

  // Track referral clicks
  app.post('/api/referrals/click', async (req, res) => {
    const { referralCode } = req.body;
    const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
    const userAgent = req.headers['user-agent'];
    
    if (!referralCode) {
      return res.status(400).json({ error: 'Falta el código de referido' });
    }

    try {
      await supabase
        .from('invite_clicks')
        .insert({
          referral_code: referralCode,
          ip: typeof ip === 'string' ? ip : (Array.isArray(ip) ? ip[0] : null),
          user_agent: userAgent,
          device: userAgent?.includes('Mobi') ? 'Mobile' : 'Desktop'
        });

      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Get referral stats for a user
  app.get('/api/referrals/summary', async (req, res) => {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ error: 'No autorizado' });

    try {
      const token = authHeader.split(' ')[1];
      const { data: { user: authUser }, error: authError } = await supabase.auth.getUser(token);
      if (authError || !authUser) return res.status(401).json({ error: 'No autorizado' });

      // Get user's referral code
      const { data: userData } = await supabase
        .from('users')
        .select('referral_code')
        .eq('id', authUser.id)
        .single();

      if (!userData?.referral_code) {
        return res.json({ clicks: 0, registrations: 0, active: 0 });
      }

      // Count clicks
      const { count: clicksCount } = await supabase
        .from('invite_clicks')
        .select('*', { count: 'exact', head: true })
        .eq('referral_code', userData.referral_code);

      // Count registrations (direct referrals)
      const { count: registrationsCount } = await supabase
        .from('referrals')
        .select('*', { count: 'exact', head: true })
        .eq('referrer_id', authUser.id);

      // Count active referrals (those who have activated tasks)
      const { count: activeCount } = await supabase
        .from('users')
        .select('*', { count: 'exact', head: true })
        .eq('referrer_id', authUser.id)
        .eq('is_tasks_active', true);

      res.json({
        clicks: clicksCount || 0,
        registrations: registrationsCount || 0,
        active: activeCount || 0
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Helper to check and perform daily reset
  async function checkDailyReset(userId: string) {
    try {
      const { data: user, error: userError } = await supabase
        .from('users')
        .select('task_start_date, last_reset_at, is_tasks_active')
        .eq('id', userId)
        .single();

      if (userError || !user || !user.is_tasks_active || !user.task_start_date) return;

      const now = new Date();
      const startDate = new Date(user.task_start_date);
      const diffTime = Math.abs(now.getTime() - startDate.getTime());
      const currentDay = Math.floor(diffTime / (1000 * 60 * 60 * 24)) + 1;

      const lastReset = user.last_reset_at ? new Date(user.last_reset_at) : null;
      
      // If we are in a new day relative to the last reset
      if (!lastReset || (now.getDate() !== lastReset.getDate() || now.getMonth() !== lastReset.getMonth() || now.getFullYear() !== lastReset.getFullYear())) {
        console.log(`Performing daily reset for user ${userId}. Current day: ${currentDay}`);
        
        // Update last_reset_at
        await supabase.from('users').update({ last_reset_at: now.toISOString() }).eq('id', userId);
        
        // Optionally: Archive old tasks or perform other reset logic
        // For now, the frontend filters tasks by date, so we just need to track the reset
      }
    } catch (err) {
      console.error("Error in checkDailyReset:", err);
    }
  }

  // --- SMART TASKS ENGINE ---
  async function evaluateTasks(userId: string, event: any) {
    try {
      // 1. Get active tasks
      const { data: activeTasks } = await supabase
        .from('tasks')
        .select('*')
        .eq('is_active', true);

      if (!activeTasks || activeTasks.length === 0) return;

      // 2. Get user's current task progress
      const { data: userTasks } = await supabase
        .from('user_tasks')
        .select('*')
        .eq('user_id', userId);

      const userTasksMap = new Map(userTasks?.map((ut: any) => [ut.task_id, ut]) || []);

      for (const task of activeTasks) {
        let userTask = userTasksMap.get(task.id) as any;
        
        // If task is already completed or ready to claim, skip
        if (userTask && (userTask.completed || userTask.ready_to_claim)) continue;

        let progressIncrement = 0;
        let required = 1;
        let applies = false;

        const conditions = task.conditions || {};

        switch (task.type) {
          case 'INVITE_COUNT':
            if (event.event_type === 'USER_REFERRED') {
              applies = true;
              progressIncrement = event.value || 1;
              required = conditions.value || 1;
            }
            break;
          case 'PROFILE_COMPLETED':
            if (event.event_type === 'PROFILE_COMPLETED') {
              applies = true;
              progressIncrement = 1;
              required = 1;
            }
            break;
          case 'COURSE_COMPLETED':
            if (event.event_type === 'COURSE_COMPLETED' && event.metadata?.course_id === conditions.course_id) {
              applies = true;
              progressIncrement = 1;
              required = 1;
            }
            break;
          case 'LOGIN_STREAK':
            if (event.event_type === 'LOGIN') {
              applies = true;
              progressIncrement = 1;
              required = conditions.value || 1;
            }
            break;
          case 'TEAM_SIZE':
            if (event.event_type === 'TEAM_UPDATED') {
              applies = true;
              // For team size, progress is absolute, not incremental
              const currentSize = event.value || 0;
              required = conditions.value || 1;
              
              if (currentSize >= required) {
                progressIncrement = required - (userTask?.progress || 0);
              } else {
                progressIncrement = currentSize - (userTask?.progress || 0);
              }
            }
            break;
          case 'PLAN_PURCHASE':
            if (event.event_type === 'PLAN_PURCHASE' && event.metadata?.plan_id === conditions.plan_id) {
              applies = true;
              progressIncrement = 1;
              required = 1;
            }
            break;
          case 'SHARE_ACTION':
            if (event.event_type === 'SHARE_COMPLETED') {
              applies = true;
              progressIncrement = 1;
              required = conditions.value || 1;
            }
            break;
          case 'FEATURE_USAGE':
            if (event.event_type === 'FEATURE_USAGE' && event.metadata?.feature_id === conditions.feature_id) {
              applies = true;
              progressIncrement = 1;
              required = conditions.value || 1;
            }
            break;
        }

        if (applies && progressIncrement > 0) {
          const currentProgress = (userTask?.progress || 0) + progressIncrement;
          const isReady = currentProgress >= required;

          if (userTask) {
            await supabase
              .from('user_tasks')
              .update({
                progress: currentProgress,
                required: required,
                ready_to_claim: isReady
              })
              .eq('id', userTask.id);
          } else {
            await supabase
              .from('user_tasks')
              .insert({
                user_id: userId,
                task_id: task.id,
                progress: currentProgress,
                required: required,
                ready_to_claim: isReady
              });
          }
        }
      }
    } catch (error) {
      console.error('Error in evaluateTasks:', error);
    }
  }

  app.post('/api/events', async (req, res) => {
    try {
      const authHeader = req.headers.authorization;
      if (!authHeader) return res.status(401).json({ error: 'No authorization header' });

      const token = authHeader.split(' ')[1];
      const { data: { user }, error: authError } = await supabase.auth.getUser(token);
      if (authError || !user) return res.status(401).json({ error: 'Invalid token' });

      const { event_type, value, metadata } = req.body;

      if (!event_type) return res.status(400).json({ error: 'event_type is required' });

      const event = {
        user_id: user.id,
        event_type,
        value: value || 1,
        metadata: metadata || {}
      };

      // Log event
      await supabase.from('events').insert(event);

      // Evaluate tasks
      await evaluateTasks(user.id, event);

      res.json({ success: true });
    } catch (error: any) {
      console.error('Error recording event:', error);
      res.status(500).json({ error: error.message });
    }
  });

  app.post('/api/tasks/claim/:id', async (req, res) => {
    try {
      const authHeader = req.headers.authorization;
      if (!authHeader) return res.status(401).json({ error: 'No authorization header' });

      const token = authHeader.split(' ')[1];
      const { data: { user }, error: authError } = await supabase.auth.getUser(token);
      if (authError || !user) return res.status(401).json({ error: 'Invalid token' });

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
  app.post('/api/tasks/complete/:id', async (req, res) => {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ error: 'No autorizado' });

    try {
      const token = authHeader.split(' ')[1];
      const { data: { user: authUser }, error: authError } = await supabase.auth.getUser(token);
      if (authError || !authUser) return res.status(401).json({ error: 'No autorizado' });

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

  // Complete a course
  app.post('/api/courses/complete/:id', async (req, res) => {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ error: 'No autorizado' });

    try {
      const token = authHeader.split(' ')[1];
      const { data: { user: authUser }, error: authError } = await supabase.auth.getUser(token);
      if (authError || !authUser) return res.status(401).json({ error: 'No autorizado' });

      const courseId = req.params.id;
      const { xpReward } = req.body;

      // 1. Check if already completed
      const { data: existing } = await supabase
        .from('user_courses')
        .select('*')
        .eq('user_id', authUser.id)
        .eq('course_id', courseId)
        .single();

      if (existing) return res.status(400).json({ error: 'Curso ya completado' });

      // 2. Insert into user_courses
      const { error: ucError } = await supabase
        .from('user_courses')
        .insert({ user_id: authUser.id, course_id: courseId });

      if (ucError) throw ucError;

      // 3. Update user XP and Level
      const { data: profile } = await supabase
        .from('users')
        .select('xp, level, plan')
        .eq('id', authUser.id)
        .single();

      if (!profile) throw new Error("Perfil no encontrado");

      const newXp = (profile.xp || 0) + (xpReward || 0);
      const newLevel = Math.floor(newXp / 1000) + 1;
      const leveledUp = newLevel > (profile.level || 1);
      
      let updateData: any = { xp: newXp, level: newLevel };
      
      if (leveledUp) {
        updateData.percentage = calculatePercentage(newLevel, profile.plan || 'Básico');
      }

      const { error: updateError } = await supabase
        .from('users')
        .update(updateData)
        .eq('id', authUser.id);

      if (updateError) throw updateError;

      res.json({ 
        success: true, 
        xpGained: xpReward, 
        newXp, 
        newLevel, 
        leveledUp,
        newPercentage: updateData.percentage
      });
    } catch (error: any) {
      console.error('Error in /api/courses/complete:', error);
      res.status(500).json({ error: error.message });
    }
  });
  
  // Get Team Stats
  app.get('/api/team/summary', async (req, res) => {
    try {
      const authHeader = req.headers.authorization;
      if (!authHeader) return res.status(401).json({ error: 'No token provided' });
      
      const token = authHeader.split(' ')[1];
      const { data: { user }, error: authError } = await supabase.auth.getUser(token);
      
      if (authError || !user) {
        return res.status(401).json({ error: 'Invalid token' });
      }

      // Get direct referrals
      const { data: directReferrals } = await supabase
        .from('referrals')
        .select('referred_id')
        .eq('referrer_id', user.id);

      const directIds = directReferrals?.map(r => r.referred_id) || [];
      
      let activeDirects = 0;
      let teamMembers = [];

      if (directIds.length > 0) {
        const { data: users } = await supabase
          .from('users')
          .select('id, name, level, plan, status, created_at')
          .in('id', directIds);
          
        if (users) {
          teamMembers = users;
          activeDirects = users.filter(u => u.plan && u.plan.toLowerCase() !== 'básico' && u.plan.toLowerCase() !== 'gratis' && u.plan.toLowerCase() !== 'free').length;
        }
      }

      // Determine leader level
      let leaderLevel = 'Promotor';
      if (activeDirects >= 300) leaderLevel = 'Embajador';
      else if (activeDirects >= 100) leaderLevel = 'Director';
      else if (activeDirects >= 40) leaderLevel = 'Coordinador';
      else if (activeDirects >= 15) leaderLevel = 'Líder';
      else if (activeDirects >= 5) leaderLevel = 'Promotor';
      else leaderLevel = 'Usuario';

      // Get network earnings
      const { data: commissions } = await supabase
        .from('transactions')
        .select('amount')
        .eq('user_id', user.id)
        .eq('type', 'referral_commission')
        .eq('status', 'completed');

      const totalEarnings = commissions?.reduce((sum, tx) => sum + Number(tx.amount), 0) || 0;

      res.json({
        leaderLevel,
        activeDirects,
        totalDirects: directIds.length,
        totalEarnings,
        teamMembers
      });
    } catch (error) {
      console.error('Error in /api/team/summary:', error);
      res.status(500).json({ error: 'Error al obtener estadísticas del equipo' });
    }
  });

  // We don't have a direct registration endpoint in server.ts since it uses Supabase Auth directly from the client.
  // But we can add a webhook or an endpoint to update trust score.
  // Actually, let's add an endpoint to report activity and update trust score.
  app.post('/api/user/activity', async (req, res) => {
    try {
      const authHeader = req.headers.authorization;
      if (!authHeader) return res.status(401).json({ error: 'No token provided' });
      
      const token = authHeader.split(' ')[1];
      const { data: { user }, error: authError } = await supabase.auth.getUser(token);
      
      if (authError || !user) return res.status(401).json({ error: 'Invalid token' });

      const { action } = req.body; // 'normal_activity', 'suspicious_activity'
      
      const { data: profile } = await supabase.from('users').select('trust_score').eq('id', user.id).single();
      
      if (profile) {
        let newScore = profile.trust_score !== undefined ? profile.trust_score : 100;
        
        if (action === 'normal_activity') newScore = Math.min(100, newScore + 5);
        else if (action === 'suspicious_activity') newScore = Math.max(0, newScore - 30);
        else if (action === 'plan_purchase') newScore = Math.min(100, newScore + 20);

        await supabase.from('users').update({ trust_score: newScore }).eq('id', user.id);
      }

      res.json({ success: true });
    } catch (error) {
      console.error('Error updating activity:', error);
      res.status(500).json({ error: 'Error interno' });
    }
  });
  // Helper to update user wallet balance
  async function updateWalletBalance(userId: string) {
    try {
      const { data: txs, error: txError } = await supabase
        .from('transactions')
        .select('amount, type, status')
        .eq('user_id', userId);

      if (txError) throw txError;

      const totalEarnings = (txs || [])
        .filter((t: any) => t.type === 'referral_commission' && t.status === 'completed')
        .reduce((acc: number, curr: any) => acc + Number(curr.amount), 0);

      const totalWithdrawals = (txs || [])
        .filter((t: any) => t.type === 'withdrawal' && t.status !== 'rejected')
        .reduce((acc: number, curr: any) => acc + Number(curr.amount), 0);

      const balance = totalEarnings - totalWithdrawals;

      await supabase
        .from('users')
        .update({ wallet_balance: balance })
        .eq('id', userId);

      return balance;
    } catch (err) {
      console.error(`Error updating wallet balance for user ${userId}:`, err);
      return 0;
    }
  }

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
      
      // Fetch plan from database
      const { data: selectedPlan, error: planError } = await supabase
        .from('plans')
        .select('*')
        .eq('id', planId)
        .single();

      if (planError || !selectedPlan) {
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

  app.post('/api/withdraw/request', async (req, res) => {
    try {
      const authHeader = req.headers.authorization;
      if (!authHeader) return res.status(401).json({ error: 'No token provided' });
      
      const token = authHeader.split(' ')[1];
      const { data: { user: authUser }, error: authError } = await supabase.auth.getUser(token);
      
      if (authError || !authUser) {
        return res.status(401).json({ error: 'Invalid token' });
      }

      const { amount } = req.body;
      if (!amount || isNaN(amount) || amount < 10000) {
        return res.status(400).json({ error: 'El monto mínimo de retiro es $10.000' });
      }

      // Check current balance
      const balance = await updateWalletBalance(authUser.id);
      if (amount > balance) {
        return res.status(400).json({ error: 'Saldo insuficiente' });
      }

      // Create withdrawal transaction
      const { data: transaction, error: txError } = await supabase
        .from('transactions')
        .insert({
          user_id: authUser.id,
          amount: amount,
          commission: 0,
          type: 'withdrawal',
          status: 'pending'
        })
        .select()
        .single();

      if (txError) throw txError;

      // Update wallet balance after withdrawal request
      await updateWalletBalance(authUser.id);

      res.json({ success: true, transaction });
    } catch (error: any) {
      console.error('Error in /api/withdraw/request:', error);
      res.status(500).json({ error: error.message || 'Error al procesar el retiro' });
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
        // 0. Get user's current level
        const { data: userProfile } = await supabase.from('users').select('level').eq('id', tx.user_id).single();
        const userLevel = userProfile?.level || 1;

        // 1. Identify plan from amount or metadata
        const amount = Math.abs(tx.amount);
        let planName = 'Básico';
        let planId = null;
        
        // Try to find plan in database by amount
        const { data: planData } = await supabase
          .from('plans')
          .select('id, name')
          .eq('price', amount)
          .single();

        if (planData) {
          planName = planData.name;
          planId = planData.id;
        } else {
          // Fallback to hardcoded logic if plan not found in table
          if (amount >= 120000) { planName = 'Élite'; }
          else if (amount >= 60000) { planName = 'Pro'; }
          else if (amount >= 30000) { planName = 'Avanzado'; }
        }

        const newPercentage = calculatePercentage(userLevel, planName);

        // 2. Update user plan
        const updateData: any = {
          plan: planName,
          percentage: newPercentage
        };
        if (planId) {
          updateData.plan_id = planId;
        }

        const { error: userUpdateError } = await supabase
          .from('users')
          .update(updateData)
          .eq('id', tx.user_id);

        if (userUpdateError) throw userUpdateError;

        // 3. Process referral commission (Up to 3 levels)
        let currentReferredId = tx.user_id;
        let currentLevel = 1;
        
        while (currentLevel <= 3) {
          const { data: referral } = await supabase
            .from('referrals')
            .select('referrer_id')
            .eq('referred_id', currentReferredId)
            .single();

          if (!referral || !referral.referrer_id) break;

          const { data: referrer } = await supabase
            .from('users')
            .select('percentage, name, plan')
            .eq('id', referral.referrer_id)
            .single();

          if (referrer) {
            // Calculate percentage based on level and plan
            let levelPercentage = 0;
            const planLower = referrer.plan?.toLowerCase() || 'básico';
            
            if (currentLevel === 1) {
              levelPercentage = 100; // 100% of their base commission
            } else if (currentLevel === 2) {
              if (planLower.includes('elite') || planLower.includes('élite')) levelPercentage = 50;
              else if (planLower.includes('pro')) levelPercentage = 40;
              else if (planLower.includes('avanzado')) levelPercentage = 30;
              else levelPercentage = 20; // Básico
            } else if (currentLevel === 3) {
              if (planLower.includes('elite') || planLower.includes('élite')) levelPercentage = 25;
              else if (planLower.includes('pro')) levelPercentage = 20;
              else if (planLower.includes('avanzado')) levelPercentage = 15;
              else levelPercentage = 10; // Básico
            }

            const effectiveCommissionPercentage = referrer.percentage * (levelPercentage / 100);
            const commissionAmount = amount * (effectiveCommissionPercentage / 100);
            
            if (commissionAmount > 0) {
              await supabase.from('transactions').insert({
                user_id: referral.referrer_id,
                referred_id: tx.user_id,
                amount: commissionAmount,
                commission: effectiveCommissionPercentage,
                type: 'referral_commission',
                status: 'completed',
                nivel_red: currentLevel
              });

              // Update referrer's wallet balance
              await updateWalletBalance(referral.referrer_id);

              // Notify Referrer
              await supabase.from('notifications').insert({
                user_id: referral.referrer_id,
                title: `¡Comisión de Red (Nivel ${currentLevel})!`,
                message: `Has recibido $${commissionAmount.toLocaleString('es-CO')} por la compra de un referido en tu nivel ${currentLevel}.`,
                type: 'success'
              });
              
              // Add XP for referral buying plan
              const { data: refProfile } = await supabase.from('users').select('xp, level, plan').eq('id', referral.referrer_id).single();
              if (refProfile) {
                const xpGained = 500; // +500 XP
                const newXp = (refProfile.xp || 0) + xpGained;
                let newLevel = Math.floor(newXp / 1000) + 1;
                if (newLevel > 100) newLevel = 100;
                let newPercentage = refProfile.percentage;

                if (newLevel > (refProfile.level || 1)) {
                  newPercentage = calculatePercentage(newLevel, refProfile.plan || 'Básico');
                }

                await supabase.from('users').update({ xp: newXp, level: newLevel, percentage: newPercentage }).eq('id', referral.referrer_id);
              }
            }
          }

          currentReferredId = referral.referrer_id;
          currentLevel++;
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

      if (tx.type === 'plan_purchase') {
        const amount = Math.abs(tx.amount);
        let planName = 'Básico';
        const { data: planData } = await supabase.from('plans').select('name').eq('price', amount).single();
        if (planData) planName = planData.name;
        else if (amount >= 120000) planName = 'Élite';
        else if (amount >= 60000) planName = 'Pro';
        else if (amount >= 30000) planName = 'Avanzado';

        await evaluateTasks(tx.user_id, {
          event_type: 'PLAN_PURCHASE',
          metadata: { plan_id: planName }
        });
      }

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
          message = `Tu solicitud de retiro por $${Number(tx.amount).toLocaleString('es-CO')} ha sido rechazada.`;
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

  // Get current user profile
  app.get('/api/user/me', async (req, res) => {
    try {
      const authHeader = req.headers.authorization;
      if (!authHeader) return res.status(401).json({ error: 'No autorizado' });
      
      const token = authHeader.split(' ')[1];
      const { data: { user: authUser }, error: authError } = await supabase.auth.getUser(token);
      
      if (authError || !authUser) return res.status(401).json({ error: 'No autorizado' });

      const { data: profile, error: profileError } = await supabase
        .from('users')
        .select('*')
        .eq('id', authUser.id)
        .single();

      if (profileError || !profile) return res.status(404).json({ error: 'Perfil no encontrado' });

      res.json(profile);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Admin Stats
  app.get('/api/admin/dashboard-data', async (req, res) => {
    try {
      const authHeader = req.headers.authorization;
      if (!authHeader) return res.status(401).json({ error: 'No autorizado' });
      
      const token = authHeader.split(' ')[1];
      const { data: { user: adminUser }, error: authError } = await supabase.auth.getUser(token);
      
      if (authError || !adminUser) return res.status(401).json({ error: 'No autorizado' });

      // Check if admin
      const { data: adminProfile } = await supabase.from('users').select('role').eq('id', adminUser.id).single();
      if (adminProfile?.role !== 'admin') return res.status(403).json({ error: 'No autorizado' });

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

  // Admin: Send Global Notification
  app.post('/api/admin/notifications/global', async (req, res) => {
    try {
      const authHeader = req.headers.authorization;
      if (!authHeader) return res.status(401).json({ error: 'No autorizado' });
      
      const token = authHeader.split(' ')[1];
      const { data: { user }, error: authError } = await supabase.auth.getUser(token);
      if (authError || !user) return res.status(401).json({ error: 'Token inválido' });

      // Verify admin role
      const { data: userData } = await supabase.from('users').select('role').eq('id', user.id).single();
      if (userData?.role !== 'admin') {
        return res.status(403).json({ error: 'No tienes permisos de administrador' });
      }

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
        user_id: u.id,
        title,
        message,
        type: type || 'info'
      }));

      // Insert in batches of 100 to avoid limits
      const batchSize = 100;
      for (let i = 0; i < notifications.length; i += batchSize) {
        const batch = notifications.slice(i, i + batchSize);
        const { error: insertError } = await supabase.from('notifications').insert(batch);
        if (insertError) throw insertError;
      }

      res.json({ success: true, count: notifications.length });
    } catch (error: any) {
      console.error("Error sending global notification:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Admin Transactions
  app.get('/api/admin/transactions', async (req, res) => {
    try {
      const authHeader = req.headers.authorization;
      if (!authHeader) return res.status(401).json({ error: 'No autorizado' });
      
      const token = authHeader.split(' ')[1];
      const { data: { user: adminUser }, error: authError } = await supabase.auth.getUser(token);
      
      if (authError || !adminUser) return res.status(401).json({ error: 'No autorizado' });

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
  app.get('/api/admin/system-status', async (req, res) => {
    try {
      const authHeader = req.headers.authorization;
      if (!authHeader) return res.status(401).json({ error: 'No autorizado' });
      
      const token = authHeader.split(' ')[1];
      const { data: { user: adminUser }, error: authError } = await supabase.auth.getUser(token);
      
      if (authError || !adminUser) return res.status(401).json({ error: 'No autorizado' });

      // Check if admin
      const { data: adminProfile } = await supabase.from('users').select('role').eq('id', adminUser.id).single();
      if (adminProfile?.role !== 'admin') return res.status(403).json({ error: 'No autorizado' });

      const status = {
        database: supabase ? 'up' : 'down',
        server: 'up',
        timestamp: new Date().toISOString(),
        env: process.env.NODE_ENV || 'development'
      };

      res.json(status);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
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
  app.get('/api/app-config', async (req, res) => {
    console.log("Fetching app config...");
    try {
      const { data, error } = await supabase.from('settings').select('*');
      if (error) throw error;
      
      const settings: Record<string, any> = {};
      data.forEach(s => {
        settings[s.key] = s.value;
      });
      
      console.log("Settings fetched:", settings);
      res.json(settings);
    } catch (error) {
      console.error('Error in GET /api/app-config:', error);
      res.status(500).json({ error: 'Error al obtener configuraciones' });
    }
  });

  // Update Global Setting (Admin Only)
  app.post('/api/admin/app-config', async (req, res) => {
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
      console.error('Error in POST /api/admin/app-config:', error);
      res.status(500).json({ error: 'Error al actualizar configuración' });
    }
  });

  // Get User Profile (Bypasses RLS recursion issues)
  app.get('/api/account/data', async (req, res) => {
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
      const profile = await getOrCreateProfile(user.id, user.email, user.user_metadata);

      if (profile) {
        // Ensure percentage strictly follows the mathematical table
        const expectedPercentage = calculatePercentage(profile.level || 1, profile.plan || 'Básico');
        
        // Only update if there's a significant difference (to avoid constant minor float updates)
        if (Math.abs((profile.percentage || 0) - expectedPercentage) > 0.01) {
          console.log(`Recalculating percentage for user ${user.id} from ${profile.percentage} to ${expectedPercentage}`);
          await supabase.from('users').update({ percentage: expectedPercentage }).eq('id', user.id);
          profile.percentage = expectedPercentage;
        }

        // Calculate total earned from transactions (only referral commissions)
        const { data: txs } = await supabase
          .from('transactions')
          .select('amount')
          .eq('user_id', user.id)
          .eq('type', 'referral_commission')
          .eq('status', 'completed');
          
        profile.totalEarned = txs?.reduce((sum: number, tx: any) => sum + (tx.amount || 0), 0) || 0;
      }

      res.json(profile);
    } catch (error) {
      console.error('Error in /api/account/data:', error);
      res.status(500).json({ error: 'Error interno del servidor' });
    }
  });

  // Helper to get or create user profile
  async function getOrCreateProfile(userId: string, email?: string, metadata?: any) {
    const { data: profile, error: profileError } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .single();

    if (profileError || !profile) {
      if (!profileError || profileError.code === 'PGRST116') {
        console.log(`Creating missing profile for user ${userId}`);
        const { data: newProfile, error: insertError } = await supabase
          .from('users')
          .insert({
            id: userId,
            name: metadata?.full_name || email?.split('@')[0] || 'Usuario',
            email: email,
            role: 'user',
            plan: 'Básico',
            plan_id: '00000000-0000-0000-0000-000000000000',
            level: 1,
            xp: 0,
            percentage: calculatePercentage(1, 'Básico'),
            trust_score: 100,
            leader_level: 'Promotor',
          })
          .select()
          .single();

        if (insertError) {
          console.error(`Error creating profile for user ${userId}:`, insertError);
          throw insertError;
        }
        if (!newProfile) {
          console.error(`Profile creation returned null for user ${userId}`);
          throw new Error('Error al crear el perfil');
        }
        return newProfile;
      }
      console.error(`Error fetching profile for user ${userId}:`, profileError);
      throw profileError;
    }

    return profile;
  }

  // Activate Tasks
  app.post('/api/tasks/activate', async (req, res) => {
    try {
      const authHeader = req.headers.authorization;
      if (!authHeader) return res.status(401).json({ error: 'No token provided' });
      
      const token = authHeader.split(' ')[1];
      const { data: { user: authUser }, error: authError } = await supabase.auth.getUser(token);
      
      if (authError || !authUser) return res.status(401).json({ error: 'Invalid token' });

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
      await supabase.from('notifications').insert({
        user_id: authUser.id,
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

  app.get('/api/tasks/status', async (req, res) => {
    try {
      const authHeader = req.headers.authorization;
      if (!authHeader) return res.status(401).json({ error: 'No authorization header' });
      const token = authHeader.split(' ')[1];
      const { data: { user: authUser }, error: authError } = await supabase.auth.getUser(token);
      if (authError || !authUser) return res.status(401).json({ error: 'Invalid token' });

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
          await supabase.from('notifications').insert({
            user_id: user.id,
            title: 'Ciclo de Tareas Finalizado',
            message: `Tu ciclo de 7 días ha terminado. No completaste ${uncompletedTasks.length} tareas. Se han aplicado sanciones y se han generado tareas de castigo.`,
            type: 'alert'
          });
        } else {
          // All tasks completed! Great job.
          await supabase.from('users').update({
            is_tasks_active: false,
            inventory_status: 'Inactivo',
            compliance_score: Math.min(100, (user.compliance_score || 100) + 5)
          }).eq('id', user.id);

          await supabase.from('notifications').insert({
            user_id: user.id,
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
  app.get('/api/tasks/penalty', async (req, res) => {
    try {
      const authHeader = req.headers.authorization;
      if (!authHeader) return res.status(401).json({ error: 'No authorization header' });
      const token = authHeader.split(' ')[1];
      const { data: { user: authUser }, error: authError } = await supabase.auth.getUser(token);
      if (authError || !authUser) return res.status(401).json({ error: 'Invalid token' });

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
  app.post('/api/tasks/complete-penalty/:id', async (req, res) => {
    try {
      const authHeader = req.headers.authorization;
      if (!authHeader) return res.status(401).json({ error: 'No authorization header' });
      const token = authHeader.split(' ')[1];
      const { data: { user: authUser }, error: authError } = await supabase.auth.getUser(token);
      if (authError || !authUser) return res.status(401).json({ error: 'Invalid token' });

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

  // System Status
  app.get('/api/system/status', async (req, res) => {
    console.log("Checking system status...");
    const status = {
      database: 'down',
      gemini_api: 'down',
      auth_server: 'down',
      server: 'up',
      timestamp: new Date().toISOString()
    };

    if (!supabase) {
      console.error("Supabase client not initialized");
      return res.json(status);
    }

    try {
      // Check Database - use a simple query
      const { error: dbError } = await supabase.from('users').select('id').limit(1);
      if (!dbError) {
        status.database = 'up';
        // If we can query the DB, the auth/connection to Supabase is likely fine
        status.auth_server = 'up';
      } else {
        console.error("Database check failed:", dbError);
      }

      // Check Gemini
      if (process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY !== 'MY_GEMINI_API_KEY') {
        status.gemini_api = 'up';
      } else {
        console.warn("Gemini API Key missing or default");
      }

      res.json(status);
    } catch (error) {
      console.error("System status check exception:", error);
      res.json(status);
    }
  });

  // Tickets - Create
  app.post('/api/tickets', async (req, res) => {
    try {
      const authHeader = req.headers.authorization;
      if (!authHeader) return res.status(401).json({ error: 'No token provided' });
      
      const token = authHeader.split(' ')[1];
      const { data: { user }, error: authError } = await supabase.auth.getUser(token);
      if (authError || !user) return res.status(401).json({ error: 'Invalid token' });

      const { subject, message, priority } = req.body;
      const { data, error } = await supabase.from('tickets').insert({
        user_id: user.id,
        subject,
        message,
        priority: priority || 'medium'
      }).select().single();

      if (error) throw error;
      res.json(data);
    } catch (error) {
      console.error('Error in POST /api/tickets:', error);
      res.status(500).json({ error: 'Error al crear ticket' });
    }
  });

  // Tickets - List (User)
  app.get('/api/tickets', async (req, res) => {
    try {
      const authHeader = req.headers.authorization;
      if (!authHeader) return res.status(401).json({ error: 'No token provided' });
      
      const token = authHeader.split(' ')[1];
      const { data: { user }, error: authError } = await supabase.auth.getUser(token);
      if (authError || !user) return res.status(401).json({ error: 'Invalid token' });

      const { data, error } = await supabase
        .from('tickets')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      res.json(data);
    } catch (error) {
      console.error('Error in GET /api/tickets:', error);
      res.status(500).json({ error: 'Error al obtener tickets' });
    }
  });

  // Tickets - List All (Admin)
  app.get('/api/admin/tickets', async (req, res) => {
    try {
      const authHeader = req.headers.authorization;
      if (!authHeader) return res.status(401).json({ error: 'No token provided' });
      
      const token = authHeader.split(' ')[1];
      const { data: { user }, error: authError } = await supabase.auth.getUser(token);
      if (authError || !user) return res.status(401).json({ error: 'Invalid token' });

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
  app.post('/api/admin/tickets/:id/resolve', async (req, res) => {
    try {
      const authHeader = req.headers.authorization;
      if (!authHeader) return res.status(401).json({ error: 'No token provided' });
      
      const token = authHeader.split(' ')[1];
      const { data: { user }, error: authError } = await supabase.auth.getUser(token);
      if (authError || !user) return res.status(401).json({ error: 'Invalid token' });

      const { data: profile, error: profileError } = await supabase.from('users').select('role').eq('id', user.id).single();
      
      if (profileError || profile?.role !== 'admin') {
        console.warn('Unauthorized admin access attempt:', user.id, profileError);
        return res.status(403).json({ error: 'Forbidden' });
      }

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
      await supabase.from('notifications').insert({
        user_id: data.user_id,
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
  app.post('/api/admin/tasks', async (req, res) => {
    try {
      const authHeader = req.headers.authorization;
      if (!authHeader) return res.status(401).json({ error: 'No token provided' });
      const token = authHeader.split(' ')[1];
      const { data: { user }, error: authError } = await supabase.auth.getUser(token);
      if (authError || !user) return res.status(401).json({ error: 'Invalid token' });

      const { data: profile } = await supabase.from('users').select('role').eq('id', user.id).single();
      if (profile?.role !== 'admin') return res.status(403).json({ error: 'Forbidden' });

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

  app.post('/api/admin/tasks/seed', async (req, res) => {
    try {
      const authHeader = req.headers.authorization;
      if (!authHeader) return res.status(401).json({ error: 'No token provided' });
      const token = authHeader.split(' ')[1];
      const { data: { user }, error: authError } = await supabase.auth.getUser(token);
      if (authError || !user) return res.status(401).json({ error: 'Invalid token' });

      const { data: profile } = await supabase.from('users').select('role').eq('id', user.id).single();
      if (profile?.role !== 'admin') return res.status(403).json({ error: 'Forbidden' });

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

  app.put('/api/admin/tasks/:id', async (req, res) => {
    try {
      const authHeader = req.headers.authorization;
      if (!authHeader) return res.status(401).json({ error: 'No token provided' });
      const token = authHeader.split(' ')[1];
      const { data: { user }, error: authError } = await supabase.auth.getUser(token);
      if (authError || !user) return res.status(401).json({ error: 'Invalid token' });

      const { data: profile } = await supabase.from('users').select('role').eq('id', user.id).single();
      if (profile?.role !== 'admin') return res.status(403).json({ error: 'Forbidden' });

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

  app.delete('/api/admin/tasks/:id', async (req, res) => {
    try {
      const authHeader = req.headers.authorization;
      if (!authHeader) return res.status(401).json({ error: 'No token provided' });
      const token = authHeader.split(' ')[1];
      const { data: { user }, error: authError } = await supabase.auth.getUser(token);
      if (authError || !user) return res.status(401).json({ error: 'Invalid token' });

      const { data: profile } = await supabase.from('users').select('role').eq('id', user.id).single();
      if (profile?.role !== 'admin') return res.status(403).json({ error: 'Forbidden' });

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

  app.delete('/api/admin/tasks', async (req, res) => {
    try {
      const authHeader = req.headers.authorization;
      if (!authHeader) return res.status(401).json({ error: 'No token provided' });
      const token = authHeader.split(' ')[1];
      const { data: { user }, error: authError } = await supabase.auth.getUser(token);
      if (authError || !user) return res.status(401).json({ error: 'Invalid token' });

      const { data: profile } = await supabase.from('users').select('role').eq('id', user.id).single();
      if (profile?.role !== 'admin') return res.status(403).json({ error: 'Forbidden' });

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

  app.post('/api/admin/tasks/end-week', async (req, res) => {
    try {
      const authHeader = req.headers.authorization;
      if (!authHeader) return res.status(401).json({ error: 'No token provided' });
      
      const token = authHeader.split(' ')[1];
      const { data: { user }, error: authError } = await supabase.auth.getUser(token);
      if (authError || !user) return res.status(401).json({ error: 'Invalid token' });

      const { data: profile } = await supabase.from('users').select('role').eq('id', user.id).single();
      if (profile?.role !== 'admin') return res.status(403).json({ error: 'Forbidden' });

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
          await supabase.from('notifications').insert({
            user_id: u.id,
            title: 'Semana Finalizada - Sanciones Aplicadas',
            message: `La semana ha terminado. No completaste ${missedTasks.length} tareas. Se han aplicado sanciones de XP y cumplimiento, y se han generado tareas de castigo.`,
            type: 'alert'
          });
        } else {
          // All tasks completed!
          const newCompliance = Math.min(100, (u.compliance_score || 100) + 5);
          await supabase.from('users').update({
            compliance_score: newCompliance
          }).eq('id', u.id);

          await supabase.from('notifications').insert({
            user_id: u.id,
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

  app.post('/api/admin/users/:id/penalty-tasks', async (req, res) => {
    try {
      const authHeader = req.headers.authorization;
      if (!authHeader) return res.status(401).json({ error: 'No token provided' });
      const token = authHeader.split(' ')[1];
      const { data: { user }, error: authError } = await supabase.auth.getUser(token);
      if (authError || !user) return res.status(401).json({ error: 'Invalid token' });

      const { data: profile } = await supabase.from('users').select('role').eq('id', user.id).single();
      if (profile?.role !== 'admin') return res.status(403).json({ error: 'Forbidden' });

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

    app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
      console.error('Unhandled error:', err);
      res.status(500).json({ error: 'Internal server error', details: err.message });
    });

    app.listen(PORT, '0.0.0.0', () => {
      console.log(`Server running on http://localhost:${PORT}`);
    });
  } catch (error: any) {
    console.error('Critical server error:', error);
  }
}

startServer().catch(err => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
