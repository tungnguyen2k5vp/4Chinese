import { messages, type SocialMessage } from './api';

/** Replay every missed page; a send acknowledgement must never advance this cursor. */
export async function catchUpMessages(peer: string, after: number | undefined, apply: (page: SocialMessage[], read: number) => void, active = () => true) {
  let through = after, page: Awaited<ReturnType<typeof messages>>, initialFull = false;
  do {
    page = await messages(peer, through === undefined ? {} : { after: through });
    const last = page.messages.at(-1)?.id;
    if (last !== undefined && through !== undefined && (last <= through || page.messages.some(m => m.id <= through!))) throw new Error('SOCIAL_INVALID_INPUT');
    if (through === undefined) initialFull = page.messages.length === 50;
    apply(page.messages, page.read);
    through = last ?? through;
  } while (after !== undefined && page.messages.length === 50 && active());
  return { through, initialFull };
}
