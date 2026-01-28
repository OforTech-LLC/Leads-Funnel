/**
 * @kanjona/shared
 * Shared types and utilities for the Kanjona lead generation platform
 */

// =============================================================================
// Platform Types (3-sided marketplace)
// =============================================================================

export { OrgTypeEnum, OrgStatusEnum, LeadVisibilityPolicyEnum } from './types/org';
export type {
  OrgType,
  OrgStatus,
  LeadVisibilityPolicy,
  Org,
  CreateOrgInput,
  UpdateOrgInput,
} from './types/org';

export { UserStatusEnum } from './types/user';
export type { UserStatus, User, CreateUserInput, UpdateUserInput } from './types/user';

export { MembershipRoleEnum } from './types/membership';
export type {
  MembershipRole,
  Membership,
  AddMemberInput,
  UpdateMemberInput,
} from './types/membership';

export type {
  TargetType,
  AssignmentRule,
  CreateRuleInput,
  UpdateRuleInput,
  RuleTestInput,
  RuleTestResult,
} from './types/assignment-rule';

export {
  NotificationChannelEnum,
  NotificationStatusEnum,
  NotificationTargetTypeEnum,
} from './types/notification';
export type {
  NotificationChannel,
  NotificationStatus,
  NotificationTargetType,
  Notification,
} from './types/notification';

// Re-export new lead types with "Platform" prefix to avoid collision with
// the original Lead interface (which represents form-submission data).
export { PipelineStatusEnum } from './types/lead';
export type {
  PipelineStatus,
  Lead as PlatformLead,
  LeadNotificationInfo,
  UpdateLeadInput,
  ReassignLeadInput,
} from './types/lead';

export { ExportFormatEnum, ExportStatusEnum } from './types/export';
export type { ExportFormat, ExportStatus, ExportJob, CreateExportInput } from './types/export';

export type { AuditEntry } from './types/audit';

export type { PaginationRequest, PaginationResponse, PaginatedResult } from './types/pagination';

export { ApiErrorCodes } from './types/api';
export type { ErrorCode, ApiErrorCode, ApiErrorResponse, ApiSuccessResponse } from './types/api';

export type { LeadCreatedEvent, LeadAssignedEvent, LeadUnassignedEvent } from './types/events';

// =============================================================================
// Feature Flags
// =============================================================================

export { FEATURE_FLAGS, FEATURE_FLAG_DEFAULTS } from './feature-flags';
export type { FeatureFlag } from './feature-flags';

/**
 * Alias for FEATURE_FLAGS to match the FeatureFlagNames convention.
 * Prefer using `FeatureFlagNames.BILLING_ENABLED` for enum-style access.
 */
export { FEATURE_FLAGS as FeatureFlagNames } from './feature-flags';

// =============================================================================
// Lead Scoring
// =============================================================================

export { qualityFromScore } from './scoring';
export type { LeadScore, ScoreBreakdown, LeadQuality } from './scoring';

// =============================================================================
// Analytics
// =============================================================================

export type {
  OverviewMetrics,
  TrendPoint,
  FunnelMetric,
  OrgMetric,
  ConversionFunnel,
  ConversionStage,
  SourceMetric,
  DateRangePreset,
  DateRange,
} from './analytics';

// =============================================================================
// Webhooks
// =============================================================================

export { WEBHOOK_EVENTS, WebhookEventEnum } from './webhooks';
export type { WebhookEventType, WebhookConfig, WebhookDelivery } from './webhooks';

// =============================================================================
// Billing
// =============================================================================

export { BILLING_PLANS, PLAN_LIMITS } from './billing';
export type { BillingPlan, BillingAccount, UsageRecord } from './billing';

// =============================================================================
// Calendar
// =============================================================================

export { CALENDAR_PROVIDERS } from './calendar';
export type { CalendarProvider, CalendarConfig, TimeSlot, CalendarEvent } from './calendar';

// =============================================================================
// Messaging
// =============================================================================

export { MESSAGING_PROVIDERS } from './messaging';
export type { MessagingProvider, MessagingConfig, MessagingPayload } from './messaging';

// =============================================================================
// App Notifications & Preferences
// =============================================================================

export { NOTIFICATION_TYPES, NotificationTypeEnum, DigestFrequencyEnum } from './notifications';
export type {
  NotificationType,
  DigestFrequency,
  AppNotification,
  NotificationPreferences,
} from './notifications';

// =============================================================================
// Lead Status State Machine
// =============================================================================

export {
  VALID_STATUS_TRANSITIONS,
  isValidTransition,
  getAvailableTransitions,
} from './state-machine';

// =============================================================================
// Constants
// =============================================================================

export { PAGINATION, RATE_LIMITS, CACHE_TTL, DATA_RETENTION } from './constants';

// =============================================================================
// Unified Lead Status
// =============================================================================

/**
 * All possible lead statuses across the platform.
 *
 * Used by admin, portal, and web apps. Individual apps may only display
 * a subset of these statuses depending on their context.
 *
 * - new:         Lead just submitted
 * - assigned:    Lead assigned to an org/agent
 * - unassigned:  No matching rule found
 * - contacted:   Outreach made
 * - qualified:   Lead vetted and viable
 * - booked:      Appointment or meeting booked
 * - converted:   Lead became a customer
 * - won:         Deal closed successfully
 * - lost:        Lead did not convert
 * - dnc:         Do not contact
 * - quarantined: Flagged for review (spam, duplicate, etc.)
 */
export const LEAD_STATUSES = [
  'new',
  'assigned',
  'unassigned',
  'contacted',
  'qualified',
  'booked',
  'converted',
  'won',
  'lost',
  'dnc',
  'quarantined',
] as const;

