/**
 * Messaging Integration Types (Slack / Teams)
 *
 * Behind feature flags: slack_enabled / teams_enabled (OFF by default)
 */

// ---------------------------------------------------------------------------
// Provider Types
// ---------------------------------------------------------------------------

export type MessagingProvider = 'slack' | 'teams';

// ---------------------------------------------------------------------------
// Channel Configuration (stored in DynamoDB)
// ---------------------------------------------------------------------------

export interface ChannelConfig {
  pk: string; // MSGCONFIG#<orgId>
  sk: string; // PROVIDER#<provider>
  orgId: string;
  provider: MessagingProvider;
  webhookUrl: string;
  channelName?: string;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

// ---------------------------------------------------------------------------
// Message Payloads
// ---------------------------------------------------------------------------

export interface MessagePayload {
  text: string;
  metadata?: Record<string, unknown>;
}

// ---------------------------------------------------------------------------
// Slack Block Kit Types
// ---------------------------------------------------------------------------

export interface SlackBlock {
  type: string;
  text?: {
    type: string;
    text: string;
    emoji?: boolean;
  };
  fields?: Array<{
    type: string;
    text: string;
  }>;
  elements?: Array<{
    type: string;
    text?: {
      type: string;
      text: string;
    };
    url?: string;
    style?: string;
  }>;
}

export interface SlackMessage {
  text: string;
  blocks: SlackBlock[];
}

// ---------------------------------------------------------------------------
// Teams Adaptive Card Types
// ---------------------------------------------------------------------------

export interface TeamsAdaptiveCardBody {
  type: string;
  text?: string;
  weight?: string;
  size?: string;
  wrap?: boolean;
  separator?: boolean;
  columns?: Array<{
    type: string;
    width: string;
    items: TeamsAdaptiveCardBody[];
  }>;
  facts?: Array<{
    title: string;
    value: string;
  }>;
}

export interface TeamsAdaptiveCardAction {
  type: string;
  title: string;
  url?: string;
}

export interface TeamsMessage {
  type: string;
  attachments: Array<{
    contentType: string;
    content: {
      $schema: string;
      type: string;
      version: string;
      body: TeamsAdaptiveCardBody[];
      actions?: TeamsAdaptiveCardAction[];
    };
  }>;
}

// ---------------------------------------------------------------------------
// Lead reference for formatting
// ---------------------------------------------------------------------------

export interface LeadInfo {
  leadId: string;
  funnelId: string;
  name: string;
  email: string;
  phone?: string;
  status: string;
  createdAt: string;
  message?: string;
}
