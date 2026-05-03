export type UserRole = "super_admin" | "director" | "parent" | "student";

export interface Profile {
  id: string;
  email: string;
  full_name: string;
  role: UserRole;
  school_id: string | null;
  student_id: string | null;
  phone: string | null;
  avatar_url: string | null;
  created_at: string;
}

export interface StudentCode {
  id: string;
  code: string;
  student_id: string;
  school_id: string;
  expires_at: string | null;
  used_at: string | null;
  used_by: string | null;
  created_at: string;
}

export interface Homework {
  id: string;
  school_id: string;
  class_id: string;
  subject: string;
  title: string;
  description: string | null;
  due_date: string;
  created_by: string | null;
  created_at: string;
}

export interface SchoolFeatures {
  payments: boolean;
  messages: boolean;
  absences: boolean;
  schedule: boolean;
}

export interface School {
  id: string;
  name: string;
  address: string | null;
  phone: string | null;
  logo_url: string | null;
  features: SchoolFeatures;
  is_active: boolean;
  created_at: string;
}

export interface Class {
  id: string;
  school_id: string;
  name: string;
  level: string | null;
  created_at: string;
}

export interface Schedule {
  id: string;
  school_id: string;
  class_id: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  subject: string;
  teacher: string | null;
  room: string | null;
  created_at: string;
}

export interface Absence {
  id: string;
  school_id: string;
  student_id: string;
  date: string;
  reason: string | null;
  justified: boolean;
  created_at: string;
}

export interface Student {
  id: string;
  school_id: string;
  full_name: string;
  class_id: string | null;
  class_name: string | null;
  date_of_birth: string | null;
  parent_id: string | null;
  avatar_url: string | null;
  created_at: string;
}

export interface Payment {
  id: string;
  school_id: string;
  student_id: string;
  amount: number;
  status: "pending" | "paid" | "overdue";
  due_date: string;
  paid_at: string | null;
  description: string;
  created_at: string;
}

export interface Message {
  id: string;
  school_id: string;
  sender_id: string;
  recipient_id: string | null;
  subject: string;
  body: string;
  read_at: string | null;
  created_at: string;
}