export type LeadStatus = (typeof LEAD_STATUSES)[number];

/**
 * Const enum-like object for lead statuses.
 * Use `LeadStatusEnum.NEW` instead of hardcoding `'new'`.
 */
export const LeadStatusEnum = {
  NEW: 'new',
  ASSIGNED: 'assigned',
  UNASSIGNED: 'unassigned',
  CONTACTED: 'contacted',
  QUALIFIED: 'qualified',
  BOOKED: 'booked',
  CONVERTED: 'converted',
  WON: 'won',
  LOST: 'lost',
  DNC: 'dnc',
  QUARANTINED: 'quarantined',
} as const satisfies Record<string, LeadStatus>;

/**
 * Admin pipeline stages (separate from lead status).
 * These represent internal workflow steps.
 */
export const ADMIN_PIPELINE_STATUSES = [
  'none',
  'nurturing',
  'negotiating',
  'closing',
  'closed_won',
  'closed_lost',
] as const;

export type AdminPipelineStatus = (typeof ADMIN_PIPELINE_STATUSES)[number];

/**
 * Const enum-like object for admin pipeline statuses.
 * Use `AdminPipelineStatusEnum.NURTURING` instead of hardcoding `'nurturing'`.
 */
export const AdminPipelineStatusEnum = {
  NONE: 'none',
  NURTURING: 'nurturing',
  NEGOTIATING: 'negotiating',
  CLOSING: 'closing',
  CLOSED_WON: 'closed_won',
  CLOSED_LOST: 'closed_lost',
} as const satisfies Record<string, AdminPipelineStatus>;

/**
 * Supported export file formats.
 */
export const EXPORT_FORMATS = ['csv', 'xlsx', 'pdf', 'docx', 'json'] as const;

export type ExportFormatValue = (typeof EXPORT_FORMATS)[number];

// =============================================================================
// Funnel Category Enum
// =============================================================================

/**
 * Const enum-like object for funnel categories.
 * Use `FunnelCategoryEnum.CORE` instead of hardcoding `'core'`.
 */
export const FunnelCategoryEnum = {
  CORE: 'core',
  HOME_SERVICES: 'home-services',
  HEALTH: 'health',
  LEGAL: 'legal',
  BUSINESS: 'business',
  AUTO: 'auto',
  EDUCATION: 'education',
  EVENTS: 'events',
} as const satisfies Record<string, FunnelCategory>;

// =============================================================================
// Consent Source Enum
// =============================================================================

/**
 * Const enum-like object for consent sources.
 * Use `ConsentSourceEnum.FORM` instead of hardcoding `'form'`.
 */
export const ConsentSourceEnum = {
  FORM: 'form',
  API: 'api',
  IMPORT: 'import',
  MANUAL: 'manual',
} as const;

export type ConsentSource = (typeof ConsentSourceEnum)[keyof typeof ConsentSourceEnum];

// =============================================================================
// Health Status Enums
// =============================================================================

/**
 * Const enum-like object for health check statuses.
 * Use `HealthStatusEnum.HEALTHY` instead of hardcoding `'healthy'`.
 */
export const HealthStatusEnum = {
  HEALTHY: 'healthy',
  DEGRADED: 'degraded',
  UNHEALTHY: 'unhealthy',
} as const;

export type HealthStatus = (typeof HealthStatusEnum)[keyof typeof HealthStatusEnum];

/**
 * Const enum-like object for individual service statuses.
 * Use `ServiceStatusEnum.UP` instead of hardcoding `'up'`.
 */
export const ServiceStatusEnum = {
  UP: 'up',
  DOWN: 'down',
} as const;

export type ServiceStatus = (typeof ServiceStatusEnum)[keyof typeof ServiceStatusEnum];

// =============================================================================
// UTM Parameters
// =============================================================================

/**
 * UTM tracking parameters
 */
export interface LeadUtm {
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  utm_term?: string;
  utm_content?: string;
}

// =============================================================================
// Address Types
// =============================================================================

/**
 * Full address information for service location
 * Used by home services, auto services, and business services
 */
export interface LeadAddress {
  /** Street address line 1 */
  street?: string;
  /** Street address line 2 (apt, suite, unit) */
  street2?: string;
  /** City name */
  city?: string;
  /** State/Province (2-letter code preferred for US) */
  state?: string;
  /** ZIP/Postal code - critical for service area matching */
  zipCode?: string;
  /** Country (ISO 3166-1 alpha-2 code, defaults to US) */
  country?: string;
  /** County/Parish (useful for some services) */
  county?: string;
  /** Latitude for precise location services */
  latitude?: number;
  /** Longitude for precise location services */
  longitude?: number;
}

// =============================================================================
// Property Types (Home Services)
// =============================================================================

/**
 * Property type enumeration
 */
export const PropertyTypeEnum = {
  SINGLE_FAMILY: 'single_family',
  MULTI_FAMILY: 'multi_family',
  CONDO: 'condo',
  TOWNHOUSE: 'townhouse',
  APARTMENT: 'apartment',
  MOBILE_HOME: 'mobile_home',
  COMMERCIAL: 'commercial',
  INDUSTRIAL: 'industrial',
  LAND: 'land',
  OTHER: 'other',
} as const;

export type PropertyType = (typeof PropertyTypeEnum)[keyof typeof PropertyTypeEnum];

/**
 * Roof type enumeration (for roofing services)
 */
