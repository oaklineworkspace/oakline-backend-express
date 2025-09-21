
terraform {
  required_providers {
    cloudflare = {
      source  = "cloudflare/cloudflare"
      version = "~> 4.0"
    }
  }
}

# DNS Zone
resource "cloudflare_zone" "main" {
  zone = "theoaklinebank.com"
  plan = "pro"
}

# WAF Rules
resource "cloudflare_ruleset" "waf" {
  zone_id = cloudflare_zone.main.id
  name    = "Banking App WAF"
  kind    = "zone"
  phase   = "http_request_firewall_managed"

  rules {
    action = "challenge"
    expression = "(cf.threat_score gt 10)"
    description = "Challenge high threat score requests"
    enabled = true
  }

  rules {
    action = "block"
    expression = "(http.request.uri.path contains \"/admin\" and cf.country ne \"US\")"
    description = "Block admin access from non-US countries"
    enabled = true
  }

  rules {
    action = "js_challenge"
    expression = "(http.request.uri.path contains \"/api/\" and cf.bot_management.score lt 30)"
    description = "Challenge potential bot API requests"
    enabled = true
  }
}

# Rate Limiting
resource "cloudflare_rate_limit" "login_protection" {
  zone_id = cloudflare_zone.main.id
  threshold = 5
  period = 60
  match {
    request {
      url_pattern = "*/login*"
      schemes = ["HTTPS"]
      methods = ["POST"]
    }
  }
  action {
    mode = "ban"
    timeout = 3600
  }
}

# SSL/TLS Settings
resource "cloudflare_zone_settings_override" "main" {
  zone_id = cloudflare_zone.main.id
  settings {
    ssl = "strict"
    always_use_https = "on"
    min_tls_version = "1.2"
    tls_1_3 = "on"
    automatic_https_rewrites = "on"
    security_level = "high"
    browser_check = "on"
  }
}
terraform {
  required_providers {
    cloudflare = {
      source  = "cloudflare/cloudflare"
      version = "~> 4.0"
    }
  }
}

# Cloudflare Zone for domain
resource "cloudflare_zone" "banking_domain" {
  zone = var.domain_name
  plan = "pro"  # Required for WAF
}

# WAF Rules for Banking Security
resource "cloudflare_ruleset" "banking_waf" {
  zone_id = cloudflare_zone.banking_domain.id
  name    = "Banking WAF Rules"
  kind    = "zone"
  phase   = "http_request_firewall_custom"

  rules {
    action = "block"
    expression = "(http.request.uri.path contains \"/api/admin/\" and cf.threat_score gt 10)"
    description = "Block suspicious requests to admin endpoints"
  }

  rules {
    action = "challenge"
    expression = "(http.request.uri.path contains \"/api/\" and rate(5m) gt 100)"
    description = "Challenge high-frequency API requests"
  }

  rules {
    action = "block"
    expression = "(cf.threat_score gt 50 or cf.bot_management.score lt 30)"
    description = "Block high-risk and bot traffic"
  }
}

# DNS Security Settings
resource "cloudflare_zone_settings_override" "banking_security" {
  zone_id = cloudflare_zone.banking_domain.id
  
  settings {
    ssl                      = "strict"
    always_use_https        = "on"
    min_tls_version         = "1.2"
    tls_1_3                 = "on"
    automatic_https_rewrites = "on"
    security_level          = "high"
    challenge_ttl           = 1800
    browser_check           = "on"
    hotlink_protection      = "on"
    ip_geolocation          = "on"
    email_obfuscation       = "on"
    server_side_exclude     = "on"
    
    security_header {
      enabled = true
      max_age = 31536000
      include_subdomains = true
      nosniff = true
    }
  }
}

# Rate Limiting for Banking Operations
resource "cloudflare_rate_limit" "banking_api" {
  zone_id   = cloudflare_zone.banking_domain.id
  threshold = 50
  period    = 60
  
  match {
    request {
      url_pattern = "*.${var.domain_name}/api/*"
      schemes     = ["HTTPS"]
      methods     = ["POST", "PUT", "DELETE"]
    }
  }
  
  action {
    mode    = "challenge"
    timeout = 300
  }
}
