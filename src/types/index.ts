// src/types.ts

// 🔹 Roles
export type UserRole = "entrepreneur" | "investor" | "user";

// 🔹 Core User
export interface User {
  id: string;
  name: string;
  email: string;
  role?: UserRole;
  avatarUrl?: string;
  bio?: string;
  location?: string;
  website?: string;
  social?: {
    linkedin?: string;
    twitter?: string;
    instagram?: string;
  };
  isOnline?: boolean;
  createdAt: string;
  twoFactorEnabled?: boolean;
  emailVerified?: boolean;

  // 👇 Added for payments
  balance: number;
}

// 🔹 Entrepreneur Extension
export interface Entrepreneur extends User {
  role: "entrepreneur";
  startupName: string;
  pitchSummary: string;
  fundingNeeded: string;
  industry: string;
  location: string;
  foundedYear: number;
  teamSize: number;
  website?: string;
  social?: {
    linkedin?: string;
    twitter?: string;
    instagram?: string;
  };
}

// 🔹 Investor Extension
export interface Investor extends User {
  role: "investor";
  investmentInterests: string[];
  investmentStage: string[];
  portfolioCompanies: string[];
  totalInvestments: number;
  minimumInvestment: string;
  maximumInvestment: string;
  location?: string;
  website?: string;
  social?: {
    linkedin?: string;
    twitter?: string;
    instagram?: string;
  };
}

// 🔹 Messaging
export interface Message {
  id: string;
  senderId: string;
  receiverId: string;
  content: string;
  timestamp: string;
  isRead: boolean;
}

export interface ChatConversation {
  id: string;
  participants: string[];
  lastMessage?: Message;
  updatedAt: string;
}

// 🔹 Collaboration
export interface CollaborationRequest {
  id: string;
  investorId: string;
  entrepreneurId: string;
  message: string;
  status: "pending" | "accepted" | "rejected";
  createdAt: string;
}

// 🔹 Documents
export interface Document {
  id: string;
  name: string;
  type: string;
  size: string;
  lastModified: string;
  shared: boolean;
  url: string;
  ownerId: string;
}

// 🔹 Meetings
export interface Meeting {
  id: string;
  title: string;
  description?: string;
  startTime: string;
  endTime: string;
  location?: string;
  organizerId: string;
  participants: {
    userId: string;
    status: "pending" | "accepted" | "rejected" | "cancelled";
  }[];
  status?: "scheduled" | "cancelled" | "completed";
}

// 🔹 Auth Context
export interface AuthContextType {
  user: User | null;
  login: (
    email: string,
    password: string,
    role: UserRole
  ) => Promise<void>;
  register: (
    name: string,
    email: string,
    password: string,
    role: UserRole
  ) => Promise<void>;
  logout: () => void;
  forceLogout: () => void;
  forgotPassword: (email: string) => Promise<void>;
  resetPassword: (token: string, newPassword: string) => Promise<void>;

  updateProfile: (
    userId: string,
    updates: Partial<User>,
    extendedProfileData?: any
  ) => Promise<void>;

  getExtendedProfile?: () => Promise<any>;
  updateExtendedProfile?: (profileData: any) => Promise<any>;

  // ✅ This is what Deposit/Withdraw/Transfer will use
  updateUser: (user: User) => void;

  isAuthenticated: boolean;
  isLoading: boolean;
}
