/**
 * User types for the Kanjona platform.
 * Users are individuals who belong to organizations and interact with leads.
 */

export type UserStatus = 'active' | 'inactive' | 'invited';

export interface User {
  userId: string;
  cognitoSub?: string;
  emailNormalized: string;
  phoneE164?: string;
  name: string;
  status: UserStatus;
  createdAt: string;
  lastUpdatedAt: string;
  deletedAt?: string;
}

export interface CreateUserInput {
  email: string;
  phone?: string;
  name: string;
  inviteToCognito?: boolean;
}

export interface UpdateUserInput {
  name?: string;
  phone?: string;
  status?: UserStatus;
}
