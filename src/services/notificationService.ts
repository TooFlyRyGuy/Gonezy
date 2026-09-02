import { isPreviewMode, isSupabaseConfigured, supabase, throwLiveError } from '../lib/supabase';

export type NotificationType =
  | 'matching_item_posted'
  | 'price_escalation_imminent'
  | 'item_claimed'
  | 'claim_accepted'
  | 'pickup_deadline_approaching'
  | 'claim_expired'
  | 'item_available_again'
  | string;

export interface AppNotification {
  id: string;
  userId: string;
  type: NotificationType;
  title: string;
  body: string;
  listingId?: string;
  claimId?: string;
  isRead: boolean;
  createdAt: string;
}

const LOCAL_NOTIFS_KEY = 'gonezy_user_notifications';

function getLocalNotifications(userId: string): AppNotification[] {
  try {
    const raw = localStorage.getItem(`${LOCAL_NOTIFS_KEY}_${userId}`);
    if (raw) return JSON.parse(raw);
  } catch (e) {}
  return [
    {
      id: 'notif-1',
      userId,
      type: 'price_escalation_imminent',
      title: 'Price increasing soon!',
      body: 'Urgency window nearing step change for a tracked item nearby.',
      listingId: 'demo-3',
      isRead: false,
      createdAt: new Date(Date.now() - 10 * 60 * 1000).toISOString(),
    },
    {
      id: 'notif-2',
      userId,
      type: 'matching_item_posted',
      title: 'New match for your Wanted alert',
      body: 'A new Commercial Equipment listing was just posted in your search radius.',
      listingId: 'demo-2',
      isRead: false,
      createdAt: new Date(Date.now() - 45 * 60 * 1000).toISOString(),
    },
  ];
}

function saveLocalNotifications(userId: string, notifs: AppNotification[]): void {
  try {
    localStorage.setItem(`${LOCAL_NOTIFS_KEY}_${userId}`, JSON.stringify(notifs));
  } catch (e) {}
}

export const notificationService = {
  /**
   * Fetch notifications for the active user
   */
  async getUserNotifications(userId: string): Promise<AppNotification[]> {
    if (isPreviewMode() || !isSupabaseConfigured) {
      return getLocalNotifications(userId);
    }

    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(30);

    if (error) {
      throwLiveError(error, 'Could not load notifications');
    }

    return (data || []).map((n: any) => ({
      id: n.id,
      userId: n.user_id,
      type: n.type,
      title: n.title,
      body: n.body || '',
      listingId: n.listing_id || undefined,
      claimId: n.claim_id || undefined,
      isRead: n.is_read,
      createdAt: n.created_at,
    }));
  },

  /**
   * Mark notification as read
   */
  async markAsRead(notificationId: string, userId?: string): Promise<void> {
    if (isPreviewMode() || !isSupabaseConfigured) {
      if (userId) {
        const notifs = getLocalNotifications(userId);
        saveLocalNotifications(
          userId,
          notifs.map((n) => (n.id === notificationId ? { ...n, isRead: true } : n))
        );
      }
      return;
    }

    const { error } = await supabase.from('notifications').update({ is_read: true }).eq('id', notificationId);
    if (error) throwLiveError(error, 'Could not update notification');
  },

  /**
   * Mark all notifications as read for a user
   */
  async markAllAsRead(userId: string): Promise<void> {
    if (isPreviewMode() || !isSupabaseConfigured) {
      const notifs = getLocalNotifications(userId);
      saveLocalNotifications(
        userId,
        notifs.map((n) => ({ ...n, isRead: true }))
      );
      return;
    }

    const { error } = await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('user_id', userId)
      .eq('is_read', false);
    if (error) throwLiveError(error, 'Could not update notifications');
  },
};
