import { Router } from 'express';

export function mentorRoutes(services: any) {
  const { supabase, authenticate, authorizeAdmin, calculatePercentage, updateWalletBalance, processPlanPurchase, evaluateTasks, checkDailyReset, getOrCreateProfile } = services;
  const router = Router();



  // AI Mentor Chat Endpoint
  router.post('/mentor/chat', authenticate, async (req: any, res: any) => {
    try {







    const user = req.user;

      const { message, settingsName } = req.body;
      if (!message) return res.status(400).json({ error: 'Mensaje es requerido' });

      // Get user profile for context
      const { data: profile } = await supabase
        .from('users')
        .select('name, level, plan, wallet_balance')
        .eq('id', user.id)
        .single();
        
      // Get referral count
      const { count: referralsCount } = await supabase
        .from('referrals')
        .select('*', { count: 'exact', head: true })
        .eq('referrer_id', user.id);

      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        throw new Error('GEMINI_API_KEY is not configured on the server.');
      }

      // We dynamically import so it doesn't break if not using AI
      const { GoogleGenAI } = await import('@google/genai');
      const ai = new GoogleGenAI({ apiKey });

      const appName = settingsName || 'ImpulsaRed';
      const systemInstruction = `Eres el Mentor Financiero IA de ${appName}. Tu objetivo es ayudar a los usuarios a crecer su red de referidos, motivarlos a completar sus tareas diarias, darles estrategias de ventas y explicarles cómo subir de nivel para alcanzar el 70% de comisión. 
      
      Contexto del usuario actual:
      - Nombre: ${profile?.name || 'Usuario'}
      - Nivel: ${profile?.level || 1}
      - Plan: ${profile?.plan || 'Gratis'}
      - Saldo: $${(profile?.wallet_balance || 0).toLocaleString('es-CO')}
      - Referidos Directos: ${referralsCount || 0}
      
      Sé entusiasta, profesional y motivador. Usa un tono de líder de equipo. Menciona datos de su progreso si es relevante para motivarlo.`;

      const response = await ai.models.generateContent({
        model: 'gemini-3.5-flash',
        contents: message,
        config: {
          systemInstruction,
        }
      });

      res.json({ reply: response.text });
    } catch (error: any) {
      console.error("Error in AI Mentor chat:", error);
      res.status(500).json({ error: error.message || "Error al comunicarse con la IA" });
    }
  });
  return router;
}
