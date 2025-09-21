
-- Create an RPC function to execute raw SQL (use with extreme caution)
-- This should be run in your Supabase SQL editor

CREATE OR REPLACE FUNCTION exec_sql(query TEXT)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  EXECUTE query;
  RETURN 'SUCCESS';
EXCEPTION
  WHEN OTHERS THEN
    RETURN 'ERROR: ' || SQLERRM;
END;
$$;
