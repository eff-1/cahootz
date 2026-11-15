# =====================================================================
# CAHOOTZ — Staging Infrastructure-as-Code Skeleton (Terraform)
# Reference: SCALABILITY_AND_INFRASTRUCTURE.md (Chapter 17 & Step 3)
# =====================================================================

terraform {
  required_version = ">= 1.6.0"
}

variable "environment" {
  type        = string
  default     = "staging"
  description = "Deployment environment (staging | production)"
}

variable "primary_region" {
  type        = string
  default     = "eu-west-1"
  description = "Low-latency region serving Nigeria (Lagos/Abuja) traffic"
}

output "architecture_mode" {
  value       = "modular-monolith"
  description = "Cahootz MVP runs as a modular monolith with PostgreSQL + Redis + S3-compatible object storage"
}
