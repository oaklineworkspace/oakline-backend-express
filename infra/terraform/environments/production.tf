
terraform {
  required_providers {
    vercel = {
      source  = "vercel/vercel"
      version = "~> 1.0"
    }
  }
}

# Production environment variables
resource "vercel_project_environment_variable" "prod_supabase_url" {
  project_id = var.vercel_project_id
  key        = "NEXT_PUBLIC_SUPABASE_URL"
  value      = var.prod_supabase_url
  target     = ["production"]
}

resource "vercel_project_environment_variable" "prod_supabase_anon_key" {
  project_id = var.vercel_project_id
  key        = "NEXT_PUBLIC_SUPABASE_ANON_KEY"
  value      = var.prod_supabase_anon_key
  target     = ["production"]
}

resource "vercel_project_environment_variable" "prod_supabase_service_key" {
  project_id = var.vercel_project_id
  key        = "SUPABASE_SERVICE_KEY"
  value      = var.prod_supabase_service_key
  target     = ["production"]
  sensitive  = true
}

# Production domain configuration
resource "vercel_project_domain" "prod_domain" {
  project_id = var.vercel_project_id
  domain     = "app.theoaklinebank.com"
}

# WAF and security headers
resource "vercel_edge_config" "security_config" {
  name = "production-security"
}
