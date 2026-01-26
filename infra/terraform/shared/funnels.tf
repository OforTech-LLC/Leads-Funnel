# =============================================================================
# Shared Funnels Configuration
# =============================================================================
# This file contains the complete list of 47 funnel IDs used across all
# environments. Each funnel gets its own DynamoDB table for lead storage.
#
# Funnel ID Format: lowercase, alphanumeric with hyphens
# =============================================================================

# -----------------------------------------------------------------------------
# Funnel IDs Variable
# -----------------------------------------------------------------------------
# Complete list of 47 funnel identifiers. These are used to:
# 1. Create per-funnel DynamoDB tables
# 2. Configure SSM parameters for funnel routing
# 3. Set up per-funnel monitoring and alerts
# -----------------------------------------------------------------------------
variable "funnel_ids" {
  type        = list(string)
  description = "List of all funnel IDs for the platform"
  default = [
    # Real Estate & Home Services (12 funnels)
    "real-estate",
    "roofing",
    "cleaning",
    "hvac",
    "plumbing",
    "electrician",
    "pest-control",
    "landscaping",
    "pool-service",
    "home-remodeling",
    "solar",
    "pressure-washing",

    # Home Maintenance & Repair (8 funnels)
    "locksmith",
    "water-damage-restoration",
    "mold-remediation",
    "flooring",
    "painting",
    "windows-doors",
    "fencing",
    "concrete",

    # Moving & Junk Services (3 funnels)
    "moving",
    "junk-removal",
    "appliance-repair",

    # Medical & Healthcare (8 funnels)
    "dentist",
    "plastic-surgeon",
    "orthodontist",
    "dermatology",
    "medspa",
    "chiropractic",
    "physical-therapy",
    "hair-transplant",

    # Dental Specialty (1 funnel)
    "cosmetic-dentistry",

    # Legal Services (3 funnels)
    "personal-injury-attorney",
    "immigration-attorney",
    "criminal-defense-attorney",

    # Financial & Business Services (3 funnels)
    "tax-accounting",
    "business-consulting",
    "life-insurance",

    # Commercial Services (3 funnels)
    "commercial-cleaning",
    "security-systems",
    "it-services",

    # Marketing (1 funnel)
    "marketing-agency",

    # Automotive Services (5 funnels)
    "auto-repair",
    "auto-detailing",
    "towing",
    "auto-glass",
    "construction"
  ]

  validation {
    condition     = length(var.funnel_ids) == 47
    error_message = "Exactly 47 funnel IDs must be provided."
  }

  validation {
    condition     = alltrue([for id in var.funnel_ids : can(regex("^[a-z0-9-]+$", id))])
    error_message = "Funnel IDs must contain only lowercase letters, numbers, and hyphens."
  }
}

