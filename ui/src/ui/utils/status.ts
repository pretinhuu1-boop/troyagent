/**
 * B5: Shared status color/label utilities for missions and tasks.
 * Used by mission-board.ts, war-room.ts, and comando.ts.
 */

export type MissionStatus = "draft" | "discussing" | "approved" | "executing" | "completed" | "cancelled";
export type TaskStatus = "backlog" | "in-progress" | "review" | "completed" | "blocked";
export type Priority = "low" | "normal" | "high" | "urgent";

const MISSION_STATUS_COLORS: Record<MissionStatus, string> = {
  draft: "#95a5a6",
  discussing: "#f39c12",
  approved: "#3498db",
  executing: "#e67e22",
  completed: "#27ae60",
  cancelled: "#e74c3c",
};

const MISSION_STATUS_LABELS: Record<MissionStatus, string> = {
  draft: "Rascunho",
  discussing: "Discussão",
  approved: "Aprovado",
  executing: "Executando",
  completed: "Concluído",
  cancelled: "Cancelado",
};

const TASK_STATUS_COLORS: Record<TaskStatus, string> = {
  backlog: "#95a5a6",
  "in-progress": "#3498db",
  review: "#f39c12",
  completed: "#27ae60",
  blocked: "#e74c3c",
};

const PRIORITY_COLORS: Record<Priority, string> = {
  low: "#95a5a6",
  normal: "#3498db",
  high: "#f39c12",
  urgent: "#e74c3c",
};

export function statusColor(status: MissionStatus): string {
  return MISSION_STATUS_COLORS[status] || "#95a5a6";
}

export function statusLabel(status: MissionStatus): string {
  return MISSION_STATUS_LABELS[status] || status;
}

export function taskStatusColor(status: TaskStatus): string {
  return TASK_STATUS_COLORS[status] || "#95a5a6";
}

export function priorityColor(priority: Priority): string {
  return PRIORITY_COLORS[priority] || "#3498db";
}
