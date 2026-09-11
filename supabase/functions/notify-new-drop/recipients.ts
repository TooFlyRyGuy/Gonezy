/** Pure recipient rules for new-drop emails. No Deno / Resend imports. */

export type DropEmailMode = 'all' | 'matching';

export interface DropRecipient {
  id: string;
  accountType?: string | null;
  dropEmailMode?: string | null;
  categoryIds: string[];
}

export function normalizeDropEmailMode(value: string | null | undefined): DropEmailMode {
  return value === 'matching' ? 'matching' : 'all';
}

/**
 * Who gets a new-drop email.
 *
 * - Seller never gets mail about their own listing.
 * - Business / hauler: unchanged — still emailed (unless they are the seller).
 * - Consumer with explicit "matching" AND at least one tapped category:
 *   only if the listing category is one they tapped.
 * - Matching with zero taps cannot strand them: treat as all-mail.
 * - Missing prefs / mode defaults to all-mail (today's behavior).
 */
export function shouldSendDropEmail(input: {
  recipient: DropRecipient;
  sellerId: string;
  listingCategoryId: string | null | undefined;
}): boolean {
  const { recipient, sellerId, listingCategoryId } = input;
  if (!recipient.id || recipient.id === sellerId) return false;

  if (recipient.accountType === 'business') return true;

  const mode = normalizeDropEmailMode(recipient.dropEmailMode);
  const taps = recipient.categoryIds.filter((id) => typeof id === 'string' && id.length > 0);

  if (mode === 'matching' && taps.length > 0) {
    if (!listingCategoryId) return false;
    return taps.includes(listingCategoryId);
  }

  return true;
}

export function filterDropRecipients<T extends DropRecipient>(input: {
  recipients: T[];
  sellerId: string;
  listingCategoryId: string | null | undefined;
}): T[] {
  return input.recipients.filter((recipient) =>
    shouldSendDropEmail({
      recipient,
      sellerId: input.sellerId,
      listingCategoryId: input.listingCategoryId,
    })
  );
}
