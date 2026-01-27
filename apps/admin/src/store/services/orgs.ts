/**
 * Organizations API Slice
 */

import { api } from '../api';

export interface Org {
  orgId: string;
  name: string;
  type: 'agency' | 'broker' | 'direct';
  status: 'active' | 'inactive' | 'suspended';
  memberCount: number;
  leadCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface OrgMember {
  userId: string;
  email: string;
  name: string;
  role: 'owner' | 'admin' | 'member';
  joinedAt: string;
}

export interface OrgDetail extends Org {
  members: OrgMember[];
  description?: string;
  website?: string;
  contactEmail?: string;
}

export interface CreateOrgRequest {
  name: string;
  type: Org['type'];
  description?: string;
  website?: string;
  contactEmail?: string;
}

export interface UpdateOrgRequest {
  orgId: string;
  name?: string;
  type?: Org['type'];
  status?: Org['status'];
  description?: string;
  website?: string;
  contactEmail?: string;
}

export interface OrgListParams {
  search?: string;
  type?: Org['type'];
  status?: Org['status'];
  page?: number;
  pageSize?: number;
}

export interface OrgListResponse {
  orgs: Org[];
  total: number;
  nextToken?: string;
}

export interface AddMemberRequest {
  orgId: string;
  userId: string;
  role: OrgMember['role'];
}

export interface RemoveMemberRequest {
  orgId: string;
  userId: string;
}

export interface UpdateMemberRoleRequest {
  orgId: string;
  userId: string;
  role: OrgMember['role'];
}

export const orgsApi = api.injectEndpoints({
  endpoints: (builder) => ({
    listOrgs: builder.query<OrgListResponse, OrgListParams | void>({
      query: (params) => ({
        url: '/admin/orgs',
        params: params || {},
      }),
      providesTags: ['OrgList'],
    }),

    getOrg: builder.query<OrgDetail, string>({
      query: (orgId) => `/admin/orgs/${orgId}`,
      providesTags: (_result, _error, orgId) => [{ type: 'Org', id: orgId }],
    }),

    createOrg: builder.mutation<Org, CreateOrgRequest>({
      query: (body) => ({
        url: '/admin/orgs',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['OrgList'],
    }),

    updateOrg: builder.mutation<Org, UpdateOrgRequest>({
      query: ({ orgId, ...body }) => ({
        url: `/admin/orgs/${orgId}`,
        method: 'PUT',
        body,
      }),
      invalidatesTags: (_result, _error, { orgId }) => ['OrgList', { type: 'Org', id: orgId }],
    }),

    addOrgMember: builder.mutation<void, AddMemberRequest>({
      query: ({ orgId, ...body }) => ({
        url: `/admin/orgs/${orgId}/members`,
        method: 'POST',
        body,
      }),
      invalidatesTags: (_result, _error, { orgId }) => [{ type: 'Org', id: orgId }, 'OrgList'],
    }),

    removeOrgMember: builder.mutation<void, RemoveMemberRequest>({
      query: ({ orgId, userId }) => ({
        url: `/admin/orgs/${orgId}/members/${userId}`,
        method: 'DELETE',
      }),
      invalidatesTags: (_result, _error, { orgId }) => [{ type: 'Org', id: orgId }, 'OrgList'],
    }),

    updateMemberRole: builder.mutation<void, UpdateMemberRoleRequest>({
      query: ({ orgId, userId, role }) => ({
        url: `/admin/orgs/${orgId}/members/${userId}`,
        method: 'PUT',
        body: { role },
      }),
      invalidatesTags: (_result, _error, { orgId }) => [{ type: 'Org', id: orgId }],
    }),
  }),
});

export const {
  useListOrgsQuery,
  useGetOrgQuery,
  useCreateOrgMutation,
  useUpdateOrgMutation,
  useAddOrgMemberMutation,
  useRemoveOrgMemberMutation,
  useUpdateMemberRoleMutation,
} = orgsApi;