export const RoofTypeEnum = {
  ASPHALT_SHINGLE: 'asphalt_shingle',
  METAL: 'metal',
  TILE: 'tile',
  SLATE: 'slate',
  WOOD_SHAKE: 'wood_shake',
  FLAT: 'flat',
  TPO: 'tpo',
  EPDM: 'epdm',
  BUILT_UP: 'built_up',
  UNKNOWN: 'unknown',
} as const;

export type RoofType = (typeof RoofTypeEnum)[keyof typeof RoofTypeEnum];

/**
 * HVAC system type enumeration
 */
export const HvacTypeEnum = {
  CENTRAL_AC: 'central_ac',
  HEAT_PUMP: 'heat_pump',
  FURNACE: 'furnace',
  BOILER: 'boiler',
  DUCTLESS_MINI_SPLIT: 'ductless_mini_split',
  WINDOW_UNIT: 'window_unit',
  GEOTHERMAL: 'geothermal',
  RADIANT: 'radiant',
  UNKNOWN: 'unknown',
} as const;

export type HvacType = (typeof HvacTypeEnum)[keyof typeof HvacTypeEnum];

/**
 * Pool type enumeration (for pool services)
 */
export const PoolTypeEnum = {
  INGROUND: 'inground',
  ABOVE_GROUND: 'above_ground',
  INFINITY: 'infinity',
  LAP: 'lap',
  NATURAL: 'natural',
  HOT_TUB: 'hot_tub',
  NONE: 'none',
} as const;

export type PoolType = (typeof PoolTypeEnum)[keyof typeof PoolTypeEnum];

/**
 * Property information for home service leads
 * Used by: roofing, hvac, plumbing, electrician, cleaning, etc.
 */
export interface LeadProperty {
  /** Type of property */
  propertyType?: PropertyType;
  /** Square footage of property */
  squareFootage?: number;
  /** Year the property was built */
  yearBuilt?: number;
  /** Number of stories/floors */
  stories?: number;
  /** Number of bedrooms */
  bedrooms?: number;
  /** Number of bathrooms */
  bathrooms?: number;
  /** Lot size in square feet */
  lotSize?: number;
  /** Whether the lead owns or rents */
  ownershipStatus?: 'owner' | 'renter' | 'property_manager' | 'other';
  /** How long they've owned/lived at property */
  yearsAtProperty?: number;

  // Roofing-specific
  /** Type of roof */
  roofType?: RoofType;
  /** Age of roof in years */
  roofAge?: number;
  /** Roof square footage (may differ from home) */
  roofSquareFootage?: number;
  /** Number of roof layers */
  roofLayers?: number;
  /** Has the roof been inspected recently? */
  recentRoofInspection?: boolean;

  // HVAC-specific
  /** Type of HVAC system */
  hvacType?: HvacType;
  /** Age of HVAC system in years */
  hvacAge?: number;
  /** HVAC brand if known */
  hvacBrand?: string;
  /** HVAC model if known */
  hvacModel?: string;
  /** Last service date */
  hvacLastService?: string;

  // Pool-specific
  /** Type of pool */
  poolType?: PoolType;
  /** Pool size in gallons */
  poolSize?: number;
  /** Does the pool have a heater? */
  poolHeated?: boolean;

  // Solar-specific
  /** Does the property already have solar? */
  hasSolar?: boolean;
  /** Average monthly electric bill */
  averageElectricBill?: number;
  /** Electric utility provider */
  electricProvider?: string;
  /** Roof orientation for solar (south-facing is ideal) */
  roofOrientation?: 'north' | 'south' | 'east' | 'west' | 'flat' | 'unknown';

  // General home details
  /** Type of foundation */
  foundationType?: 'slab' | 'crawlspace' | 'basement' | 'pier' | 'unknown';
  /** Type of siding/exterior */
  exteriorType?: string;
  /** Has HOA restrictions? */
  hasHoa?: boolean;
  /** HOA name if applicable */
  hoaName?: string;
}

// =============================================================================
// Vehicle Types (Auto Services)
// =============================================================================

/**
 * Vehicle information for auto service leads
 * Used by: auto-repair, auto-detailing, towing, auto-glass
 */
export interface LeadVehicle {
  /** Vehicle make (e.g., Toyota, Ford) */
  make?: string;
  /** Vehicle model (e.g., Camry, F-150) */
  model?: string;
  /** Model year */
  year?: number;
  /** Vehicle Identification Number */
  vin?: string;
  /** Current mileage */
  mileage?: number;
  /** License plate number */
  licensePlate?: string;
  /** License plate state */
  licensePlateState?: string;
  /** Exterior color */
  color?: string;
  /** Vehicle type */
  vehicleType?:
    | 'sedan'
    | 'suv'
    | 'truck'
    | 'van'
    | 'coupe'
    | 'convertible'
    | 'wagon'
    | 'motorcycle'
    | 'rv'
    | 'commercial'
    | 'other';
  /** Transmission type */
  transmission?: 'automatic' | 'manual' | 'cvt';
  /** Fuel type */
  fuelType?: 'gasoline' | 'diesel' | 'electric' | 'hybrid' | 'plugin_hybrid' | 'other';
  /** Is the vehicle drivable? (for towing/repair) */
  isDrivable?: boolean;
  /** Current location if different from address (for towing) */
  currentLocation?: string;
  /** Towing destination if applicable */
  towDestination?: string;
  /** Insurance company */
  insuranceCompany?: string;
  /** Insurance policy number */
  insurancePolicyNumber?: string;
  /** Insurance claim number if applicable */
  insuranceClaimNumber?: string;
}

// =============================================================================
// Business Types (B2B Services)
// =============================================================================

