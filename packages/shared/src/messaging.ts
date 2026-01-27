export const MESSAGING_PROVIDERS = ['slack', 'teams'] as const;
export type MessagingProvider = (typeof MESSAGING_PROVIDERS)[number];

export interface MessagingConfig {
  orgId: string;
  provider: MessagingProvider;
  webhookUrl: string;
  channelName?: string;
  active: boolean;
  createdAt: string;
}

export interface MessagingPayload {
  title: string;
  message: string;
  url?: string;
  fields?: { label: string; value: string }[];
}
