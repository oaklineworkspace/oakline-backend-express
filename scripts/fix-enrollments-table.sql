
-- Fix enrollments table to include application_id column
DO $$ 
BEGIN
    -- Add application_id column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'enrollments' AND column_name = 'application_id'
    ) THEN
        ALTER TABLE enrollments ADD COLUMN application_id INTEGER REFERENCES applications(id) ON DELETE CASCADE;
        RAISE NOTICE 'Added application_id column to enrollments table';
    END IF;
    
    -- Add completed_at column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'enrollments' AND column_name = 'completed_at'
    ) THEN
        ALTER TABLE enrollments ADD COLUMN completed_at TIMESTAMP;
        RAISE NOTICE 'Added completed_at column to enrollments table';
    END IF;
    
    -- Add selected_account_number column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'enrollments' AND column_name = 'selected_account_number'
    ) THEN
        ALTER TABLE enrollments ADD COLUMN selected_account_number VARCHAR(20);
        RAISE NOTICE 'Added selected_account_number column to enrollments table';
    END IF;
END $$;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_enrollments_token ON enrollments(token);
CREATE INDEX IF NOT EXISTS idx_enrollments_email ON enrollments(email);
CREATE INDEX IF NOT EXISTS idx_enrollments_application_id ON enrollments(application_id);

-- Verify the changes
SELECT column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_name = 'enrollments'
ORDER BY ordinal_position;
