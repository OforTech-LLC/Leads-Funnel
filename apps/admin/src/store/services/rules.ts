/**
 * Assignment Rules API Slice
 */

import { api } from '../api';

export interface AssignmentRule {
  ruleId: string;
  name: string;
  priority: number;
  funnels: string[];
  zipCodes: string[];
  targetOrgId: string;
  targetOrgName: string;
  targetUserId?: string;
  targetUserName?: string;
  active: boolean;
  dailyCap?: number;
  monthlyCap?: number;
  currentDailyCount: number;
  currentMonthlyCount: number;
  matchedLeadsCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface RuleDetail extends AssignmentRule {
  description?: string;
  conditions: Record<string, unknown>;
}

export interface CreateRuleRequest {
  name: string;
  priority: number;
  funnels: string[];
  zipCodes: string[];
  targetOrgId: string;
  targetUserId?: string;
  active?: boolean;
  dailyCap?: number;
  monthlyCap?: number;
  description?: string;
}

export interface UpdateRuleRequest {
  ruleId: string;
  name?: string;
  priority?: number;
  funnels?: string[];
  zipCodes?: string[];
  targetOrgId?: string;
  targetUserId?: string;
  active?: boolean;
  dailyCap?: number;
  monthlyCap?: number;
  description?: string;
}

export interface RuleListParams {
  search?: string;
  active?: boolean;
  funnelId?: string;
  page?: number;
  pageSize?: number;
}

export interface RuleListResponse {
  rules: AssignmentRule[];
  total: number;
  nextToken?: string;
}

export interface TestRuleRequest {
  funnelId: string;
  zipCode: string;
}

export interface TestRuleResponse {
  matchedRule: AssignmentRule | null;
  evaluatedRules: {
    ruleId: string;
    name: string;
    matched: boolean;
    reason: string;
  }[];
}

export const rulesApi = api.injectEndpoints({
  endpoints: (builder) => ({
    listRules: builder.query<RuleListResponse, RuleListParams | void>({
      query: (params) => ({
        url: '/admin/rules',
        params: params || {},
      }),
      providesTags: ['RuleList'],
    }),

    getRule: builder.query<RuleDetail, string>({
      query: (ruleId) => `/admin/rules/${ruleId}`,
      providesTags: (_result, _error, ruleId) => [{ type: 'Rule', id: ruleId }],
    }),

    createRule: builder.mutation<AssignmentRule, CreateRuleRequest>({
      query: (body) => ({
        url: '/admin/rules',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['RuleList'],
    }),

    updateRule: builder.mutation<AssignmentRule, UpdateRuleRequest>({
      query: ({ ruleId, ...body }) => ({
        url: `/admin/rules/${ruleId}`,
        method: 'PUT',
        body,
      }),
      invalidatesTags: (_result, _error, { ruleId }) => ['RuleList', { type: 'Rule', id: ruleId }],
    }),

    deleteRule: builder.mutation<void, string>({
      query: (ruleId) => ({
        url: `/admin/rules/${ruleId}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['RuleList'],
    }),

    testRule: builder.mutation<TestRuleResponse, TestRuleRequest>({
      query: (body) => ({
        url: '/admin/rules/test',
        method: 'POST',
        body,
      }),
    }),
  }),
});

export const {
  useListRulesQuery,
  useGetRuleQuery,
  useCreateRuleMutation,
  useUpdateRuleMutation,
  useDeleteRuleMutation,
  useTestRuleMutation,
} = rulesApi;
