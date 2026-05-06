import { Router } from 'express';

export function uploadRoutes(services: any) {
  const { supabase, authenticate, authorizeAdmin, calculatePercentage, updateWalletBalance, processPlanPurchase, evaluateTasks, checkDailyReset, getOrCreateProfile } = services;
  const router = Router();



  // Upload Image
  router.post('/upload-image', authenticate, async (req: any, res: any) => {
    try {
      const user = req.user;
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
  return router;
}