/**
 * Business size enumeration
 */
export const BusinessSizeEnum = {
  SOLE_PROPRIETOR: 'sole_proprietor',
  SMALL_1_10: 'small_1_10',
  SMALL_11_50: 'small_11_50',
  MEDIUM_51_200: 'medium_51_200',
  MEDIUM_201_500: 'medium_201_500',
  LARGE_501_1000: 'large_501_1000',
  ENTERPRISE_1000_PLUS: 'enterprise_1000_plus',
} as const;

export type BusinessSize = (typeof BusinessSizeEnum)[keyof typeof BusinessSizeEnum];

/**
 * Business entity type enumeration
 */
export const BusinessEntityTypeEnum = {
  SOLE_PROPRIETORSHIP: 'sole_proprietorship',
  LLC: 'llc',
  CORPORATION: 'corporation',
  S_CORP: 's_corp',
  PARTNERSHIP: 'partnership',
  NONPROFIT: 'nonprofit',
  OTHER: 'other',
} as const;

export type BusinessEntityType =
  (typeof BusinessEntityTypeEnum)[keyof typeof BusinessEntityTypeEnum];

/**
 * Business information for B2B service leads
 * Used by: commercial-cleaning, it-services, marketing-agency, business-consulting, security-systems
 */
export interface LeadBusiness {
  /** Company/Business name */
  companyName?: string;
  /** Business entity type */
  entityType?: BusinessEntityType;
  /** Industry/sector */
  industry?: string;
  /** Number of employees */
  employeeCount?: number;
  /** Business size category */
  businessSize?: BusinessSize;
  /** Annual revenue range */
  annualRevenue?: string;
  /** Years in business */
  yearsInBusiness?: number;
  /** Website URL */
  website?: string;
  /** Job title of the contact */
  contactTitle?: string;
  /** Department of the contact */
  contactDepartment?: string;
  /** Decision maker? */
  isDecisionMaker?: boolean;
  /** EIN/Tax ID (for tax services) */
  taxId?: string;
  /** Number of locations */
  locationCount?: number;
  /** Square footage of facility (for commercial cleaning) */
  facilitySquareFootage?: number;
  /** Type of facility */
  facilityType?: string;
  /** Current service provider (competitor) */
  currentProvider?: string;
  /** Contract end date with current provider */
  contractEndDate?: string;
}

// =============================================================================
// Healthcare Types
// =============================================================================

/**
 * Healthcare/medical information for healthcare service leads
 * Used by: dentist, plastic-surgeon, orthodontist, dermatology, medspa, chiropractic, physical-therapy, hair-transplant, cosmetic-dentistry
 */
export interface LeadHealthcare {
  /** Date of birth (for age verification, insurance) */
  dateOfBirth?: string;
  /** Gender (for relevant treatments) */
  gender?: 'male' | 'female' | 'non_binary' | 'prefer_not_to_say';
  /** Primary concern/condition */
  primaryConcern?: string;
  /** How long has the issue been present? */
  conditionDuration?: string;
  /** Previous treatments tried */
  previousTreatments?: string;
  /** Current medications */
  currentMedications?: string;
  /** Known allergies */
  allergies?: string;
  /** Insurance provider name */
  insuranceProvider?: string;
  /** Insurance member ID */
  insuranceMemberId?: string;
  /** Insurance group number */
  insuranceGroupNumber?: string;
  /** Is this for self or dependent? */
  patientRelationship?: 'self' | 'spouse' | 'child' | 'parent' | 'other';
  /** Dependent/patient name if not self */
  patientName?: string;
  /** Dependent/patient date of birth if not self */
  patientDateOfBirth?: string;
  /** Current dentist/doctor name */
  currentProviderName?: string;
  /** Reason for switching providers */
  switchReason?: string;
  /** Has had consultation before for this? */
  previousConsultation?: boolean;
  /** Procedure(s) of interest */
  proceduresOfInterest?: string[];
  /** Cosmetic vs medical need */
  treatmentType?: 'cosmetic' | 'medical' | 'both';
  /** Financing needed? */
  needsFinancing?: boolean;
}

// =============================================================================
// Legal Types
// =============================================================================

/**
 * Case type enumeration for legal services
 */
export const LegalCaseTypeEnum = {
  // Personal Injury
  AUTO_ACCIDENT: 'auto_accident',
  TRUCK_ACCIDENT: 'truck_accident',
  MOTORCYCLE_ACCIDENT: 'motorcycle_accident',
  SLIP_AND_FALL: 'slip_and_fall',
  MEDICAL_MALPRACTICE: 'medical_malpractice',
  PRODUCT_LIABILITY: 'product_liability',
  WORKPLACE_INJURY: 'workplace_injury',
  WRONGFUL_DEATH: 'wrongful_death',
  // Criminal Defense
  DUI_DWI: 'dui_dwi',
  DRUG_CHARGES: 'drug_charges',
  ASSAULT: 'assault',
  THEFT: 'theft',
  DOMESTIC_VIOLENCE: 'domestic_violence',
  WHITE_COLLAR: 'white_collar',
  FEDERAL_CRIME: 'federal_crime',
  // Immigration
  GREEN_CARD: 'green_card',
  CITIZENSHIP: 'citizenship',
  VISA: 'visa',
  DEPORTATION_DEFENSE: 'deportation_defense',
  ASYLUM: 'asylum',
  WORK_PERMIT: 'work_permit',
  FAMILY_IMMIGRATION: 'family_immigration',
  // Other
  OTHER: 'other',
} as const;

