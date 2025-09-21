
terraform {
  required_providers {
    vercel = {
      source  = "vercel/vercel"
      version = "~> 1.0"
    }
  }
}

# Staging environment variables
resource "vercel_project_environment_variable" "staging_supabase_url" {
  project_id = var.vercel_project_id
  key        = "NEXT_PUBLIC_SUPABASE_URL"
  value      = var.staging_supabase_url
  target     = ["preview"]
}

resource "vercel_project_environment_variable" "staging_supabase_anon_key" {
  project_id = var.vercel_project_id
  key        = "NEXT_PUBLIC_SUPABASE_ANON_KEY"
  value      = var.staging_supabase_anon_key
  target     = ["preview"]
}

resource "vercel_project_environment_variable" "staging_supabase_service_key" {
  project_id = var.vercel_project_id
  key        = "SUPABASE_SERVICE_KEY"
  value      = var.staging_supabase_service_key
  target     = ["preview"]
  sensitive  = true
}

# Staging domain configuration
resource "vercel_project_domain" "staging_domain" {
  project_id = var.vercel_project_id
  domain     = "staging.theoaklinebank.com"
}
# Staging Environment Configuration
terraform {
  required_version = ">= 1.0"
  required_providers {
    vercel = {
      source  = "vercel/vercel"
      version = "~> 0.15"
    }
    supabase = {
      source  = "supabase/supabase"
      version = "~> 1.0"
    }
  }
}

# Staging Vercel Project
resource "vercel_project" "banking_app_staging" {
  name      = "oakline-bank-staging"
  framework = "nextjs"
  
  environment = [
    {
      key    = "NODE_ENV"
      value  = "staging"
      target = ["preview", "development"]
    },
    {
      key    = "NEXT_PUBLIC_SITE_URL"
      value  = "https://oakline-bank-staging.vercel.app"
      target = ["preview", "development"]
    }
  ]
}

# Staging Database
resource "supabase_project" "banking_staging" {
  organization_id   = var.supabase_org_id
  name             = "oakline-bank-staging"
  database_password = var.staging_db_password
  region           = "us-east-1"
  
  tags = {
    Environment = "staging"
    Project     = "oakline-bank"
  }
}
