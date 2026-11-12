import { z } from 'zod';

import { socialCall } from './api';

import { getCommunityClient } from '@/services/cloud/client';

export const presenceSchema = z.array(z.object({ id: z.uuid(), online: z.boolean(), seen_at: z.iso.datetime({ offset: true }) })).max(200);
export type FriendPresence = z.infer<typeof presenceSchema>[number];
export const friendPresence = (ids: string[]) => socialCall('presence_status', { ids: z.array(z.uuid()).max(200).parse(ids) }, presenceSchema);
export async function pingPresence(device: string, leave = false) {
  const client = getCommunityClient();
  if (!client || !(await client.auth.getSession()).data.session) return;
  const controller = new AbortController(), timeout = setTimeout(() => controller.abort(), 10000);
  try {
    const result = await client.rpc('social_api', { p_action: leave ? 'presence_leave' : 'presence_ping', p_data: { device: z.uuid().parse(device) } }).abortSignal(controller.signal);
    if (result.error) throw result.error;
    z.literal(true).parse(result.data);
  } finally { clearTimeout(timeout); }
}
export function presenceLabel(value?: FriendPresence, fetchedAt = 0, now = Date.now()) {
  if (!value || now - fetchedAt > 70000) return 'Chưa có trạng thái hoạt động';
  if (value.online && now - fetchedAt < 25000) return 'Đang hoạt động';
  const minutes = Math.max(0, Math.floor((now - Date.parse(value.seen_at)) / 60000));
  if (!minutes) return 'Vừa hoạt động';
  return minutes < 60 ? `Hoạt động ${minutes} phút trước` : minutes < 1440 ? `Hoạt động ${Math.floor(minutes / 60)} giờ trước` : 'Đã offline';
}
