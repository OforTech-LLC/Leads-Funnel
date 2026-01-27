/**
 * Users API Slice
 */

import { api } from '../api';

export interface User {
  userId: string;
  email: string;
  name: string;
  status: 'active' | 'inactive' | 'invited';
  orgIds: string[];
  orgNames: string[];
  leadCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface UserDetail extends User {
  phone?: string;
  role: 'admin' | 'user';
  lastLoginAt?: string;
  orgs: {
    orgId: string;
    orgName: string;
    role: 'owner' | 'admin' | 'member';
    joinedAt: string;
  }[];
}

export interface CreateUserRequest {
  name: string;
  email: string;
  phone?: string;
  role?: 'admin' | 'user';
  orgId?: string;
}

export interface UpdateUserRequest {
  userId: string;
  name?: string;
  email?: string;
  phone?: string;
  status?: User['status'];
  role?: 'admin' | 'user';
}

export interface UserListParams {
  search?: string;
  status?: User['status'];
  orgId?: string;
  page?: number;
  pageSize?: number;
}

export interface UserListResponse {
  users: User[];
  total: number;
  nextToken?: string;
}

export const usersApi = api.injectEndpoints({
  endpoints: (builder) => ({
    listUsers: builder.query<UserListResponse, UserListParams | void>({
      query: (params) => ({
        url: '/admin/users',
        params: params || {},
      }),
      providesTags: ['UserList'],
    }),

    getUser: builder.query<UserDetail, string>({
      query: (userId) => `/admin/users/${userId}`,
      providesTags: (_result, _error, userId) => [{ type: 'User', id: userId }],
    }),

    createUser: builder.mutation<User, CreateUserRequest>({
      query: (body) => ({
        url: '/admin/users',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['UserList'],
    }),

    updateUser: builder.mutation<User, UpdateUserRequest>({
      query: ({ userId, ...body }) => ({
        url: `/admin/users/${userId}`,
        method: 'PUT',
        body,
      }),
      invalidatesTags: (_result, _error, { userId }) => ['UserList', { type: 'User', id: userId }],
    }),
  }),
});

export const { useListUsersQuery, useGetUserQuery, useCreateUserMutation, useUpdateUserMutation } =
  usersApi;
