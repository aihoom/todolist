export type UserSummary = {
  id: string;
  name: string;
  email?: string;
  avatarUrl?: string | null;
  bio?: string | null;
};

export type TodoGroupItem = {
  id: string;
  name: string;
  workspaceId: string | null;
  ownerId: string;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
  _count?: { todos: number };
};

export type TodoItem = {
  id: string;
  title: string;
  description: string | null;
  completed: boolean;
  dueAt: string | null;
  dueNotified?: boolean;
  workspaceId: string | null;
  groupId: string | null;
  createdById: string;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
  createdBy: UserSummary;
  group?: { id: string; name: string } | null;
};

export type WorkspaceMember = {
  id: string;
  role: string;
  joinedAt: string;
  user: UserSummary;
};

export type WorkspaceSummary = {
  id: string;
  name: string;
  description: string | null;
  slug: string;
  inviteCode: string;
  ownerId: string;
  createdAt: string;
  updatedAt: string;
  owner: UserSummary;
  members: WorkspaceMember[];
  groups?: TodoGroupItem[];
  _count?: { todos: number };
  todos?: TodoItem[];
};

export type ProfileUser = {
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
  hasWebPush: boolean;
};
