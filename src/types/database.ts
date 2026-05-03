export type UserRole = "super_admin" | "director" | "parent" | "student";

export interface Profile {
  id: string;
  email: string;
  full_name: string;
  role: UserRole;
  school_id: string | null;
  phone: string | null;
  avatar_url: string | null;
  created_at: string;
}

export interface School {
  id: string;
  name: string;
  address: string | null;
  phone: string | null;
  logo_url: string | null;
  created_at: string;
}

export interface Student {
  id: string;
  school_id: string;
  full_name: string;
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