export type LegalCaseType = (typeof LegalCaseTypeEnum)[keyof typeof LegalCaseTypeEnum];

/**
 * Legal case information for legal service leads
 * Used by: personal-injury-attorney, immigration-attorney, criminal-defense-attorney
 */
export interface LeadLegal {
  /** Type of legal case */
  caseType?: LegalCaseType;
  /** Date of incident/issue */
  incidentDate?: string;
  /** Location of incident */
  incidentLocation?: string;
  /** Description of incident/case */
  caseDescription?: string;
  /** Have they filed a police report? */
  policeReportFiled?: boolean;
  /** Police report number */
  policeReportNumber?: string;
  /** Have they sought medical treatment? (injury cases) */
  medicalTreatmentSought?: boolean;
  /** Are they currently represented? */
  hasExistingAttorney?: boolean;
  /** Statute of limitations concern? */
  statuteOfLimitationsConcern?: boolean;
  /** Court date if applicable */
  courtDate?: string;
  /** Jurisdiction/court */
  jurisdiction?: string;
  /** Bail amount if applicable */
  bailAmount?: number;
  /** Currently in custody? */
  inCustody?: boolean;
  /** Immigration status (for immigration cases) */
  immigrationStatus?: string;
  /** Country of origin (for immigration) */
  countryOfOrigin?: string;
  /** Visa type if applicable */
  visaType?: string;
  /** Visa expiration date */
  visaExpirationDate?: string;
  /** At fault party (for injury cases) */
  atFaultParty?: string;
  /** At fault party insurance */
  atFaultInsurance?: string;
  /** Estimated damages/losses */
  estimatedDamages?: string;
  /** Injuries sustained */
  injuriesDescription?: string;
  /** Witnesses available? */
  hasWitnesses?: boolean;
  /** Evidence/documentation available? */
  hasDocumentation?: boolean;
}

// =============================================================================
// Financial/Insurance Types
// =============================================================================

/**
 * Financial information for insurance and financial service leads
 * Used by: life-insurance, tax-accounting
 */
export interface LeadFinancial {
  /** Annual household income range */
  annualIncome?: string;
  /** Employment status */
  employmentStatus?: 'employed' | 'self_employed' | 'unemployed' | 'retired' | 'student' | 'other';
  /** Employer name */
  employerName?: string;
  /** Marital status */
  maritalStatus?: 'single' | 'married' | 'divorced' | 'widowed' | 'domestic_partnership';
  /** Number of dependents */
  numberOfDependents?: number;
  /** Smoker status (for life insurance) */
  smokerStatus?: 'never' | 'former' | 'current';
  /** Health conditions (for life insurance) */
  healthConditions?: string;
  /** Coverage amount desired */
  desiredCoverage?: string;
  /** Current coverage amount if any */
  currentCoverage?: string;
  /** Current provider */
  currentProvider?: string;
  /** Tax filing status */
  taxFilingStatus?: 'single' | 'married_joint' | 'married_separate' | 'head_of_household' | 'widow';
  /** Business owner? */
  isBusinessOwner?: boolean;
  /** Has rental property? */
  hasRentalProperty?: boolean;
  /** Has investments? */
  hasInvestments?: boolean;
  /** Needs audit representation? (tax) */
  needsAuditHelp?: boolean;
  /** Tax year(s) needing help */
  taxYears?: string;
}

// =============================================================================
// Project/Service Request Types
// =============================================================================

/**
 * Urgency level enumeration
 */
export const UrgencyLevelEnum = {
  EMERGENCY: 'emergency',
  URGENT: 'urgent',
  WITHIN_WEEK: 'within_week',
  WITHIN_MONTH: 'within_month',
  FLEXIBLE: 'flexible',
  JUST_RESEARCHING: 'just_researching',
} as const;

export type UrgencyLevel = (typeof UrgencyLevelEnum)[keyof typeof UrgencyLevelEnum];

/**
 * Budget range enumeration
 */
export const BudgetRangeEnum = {
  UNDER_500: 'under_500',
  RANGE_500_1000: '500_1000',
  RANGE_1000_2500: '1000_2500',
  RANGE_2500_5000: '2500_5000',
  RANGE_5000_10000: '5000_10000',
  RANGE_10000_25000: '10000_25000',
  RANGE_25000_50000: '25000_50000',
  RANGE_50000_100000: '50000_100000',
  OVER_100000: 'over_100000',
  NOT_SURE: 'not_sure',
  FLEXIBLE: 'flexible',
} as const;

export type BudgetRange = (typeof BudgetRangeEnum)[keyof typeof BudgetRangeEnum];

/**
 * Project/service request details
 * Universal across all service types
 */
export interface LeadProject {
  /** How urgent is the need? */
  urgency?: UrgencyLevel;
  /** Budget range */
  budgetRange?: BudgetRange;
  /** Specific budget amount if known */
  budgetAmount?: number;
  /** Preferred start date */
  preferredStartDate?: string;
  /** Project deadline if any */
  deadline?: string;
  /** Detailed project/service description */
  projectDescription?: string;
  /** Current issues or problems to solve */
  currentIssues?: string;
  /** Specific services requested */
  servicesRequested?: string[];
  /** How did they hear about us? */
  howHeardAboutUs?: string;
  /** Have they gotten other quotes? */
  hasOtherQuotes?: boolean;
  /** Number of other quotes received */
  numberOfQuotes?: number;
  /** Are they comparing providers? */
  comparingProviders?: boolean;
  /** Decision timeline */
  decisionTimeline?: string;
  /** Who else is involved in decision? */
  otherDecisionMakers?: string;
  /** Special requirements or requests */
  specialRequirements?: string;
  /** Accessibility needs */
  accessibilityNeeds?: string;
  /** Preferred language for service */
  preferredLanguage?: string;
}

