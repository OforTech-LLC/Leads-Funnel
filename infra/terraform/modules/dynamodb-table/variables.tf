# =============================================================================
# DynamoDB Table Module Variables
# =============================================================================

variable "table_name" {
  type        = string
  description = "Name of the DynamoDB table"
}

variable "hash_key" {
  type        = string
  description = "Hash key (partition key) attribute name"
}

variable "range_key" {
  type        = string
  description = "Range key (sort key) attribute name (null for hash-only tables)"
  default     = null
}

variable "attributes" {
  type = list(object({
    name = string
    type = string # S, N, or B
  }))
  description = "List of attribute definitions. Must include hash_key, range_key, and all GSI key attributes"

  validation {
    condition     = length(var.attributes) > 0
    error_message = "At least one attribute must be defined."
  }

  validation {
    condition     = alltrue([for a in var.attributes : contains(["S", "N", "B"], a.type)])
    error_message = "Attribute type must be S (String), N (Number), or B (Binary)."
  }
}

variable "global_secondary_indexes" {
  type = list(object({
    name               = string
    hash_key           = string
    range_key          = optional(string)
    projection_type    = optional(string, "ALL")
    non_key_attributes = optional(list(string))
    read_capacity      = optional(number)
    write_capacity     = optional(number)
  }))
  description = "List of Global Secondary Index definitions"
  default     = []
}

variable "billing_mode" {
  type        = string
  description = "DynamoDB billing mode: PAY_PER_REQUEST or PROVISIONED"
  default     = "PAY_PER_REQUEST"

  validation {
    condition     = contains(["PAY_PER_REQUEST", "PROVISIONED"], var.billing_mode)
    error_message = "Billing mode must be PAY_PER_REQUEST or PROVISIONED."
  }
}

variable "read_capacity" {
  type        = number
  description = "Read capacity units (only used when billing_mode is PROVISIONED)"
  default     = 5
}

variable "write_capacity" {
  type        = number
  description = "Write capacity units (only used when billing_mode is PROVISIONED)"
  default     = 5
}

variable "ttl_attribute" {
  type        = string
  description = "Name of the TTL attribute (null to disable TTL)"
  default     = null
}

variable "enable_pitr" {
  type        = bool
  description = "Enable Point-in-Time Recovery"
  default     = false
}

variable "stream_view_type" {
  type        = string
  description = "DynamoDB Streams view type: NEW_IMAGE, OLD_IMAGE, NEW_AND_OLD_IMAGES, KEYS_ONLY, or null to disable"
  default     = null

  validation {
    condition     = var.stream_view_type == null || contains(["NEW_IMAGE", "OLD_IMAGE", "NEW_AND_OLD_IMAGES", "KEYS_ONLY"], coalesce(var.stream_view_type, "NEW_IMAGE"))
    error_message = "Stream view type must be NEW_IMAGE, OLD_IMAGE, NEW_AND_OLD_IMAGES, KEYS_ONLY, or null."
  }
}

variable "enable_deletion_protection" {
  type        = bool
  description = "Enable deletion protection to prevent accidental table deletion"
  default     = false
}

# -----------------------------------------------------------------------------
# Tags
# -----------------------------------------------------------------------------
variable "tags" {
  type        = map(string)
  description = "Tags to apply to the table"
  default     = {}
}
