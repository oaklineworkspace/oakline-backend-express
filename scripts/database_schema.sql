-- Drop existing tables and types to reset
DROP TABLE IF EXISTS public.accounts CASCADE;
DROP TABLE IF EXISTS public.applications CASCADE;
DROP TABLE IF EXISTS public.enrollments CASCADE;
DROP TABLE IF EXISTS public.profiles CASCADE;

-- Drop existing types
DROP TYPE IF EXISTS account_type_enum CASCADE;
DROP TYPE IF EXISTS employment_status_enum CASCADE;
DROP TYPE IF EXISTS annual_income_enum CASCADE;

-- Create enums
CREATE TYPE employment_status_enum AS ENUM (
  'employed_fulltime',
  'employed_parttime',
  'self_employed',
  'retired',
  'student',
  'unemployed'
);

CREATE TYPE annual_income_enum AS ENUM (
  'under_25k',
  '25k_50k',
  '50k_75k',
  '75k_100k',
  '100k_150k',
  'over_150k'
);

CREATE TYPE account_type_enum AS ENUM (
  'checking_account',
  'savings_account',
  'business_checking',
  'business_savings',
  'student_checking',
  'money_market',
  'certificate_of_deposit',
  'retirement_ira',
  'joint_checking',
  'trust_account',
  'investment_brokerage',
  'high_yield_savings',
  'international_checking',
  'foreign_currency',
  'cryptocurrency_wallet',
  'loan_repayment',
  'mortgage',
  'auto_loan',
  'credit_card',
  'prepaid_card',
  'payroll_account',
  'nonprofit_charity',
  'escrow_account'
);

-- Account Status Enum
CREATE TYPE account_status_enum AS ENUM (
  'pending',
  'active',
  'inactive',
  'frozen',
  'closed'
);

-- Create applications table
CREATE TABLE public.applications (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  first_name text NOT NULL,
  middle_name text,
  last_name text NOT NULL,
  email text NOT NULL UNIQUE,
  phone text,
  date_of_birth date,
  country text,
  ssn text,
  id_number text,
  address text,
  city text,
  state text,
  zip_code text,
  employment_status employment_status_enum,
  annual_income annual_income_enum,
  account_types account_type_enum[],
  agree_to_terms boolean DEFAULT false,
  application_status VARCHAR(20) DEFAULT 'pending' CHECK (application_status IN ('pending', 'approved', 'rejected', 'under_review')),
  created_by_admin boolean DEFAULT false,
  mothers_maiden_name text,
  submitted_at timestamp without time zone DEFAULT now(),
  processed_at timestamp without time zone,
  created_at timestamp without time zone DEFAULT now(),
  CONSTRAINT applications_pkey PRIMARY KEY (id)
);

-- Create accounts table with status column
CREATE TABLE public.accounts (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  application_id uuid,
  account_number text NOT NULL UNIQUE,
  routing_number text NOT NULL DEFAULT '075915826'::text,
  account_type account_type_enum NOT NULL,
  balance numeric DEFAULT 0,
  status account_status_enum DEFAULT 'active',
  created_at timestamp without time zone DEFAULT now(),
  CONSTRAINT accounts_pkey PRIMARY KEY (id),
  CONSTRAINT accounts_application_id_fkey FOREIGN KEY (application_id) REFERENCES public.applications(id) ON DELETE CASCADE
);

-- Create enrollments table with application_id
CREATE TABLE public.enrollments (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  email text NOT NULL UNIQUE,
  token text NOT NULL,
  is_used boolean DEFAULT false,
  application_id uuid,
  created_at timestamp without time zone DEFAULT now(),
  CONSTRAINT enrollments_pkey PRIMARY KEY (id),
  CONSTRAINT enrollments_application_id_fkey FOREIGN KEY (application_id) REFERENCES public.applications(id) ON DELETE CASCADE
);

-- Create profiles table with all required fields
CREATE TABLE public.profiles (
  id uuid NOT NULL,
  application_id uuid,
  email text,
  first_name text,
  middle_name text,
  last_name text,
  phone text,
  date_of_birth date,
  country text,
  address text,
  city text,
  state text,
  zip_code text,
  ssn text,
  id_number text,
  enrollment_completed boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT profiles_pkey PRIMARY KEY (id),
  CONSTRAINT profiles_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE,
  CONSTRAINT profiles_application_id_fkey FOREIGN KEY (application_id) REFERENCES public.applications(id) ON DELETE SET NULL
);

-- Enable Row Level Security
ALTER TABLE public.applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Create policies for applications
CREATE POLICY "Allow insert for applications" ON public.applications FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow select for applications" ON public.applications FOR SELECT USING (true);

-- Create policies for accounts
CREATE POLICY "Allow insert for accounts" ON public.accounts FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow select for accounts" ON public.accounts FOR SELECT USING (true);
CREATE POLICY "Allow update for accounts" ON public.accounts FOR UPDATE USING (true);

-- Create policies for enrollments
CREATE POLICY "Allow insert for enrollments" ON public.enrollments FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow select for enrollments" ON public.enrollments FOR SELECT USING (true);
CREATE POLICY "Allow update for enrollments" ON public.enrollments FOR UPDATE USING (true);

-- Create policies for profiles
CREATE POLICY "Allow insert for profiles" ON public.profiles FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow select for profiles" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Allow update for profiles" ON public.profiles FOR UPDATE USING (true);