# -----------------------------------------------------------------------------
# Funnel Metadata
# -----------------------------------------------------------------------------
# Additional metadata for each funnel (category, display name, etc.)
# Used for SSM parameter generation and monitoring dashboards
# -----------------------------------------------------------------------------
variable "funnel_metadata" {
  type = map(object({
    display_name = string
    category     = string
    active       = bool
  }))
  description = "Metadata for each funnel"
  default = {
    # Real Estate & Home Services
    "real-estate"      = { display_name = "Real Estate", category = "real-estate", active = true }
    "roofing"          = { display_name = "Roofing", category = "home-services", active = true }
    "cleaning"         = { display_name = "Cleaning", category = "home-services", active = true }
    "hvac"             = { display_name = "HVAC", category = "home-services", active = true }
    "plumbing"         = { display_name = "Plumbing", category = "home-services", active = true }
    "electrician"      = { display_name = "Electrician", category = "home-services", active = true }
    "pest-control"     = { display_name = "Pest Control", category = "home-services", active = true }
    "landscaping"      = { display_name = "Landscaping", category = "home-services", active = true }
    "pool-service"     = { display_name = "Pool Service", category = "home-services", active = true }
    "home-remodeling"  = { display_name = "Home Remodeling", category = "home-services", active = true }
    "solar"            = { display_name = "Solar", category = "home-services", active = true }
    "pressure-washing" = { display_name = "Pressure Washing", category = "home-services", active = true }

    # Home Maintenance & Repair
    "locksmith"                = { display_name = "Locksmith", category = "home-maintenance", active = true }
    "water-damage-restoration" = { display_name = "Water Damage Restoration", category = "home-maintenance", active = true }
    "mold-remediation"         = { display_name = "Mold Remediation", category = "home-maintenance", active = true }
    "flooring"                 = { display_name = "Flooring", category = "home-maintenance", active = true }
    "painting"                 = { display_name = "Painting", category = "home-maintenance", active = true }
    "windows-doors"            = { display_name = "Windows & Doors", category = "home-maintenance", active = true }
    "fencing"                  = { display_name = "Fencing", category = "home-maintenance", active = true }
    "concrete"                 = { display_name = "Concrete", category = "home-maintenance", active = true }

    # Moving & Junk Services
    "moving"           = { display_name = "Moving", category = "moving-services", active = true }
    "junk-removal"     = { display_name = "Junk Removal", category = "moving-services", active = true }
    "appliance-repair" = { display_name = "Appliance Repair", category = "moving-services", active = true }

    # Medical & Healthcare
    "dentist"            = { display_name = "Dentist", category = "healthcare", active = true }
    "plastic-surgeon"    = { display_name = "Plastic Surgeon", category = "healthcare", active = true }
    "orthodontist"       = { display_name = "Orthodontist", category = "healthcare", active = true }
    "dermatology"        = { display_name = "Dermatology", category = "healthcare", active = true }
    "medspa"             = { display_name = "MedSpa", category = "healthcare", active = true }
    "chiropractic"       = { display_name = "Chiropractic", category = "healthcare", active = true }
    "physical-therapy"   = { display_name = "Physical Therapy", category = "healthcare", active = true }
    "hair-transplant"    = { display_name = "Hair Transplant", category = "healthcare", active = true }
    "cosmetic-dentistry" = { display_name = "Cosmetic Dentistry", category = "healthcare", active = true }

    # Legal Services
    "personal-injury-attorney"  = { display_name = "Personal Injury Attorney", category = "legal", active = true }
    "immigration-attorney"      = { display_name = "Immigration Attorney", category = "legal", active = true }
    "criminal-defense-attorney" = { display_name = "Criminal Defense Attorney", category = "legal", active = true }

    # Financial & Business Services
    "tax-accounting"      = { display_name = "Tax & Accounting", category = "financial", active = true }
    "business-consulting" = { display_name = "Business Consulting", category = "financial", active = true }
    "life-insurance"      = { display_name = "Life Insurance", category = "financial", active = true }

    # Commercial Services
    "commercial-cleaning" = { display_name = "Commercial Cleaning", category = "commercial", active = true }
    "security-systems"    = { display_name = "Security Systems", category = "commercial", active = true }
    "it-services"         = { display_name = "IT Services", category = "commercial", active = true }

    # Marketing
    "marketing-agency" = { display_name = "Marketing Agency", category = "marketing", active = true }

    # Automotive Services
    "auto-repair"    = { display_name = "Auto Repair", category = "automotive", active = true }
    "auto-detailing" = { display_name = "Auto Detailing", category = "automotive", active = true }
    "towing"         = { display_name = "Towing", category = "automotive", active = true }
    "auto-glass"     = { display_name = "Auto Glass", category = "automotive", active = true }
    "construction"   = { display_name = "Construction", category = "construction", active = true }
  }
}

# -----------------------------------------------------------------------------
# Output the funnel configuration for use in other modules
# -----------------------------------------------------------------------------
output "funnel_ids" {
  description = "List of all funnel IDs"
  value       = var.funnel_ids
}

output "funnel_count" {
  description = "Total number of funnels"
  value       = length(var.funnel_ids)
}

output "funnel_metadata" {
  description = "Funnel metadata map"
  value       = var.funnel_metadata
}

output "funnel_categories" {
  description = "Unique funnel categories"
  value       = distinct([for id, meta in var.funnel_metadata : meta.category])
}
