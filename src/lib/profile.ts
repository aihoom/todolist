import type { ProfileUser } from "./types";

export const profileSelect = {
  id: true,
  email: true,
  name: true,
  avatarUrl: true,
  bio: true,
  serverChanKey: true,
  notifyOnTodoCreate: true,
  notifyOnTodoComplete: true,
  notifyOnDueSoon: true,
  backgroundImageUrl: true,
  backgroundOverlay: true,
  customCss: true,
  customHtml: true,
  _count: { select: { pushSubscriptions: true } },
} as const;

export function toProfileUser(user: {
  id: string;
  email: string;
  name: string;
  avatarUrl: string | null;
  bio: string | null;
  serverChanKey: string | null;
  notifyOnTodoCreate: boolean;
  notifyOnTodoComplete: boolean;
  notifyOnDueSoon: boolean;
  backgroundImageUrl: string | null;
  backgroundOverlay: number;
  customCss: string | null;
  customHtml: string | null;
  _count: { pushSubscriptions: number };
}): ProfileUser {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    avatarUrl: user.avatarUrl,
    bio: user.bio,
    serverChanKey: user.serverChanKey,
    notifyOnTodoCreate: user.notifyOnTodoCreate,
    notifyOnTodoComplete: user.notifyOnTodoComplete,
    notifyOnDueSoon: user.notifyOnDueSoon,
    backgroundImageUrl: user.backgroundImageUrl,
    backgroundOverlay: user.backgroundOverlay,
    customCss: user.customCss,
    customHtml: user.customHtml,
    hasWebPush: user._count.pushSubscriptions > 0,
  };
}