// =============================================================================
// Contact Preferences Types
// =============================================================================

/**
 * Contact method enumeration
 */
export const ContactMethodEnum = {
  PHONE_CALL: 'phone_call',
  TEXT_SMS: 'text_sms',
  EMAIL: 'email',
  WHATSAPP: 'whatsapp',
  VIDEO_CALL: 'video_call',
  IN_PERSON: 'in_person',
  NO_PREFERENCE: 'no_preference',
} as const;

export type ContactMethod = (typeof ContactMethodEnum)[keyof typeof ContactMethodEnum];

/**
 * Time of day preference enumeration
 */
export const TimePreferenceEnum = {
  EARLY_MORNING: 'early_morning',
  MORNING: 'morning',
  AFTERNOON: 'afternoon',
  EVENING: 'evening',
  ANYTIME: 'anytime',
} as const;

export type TimePreference = (typeof TimePreferenceEnum)[keyof typeof TimePreferenceEnum];

/**
 * Contact preferences for the lead
 */
export interface LeadContactPreferences {
  /** Preferred method of contact */
  preferredContactMethod?: ContactMethod;
  /** Best time to call */
  bestTimeToCall?: TimePreference;
  /** Specific time window (e.g., "2pm-4pm") */
  specificTimeWindow?: string;
  /** Best days to contact */
  bestDaysToContact?: (
    | 'monday'
    | 'tuesday'
    | 'wednesday'
    | 'thursday'
    | 'friday'
    | 'saturday'
    | 'sunday'
  )[];
  /** Timezone */
  timezone?: string;
  /** Alternate phone number */
  alternatePhone?: string;
  /** Alternate email */
  alternateEmail?: string;
  /** OK to leave voicemail? */
  okToLeaveVoicemail?: boolean;
  /** OK to send text messages? */
  okToText?: boolean;
  /** Do not contact before (time) */
  doNotContactBefore?: string;
  /** Do not contact after (time) */
  doNotContactAfter?: string;
  /** Language preference */
  languagePreference?: string;
  /** Has interpreter needs? */
  needsInterpreter?: boolean;
}

// =============================================================================
// Scheduling Types
// =============================================================================

/**
 * Scheduling/appointment preferences
 */
export interface LeadScheduling {
  /** Preferred appointment date */
  preferredDate?: string;
  /** Preferred appointment time */
  preferredTime?: string;
  /** Alternative date 1 */
  alternativeDate1?: string;
  /** Alternative time 1 */
  alternativeTime1?: string;
  /** Alternative date 2 */
  alternativeDate2?: string;
  /** Alternative time 2 */
  alternativeTime2?: string;
  /** Appointment type */
  appointmentType?: 'consultation' | 'estimate' | 'service' | 'follow_up' | 'other';
  /** Estimated duration needed */
  estimatedDuration?: string;
  /** Virtual/remote option preferred? */
  prefersVirtual?: boolean;
  /** On-site visit required? */
  requiresOnsiteVisit?: boolean;
  /** Special scheduling notes */
  schedulingNotes?: string;
}

// =============================================================================
// Consent Types (GDPR/CCPA Compliance)
// =============================================================================

/**
 * Consent tracking for GDPR/CCPA compliance
 */
export interface LeadConsent {
  /** Whether user accepted the privacy policy */
  privacyAccepted: boolean;
  /** Whether user consented to marketing communications */
  marketingConsent: boolean;
  /** ISO 8601 timestamp when consent was given */
  consentTimestamp: string;
  /** IP address hash at time of consent (for audit) */
  consentIpHash?: string;
  /** Version of privacy policy accepted */
  privacyPolicyVersion?: string;
  /** Version of terms of service accepted */
  termsVersion?: string;
  /** Source of consent (form, api, import) */
  consentSource?: ConsentSource;
}

/**
 * Consent update record for audit trail
 */
export interface ConsentUpdate {
  /** ISO 8601 timestamp of update */
  timestamp: string;
  /** Previous consent state */
  previousState: Partial<LeadConsent>;
  /** New consent state */
  newState: Partial<LeadConsent>;
  /** Who/what made the update */
  updatedBy: string;
  /** Reason for update */
  reason?: string;
}

// =============================================================================
// Lead Types
// =============================================================================

/**
 * Lead input data from form submission (basic fields)
 */
export interface LeadInput {
  name: string;
  email: string;
  phone?: string;
  notes?: string;
}

/**
 * Lead metadata for tracking
 */
export interface LeadMetadata {
  pageUrl?: string;
  referrer?: string;
  userAgent?: string;
  ipHash?: string;
  timestamp?: string;
  /** Device type detected */
  deviceType?: 'desktop' | 'mobile' | 'tablet';
  /** Browser name */
  browser?: string;
  /** Operating system */
  operatingSystem?: string;
  /** Screen resolution */
  screenResolution?: string;
  /** Session ID for tracking */
  sessionId?: string;
  /** Landing page variant (for A/B testing) */
  pageVariant?: string;
  /** Form ID if multiple forms on page */
  formId?: string;
  /** Time spent on page before submission (seconds) */
  timeOnPage?: number;
  /** Number of page visits before conversion */
  pageViews?: number;
  /** Conversion path */
  conversionPath?: string[];
}

/**
 * API request payload for lead submission
 * Comprehensive schema supporting all funnel types
 */
