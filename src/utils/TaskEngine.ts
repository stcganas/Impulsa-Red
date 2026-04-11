export const TaskEngine = {
  triggerEvent: async (eventType: string, value: number = 1, metadata: any = {}) => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;

      const response = await fetch('/api/events', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          event_type: eventType,
          value,
          metadata
        })
      });

      if (!response.ok) {
        console.error('Failed to trigger event:', eventType);
      }
    } catch (error) {
      console.error('Error triggering event:', error);
    }
  }
};
