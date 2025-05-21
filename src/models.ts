export interface Caregiver {
  id: string;
  name: string;
}

export type TaskType = 'fixed' | 'variable' | 'one-time';

export interface Task {
  id: string;
  name: string;
  type: TaskType;
  weekdays?: number[]; // 0=Sunday, 1=Monday, etc.
  date?: string; // for one-time tasks
}

export interface Resident {
  id: string;
  name: string;
  roomNo: string;
  caregivers: Caregiver[];
  tasks: Task[];
}

export interface Zone {
  id: string;
  name: string;
  residents: Resident[];
}

export interface Building {
  id: string;
  name: string;
  zones: Zone[];
} 