export interface LeadRequestPayload {
  // ==========================================================================
  // Core Fields (Required)
  // ==========================================================================
  /** Funnel/service identifier */
  funnelId?: string;
  /** Full name */
  name: string;
  /** Email address */
  email: string;

  // ==========================================================================
  // Basic Contact Fields (Optional)
  // ==========================================================================
  /** Primary phone number */
  phone?: string;
  /** Message/notes/special request */
  notes?: string;
  /** First name (if collected separately) */
  firstName?: string;
  /** Last name (if collected separately) */
  lastName?: string;

  // ==========================================================================
  // Address Information
  // ==========================================================================
  /** Service/property address */
  address?: LeadAddress;

  // ==========================================================================
  // Domain-Specific Information
  // ==========================================================================
  /** Property details (for home services) */
  property?: LeadProperty;
  /** Vehicle details (for auto services) */
  vehicle?: LeadVehicle;
  /** Business details (for B2B services) */
  business?: LeadBusiness;
  /** Healthcare details (for medical services) */
  healthcare?: LeadHealthcare;
  /** Legal case details (for legal services) */
  legal?: LeadLegal;
  /** Financial details (for insurance/tax services) */
  financial?: LeadFinancial;

  // ==========================================================================
  // Project/Service Request
  // ==========================================================================
  /** Project/service request details */
  project?: LeadProject;

  // ==========================================================================
  // Contact & Scheduling Preferences
  // ==========================================================================
  /** Contact preferences */
  contactPreferences?: LeadContactPreferences;
  /** Scheduling/appointment preferences */
  scheduling?: LeadScheduling;

  // ==========================================================================
  // Tracking & Attribution
  // ==========================================================================
  /** UTM tracking parameters */
  utm: LeadUtm;
  /** Page/session metadata */
  metadata?: LeadMetadata;

  // ==========================================================================
  // Compliance & Consent
  // ==========================================================================
  /** Consent information (required for GDPR compliance) */
  consent?: LeadConsentInput;

  // ==========================================================================
  // Extensibility
  // ==========================================================================
  /** Custom fields for funnel-specific data */
  customFields?: Record<string, string>;
  /** Tags for categorization */
  tags?: string[];
  /** Source system if imported */
  sourceSystem?: string;
  /** External/legacy ID if imported */
  externalId?: string;
}

/**
 * Consent input from form submission
 */
export interface LeadConsentInput {
  /** User must accept privacy policy */
  privacyAccepted: boolean;
  /** User can opt-in to marketing */
  marketingConsent?: boolean;
  /** Privacy policy version shown to user */
  privacyPolicyVersion?: string;
  /** Terms version shown to user */
  termsVersion?: string;
}

/**
 * Lead data stored in database
 * Comprehensive schema supporting all funnel types
 */
export interface Lead {
  // ==========================================================================
  // System Fields
  // ==========================================================================
  /** Unique lead identifier */
  id: string;
  /** Funnel/service identifier */
  funnelId: string;
  /** Lead creation timestamp */
  createdAt: string;
  /** Last update timestamp */
  updatedAt: string;
  /** Lead status in pipeline */
  status: LeadStatus;

  // ==========================================================================
  // Core Contact Fields
  // ==========================================================================
  /** Full name */
  name: string;
  /** Email address */
  email: string;
  /** Primary phone number */
  phone?: string;
  /** Message/notes/special request */
  notes?: string;
  /** First name (if collected separately) */
  firstName?: string;
  /** Last name (if collected separately) */
  lastName?: string;

  // ==========================================================================
  // Address Information
  // ==========================================================================
  /** Service/property address */
  address?: LeadAddress;

  // ==========================================================================
  // Domain-Specific Information
  // ==========================================================================
  /** Property details (for home services) */
  property?: LeadProperty;
  /** Vehicle details (for auto services) */
  vehicle?: LeadVehicle;
  /** Business details (for B2B services) */
  business?: LeadBusiness;
  /** Healthcare details (for medical services) */
  healthcare?: LeadHealthcare;
  /** Legal case details (for legal services) */
  legal?: LeadLegal;
  /** Financial details (for insurance/tax services) */
  financial?: LeadFinancial;

  // ==========================================================================
  // Project/Service Request
  // ==========================================================================
  /** Project/service request details */
  project?: LeadProject;

  // ==========================================================================
  // Contact & Scheduling Preferences
  // ==========================================================================
  /** Contact preferences */
  contactPreferences?: LeadContactPreferences;
  /** Scheduling/appointment preferences */
  scheduling?: LeadScheduling;

  // ==========================================================================
  // Tracking & Attribution
  // ==========================================================================
  /** UTM tracking parameters */
  utm: LeadUtm;
  /** Page/session metadata */
  metadata: LeadMetadata;

  // ==========================================================================
  // Compliance & Consent
  // ==========================================================================
  /** Consent tracking information */
  consent?: LeadConsent;
  /** History of consent updates for audit trail */
  consentHistory?: ConsentUpdate[];

  // ==========================================================================
  // Extensibility
  // ==========================================================================
  /** Custom fields for funnel-specific data */
  customFields?: Record<string, string>;
  /** Tags for categorization */
  tags?: string[];
  /** Source system if imported */
  sourceSystem?: string;
  /** External/legacy ID if imported */
  externalId?: string;