-- Create indexes for better performance
CREATE INDEX idx_applications_email ON public.applications(email);
CREATE INDEX idx_accounts_application_id ON public.accounts(application_id);
CREATE INDEX idx_accounts_account_number ON public.accounts(account_number);
CREATE INDEX idx_enrollments_email ON public.enrollments(email);
CREATE INDEX idx_enrollments_token ON public.enrollments(token);
CREATE INDEX idx_enrollments_application_id ON public.enrollments(application_id);
CREATE INDEX idx_profiles_email ON public.profiles(email);

-- Transactions table
CREATE TABLE IF NOT EXISTS transactions (
  id SERIAL PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  account_id INTEGER REFERENCES accounts(id) ON DELETE CASCADE,
  type VARCHAR(20) CHECK (type IN ('credit', 'debit', 'transfer_in', 'transfer_out', 'deposit', 'withdrawal', 'fee', 'interest')),
  amount DECIMAL(15,2) NOT NULL,
  description TEXT,
  reference_number VARCHAR(50),
  status VARCHAR(20) DEFAULT 'completed' CHECK (status IN ('pending', 'completed', 'failed', 'cancelled')),
  category VARCHAR(50),
  merchant_name VARCHAR(100),
  location VARCHAR(200),
  created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT now()
);

-- Index for faster queries
CREATE INDEX IF NOT EXISTS idx_transactions_user_id ON transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_account_id ON transactions(account_id);
CREATE INDEX IF NOT EXISTS idx_transactions_created_at ON transactions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_transactions_type ON transactions(type);

-- End of schema


-- Debit Cards Table
CREATE TABLE IF NOT EXISTS debit_cards (
    id SERIAL PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    account_id INTEGER REFERENCES accounts(id) ON DELETE CASCADE,
    card_number VARCHAR(20) UNIQUE NOT NULL,
    cardholder_name VARCHAR(100) NOT NULL,
    expiry_date VARCHAR(5) NOT NULL, -- MM/YY format
    cvv VARCHAR(4) NOT NULL,
    card_type VARCHAR(20) DEFAULT 'Visa',
    status VARCHAR(20) DEFAULT 'active',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Crypto Portfolio Table
CREATE TABLE IF NOT EXISTS crypto_portfolio (
    id SERIAL PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    crypto_symbol VARCHAR(10) NOT NULL,
    crypto_name VARCHAR(50) NOT NULL,
    amount DECIMAL(20, 8) NOT NULL DEFAULT 0,
    purchase_price DECIMAL(15, 2),
    current_value DECIMAL(15, 2),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE debit_cards ENABLE ROW LEVEL SECURITY;
ALTER TABLE crypto_portfolio ENABLE ROW LEVEL SECURITY;

-- Policies for debit_cards
CREATE POLICY "Users can view their own debit cards" ON debit_cards
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own debit cards" ON debit_cards
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own debit cards" ON debit_cards
    FOR UPDATE USING (auth.uid() = user_id);

-- Policies for crypto_portfolio
CREATE POLICY "Users can view their own crypto portfolio" ON crypto_portfolio
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can manage their own crypto portfolio" ON crypto_portfolio
    FOR ALL USING (auth.uid() = user_id);

-- Card Applications Table
CREATE TABLE IF NOT EXISTS card_applications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  account_id UUID REFERENCES accounts(id) ON DELETE CASCADE,
  card_type VARCHAR(50) DEFAULT 'debit',
  cardholder_name VARCHAR(255) NOT NULL,
  card_number VARCHAR(16), -- Generated upon approval
  cvv VARCHAR(3), -- Generated upon approval
  expiry_date VARCHAR(5), -- Generated upon approval (MM/YY)
  status VARCHAR(20) DEFAULT 'pending', -- pending, approved, rejected, cancelled
  applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  approved_at TIMESTAMP,
  rejected_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Cards/Debit Cards Table (updated)
CREATE TABLE IF NOT EXISTS cards (
    id SERIAL PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    account_id UUID REFERENCES accounts(id) ON DELETE CASCADE,
    application_id UUID REFERENCES card_applications(id) ON DELETE SET NULL,
    card_number VARCHAR(20) UNIQUE NOT NULL,
    cardholder_name VARCHAR(100) NOT NULL,
    expiry_date VARCHAR(5) NOT NULL, -- MM/YY format
    cvv VARCHAR(4) NOT NULL,
    card_type VARCHAR(20) DEFAULT 'debit',
    status VARCHAR(20) DEFAULT 'active',
    daily_limit DECIMAL(10,2) DEFAULT 1000.00,
    monthly_limit DECIMAL(10,2) DEFAULT 10000.00,
    daily_spent DECIMAL(10,2) DEFAULT 0.00,
    monthly_spent DECIMAL(10,2) DEFAULT 0.00,
    is_locked BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Users Table (for admin dashboard)
CREATE TABLE IF NOT EXISTS users (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  phone VARCHAR(20),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Enable RLS for card_applications and users
ALTER TABLE card_applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Policies for card_applications
CREATE POLICY "Users can view their own card applications" ON card_applications
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own card applications" ON card_applications
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Policies for users (adjust as needed for admin access)
CREATE POLICY "Allow all on users for services role" ON users
    FOR ALL USING (pg_has_role('services')); -- Example: Granting access to a 'services' role

CREATE POLICY "Allow select on users for authenticated users" ON users
    FOR SELECT USING (auth.role() = 'authenticated');