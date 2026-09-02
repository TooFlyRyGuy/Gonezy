/**
 * Interface for NabGo Notification Subsystem
 * Prepared for future in-app, SMS, email, and Web Push alerts.
 */
export type NotificationType =
  | 'matching_item_posted'
  | 'price_escalation_imminent'
  | 'item_claimed'
  | 'claim_accepted'
  | 'pickup_deadline_approaching'
  | 'claim_expired'
  | 'item_available_again';

export interface AppNotification {
  id: string;
  userId: string;
  type: NotificationType;
  title: string;
  body: string;
  listingId?: string;
  isRead: boolean;
  createdAt: string;
}

export const notificationService = {
  async getUserNotifications(userId: string): Promise<AppNotification[]> {
    return [
      {
        id: 'notif-1',
        userId,
        type: 'price_escalation_imminent',
        title: 'Price increasing in 15 minutes!',
        body: 'Dewalt 12" Sliding Compound Miter Saw price will increase from FREE to $60.',
        listingId: 'demo-3',
        isRead: false,
        createdAt: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
      },
      {
        id: 'notif-2',
        userId,
        type: 'matching_item_posted',
        title: 'New match for your Wanted alert',
        body: 'A new Commercial Stainless Steel Refrigerator was just posted 2.8 miles away.',
        listingId: 'demo-2',
        isRead: false,
        createdAt: new Date(Date.now() - 40 * 60 * 1000).toISOString(),
      },
    ];
  },

  async markAsRead(notificationId: string): Promise<void> {
    console.log('Marking notification read:', notificationId);
  },
};