  // ==========================================================================
  // Assignment & Workflow
  // ==========================================================================
  /** Assigned organization ID */
  assignedOrgId?: string;
  /** Assigned user ID */
  assignedUserId?: string;
  /** Assignment rule that matched */
  assignmentRuleId?: string;
  /** When the lead was assigned */
  assignedAt?: string;
  /** Lead quality score (0-100) */
  qualityScore?: number;
  /** AI-generated analysis */
  analysis?: {
    urgency?: 'high' | 'medium' | 'low';
    intent?: 'ready_to_buy' | 'researching' | 'price_shopping' | 'complaint' | 'other';
    sentiment?: 'positive' | 'neutral' | 'negative';
    summary?: string;
    keywords?: string[];
  };
}

// =============================================================================
// API Response Types
// =============================================================================

/**
 * Field-level validation errors
 * Maps field names to their error messages
 */
export type FieldErrors = Record<string, string>;

/**
 * Standard API response wrapper
 */
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: ApiError;
}

/**
 * API error structure
 */
export interface ApiError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
  fieldErrors?: FieldErrors;
}

/**
 * Lead submission response
 */
export interface LeadSubmitResponse {
  success: boolean;
  data?: {
    id: string;
    message?: string;
  };
  error?: ApiError;
}

/**
 * Health check response
 */
export interface HealthResponse {
  status: HealthStatus;
  version: string;
  timestamp: string;
  services?: Record<string, ServiceHealth>;
}

/**
 * Service health status
 */
export interface ServiceHealth {
  status: ServiceStatus;
  latency?: number;
  message?: string;
}

// =============================================================================
// Funnel Types
// =============================================================================

/**
 * Funnel configuration
 */
export interface FunnelConfig {
  id: string;
  slug: string;
  name: string;
  category: FunnelCategory;
  enabled: boolean;
  rateLimit?: {
    requests: number;
    windowMs: number;
  };
  /** Whether consent is required for this funnel */
  requireConsent?: boolean;
  /** Privacy policy URL for this funnel */
  privacyPolicyUrl?: string;
  /** Terms of service URL for this funnel */
  termsUrl?: string;
}

/**
 * Funnel category
 */
export type FunnelCategory =
  | 'core'
  | 'home-services'
  | 'health'
  | 'legal'
  | 'business'
  | 'auto'
  | 'education'
  | 'events';

/**
 * List of all 47 funnel IDs
 */
export const FUNNEL_IDS = [
  // Core Services (8)
  'real-estate',
  'life-insurance',
  'construction',
  'moving',
  'dentist',
  'plastic-surgeon',
  'roofing',
  'cleaning',

  // Home Services (19)
  'hvac',
  'plumbing',
  'electrician',
  'pest-control',
  'landscaping',
  'pool-service',
  'home-remodeling',
  'solar',
  'locksmith',
  'pressure-washing',
  'water-damage-restoration',
  'mold-remediation',
  'flooring',
  'painting',
  'windows-doors',
  'fencing',
  'concrete',
  'junk-removal',
  'appliance-repair',

  // Health & Beauty (7)
  'orthodontist',
  'dermatology',
  'medspa',
  'chiropractic',
  'physical-therapy',
  'hair-transplant',
  'cosmetic-dentistry',

  // Professional & Legal (5)
  'personal-injury-attorney',
  'immigration-attorney',
  'criminal-defense-attorney',
  'tax-accounting',
  'business-consulting',

  // Business Services (4)
  'commercial-cleaning',
  'security-systems',
  'it-services',
  'marketing-agency',

  // Auto Services (4)
  'auto-repair',
  'auto-detailing',
  'towing',
  'auto-glass',
] as const;

export type FunnelId = (typeof FUNNEL_IDS)[number];

// =============================================================================
// Validation
// =============================================================================

/**
 * Email validation regex
 */
export const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Phone validation regex (US format)
 */
export const PHONE_REGEX = /^[\d\s\-\(\)\+]{10,20}$/;

/**
 * Validate email format
 */
export function isValidEmail(email: string): boolean {
  return EMAIL_REGEX.test(email);
}

/**
 * Validate phone format
 */
export function isValidPhone(phone: string): boolean {
  return PHONE_REGEX.test(phone);
}

/**
 * Check if a string is a valid funnel ID
 */
export function isValidFunnelId(id: string): id is FunnelId {
  return FUNNEL_IDS.includes(id as FunnelId);
}

/**
 * Validate consent input
 * Returns validation errors if consent is invalid
 */
export function validateConsent(
  consent: LeadConsentInput | undefined,
  requireConsent: boolean = true
): FieldErrors {
  const errors: FieldErrors = {};

  if (requireConsent) {
    if (!consent) {
      errors.consent = 'Consent information is required';
      return errors;
    }

    if (consent.privacyAccepted !== true) {
      errors.privacyAccepted = 'You must accept the privacy policy to continue';
    }
  }

  return errors;
}

/**
 * Create a consent record from input
 */
export function createConsentRecord(
  input: LeadConsentInput,
  ipHash?: string,
  source: ConsentSource = 'form'
): LeadConsent {
  return {
    privacyAccepted: input.privacyAccepted,
    marketingConsent: input.marketingConsent ?? false,
    consentTimestamp: new Date().toISOString(),
    consentIpHash: ipHash,
    privacyPolicyVersion: input.privacyPolicyVersion,
    termsVersion: input.termsVersion,
    consentSource: source,
  };
}

// =============================================================================
// Utilities
// =============================================================================

/**
 * Sanitize string input
 */
export function sanitizeString(input: string): string {
  return input.trim().replace(/[<>]/g, '');
}

/**
 * Normalize email address
 */
export function normalizeEmail(email: string): string {
  return email.toLowerCase().trim();
}

/**
 * Normalize phone number (remove non-digits except +)
 */
export function normalizePhone(phone: string): string {
  return phone.replace(/[^\d+]/g, '');
}
