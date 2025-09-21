
# Development Environment Configuration
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

# Development Vercel Project
resource "vercel_project" "banking_app_dev" {
  name      = "oakline-bank-dev"
  framework = "nextjs"
  
  environment = [
    {
      key    = "NODE_ENV"
      value  = "development"
      target = ["development"]
    },
    {
      key    = "NEXT_PUBLIC_SITE_URL"
      value  = "https://oakline-bank-dev.vercel.app"
      target = ["development"]
    }
  ]
}

# Development Database (separate Supabase project)
resource "supabase_project" "banking_dev" {
  organization_id = var.supabase_org_id
  name            = "oakline-bank-dev"
  database_password = var.dev_db_password
  region          = "us-east-1"
  
  tags = {
    Environment = "development"
    Project     = "oakline-bank"
  }
}
