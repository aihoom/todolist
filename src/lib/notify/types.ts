export type NotifyPayload = {
  title: string;
  body: string;
  /** 点击后跳转路径，如 /workspace/xxx */
  url?: string;
  /** 事件类型，便于各通道格式化 */
  event?:
    | "todo.created"
    | "todo.completed"
    | "todo.due"
    | "todo.updated"
    | "test";
};

export type NotifyUser = {
  id: string;
  name: string;
  email: string;
  serverChanKey: string | null;
  notifyOnTodoCreate: boolean;
  notifyOnTodoComplete: boolean;
  notifyOnDueSoon: boolean;
};

export interface NotifyChannel {
  /** 通道标识，如 serverchan / webpush */
  id: string;
  name: string;
  /**
   * 向单个用户发送。通道内部决定是否真正发送（如无密钥则跳过）。
   */
  send(user: NotifyUser, payload: NotifyPayload): Promise<void>;
}
