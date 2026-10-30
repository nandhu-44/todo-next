export type Priority = "low" | "medium" | "high";

export interface Todo {
  id: string;
  title: string;
  description: string;
  completed: boolean;
  priority: Priority;
  dueDate: string | null; // YYYY-MM-DD
  tags: string[];
  order: number;
  createdAt: string;
  /** last content edit (not reordering); used to settle sync conflicts */
  updatedAt: string;
  completedAt: string | null;
}

export interface PublicUser {
  id: string;
  name: string;
  email: string;
  hasPassword: boolean;
  google: boolean;
  totpEnabled: boolean;
  recoveryLeft: number;
}
