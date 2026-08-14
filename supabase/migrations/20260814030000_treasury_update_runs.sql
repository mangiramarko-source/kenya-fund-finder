-- Additive migration for treasury_update_runs
CREATE TABLE IF NOT EXISTS public.treasury_update_runs (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    started_at timestamptz NOT NULL,
    completed_at timestamptz,
    status text NOT NULL, -- 'SUCCESS_NEW_DATA', 'SUCCESS_NO_CHANGE', 'FETCH_FAILED', 'PARSER_FAILED', 'VALIDATION_FAILED', 'DATABASE_FAILED'
    trigger_type text NOT NULL, -- 'SCHEDULED', 'MANUAL'
    source_checked text,
    latest_stored_issue text,
    latest_source_issue text,
    records_detected integer DEFAULT 0,
    records_inserted integer DEFAULT 0,
    records_updated integer DEFAULT 0,
    error_code text,
    error_message text,
    execution_duration_ms integer,
    created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.treasury_update_runs ENABLE ROW LEVEL SECURITY;

-- Deny public access to internal updater error logs
-- Allow authenticated or service_role access only. Since updater runs under service_role, we focus on that.
CREATE POLICY "Enable read access for service_role and authenticated users" 
    ON public.treasury_update_runs 
    FOR SELECT 
    USING (auth.role() = 'service_role' OR auth.role() = 'authenticated');

CREATE POLICY "Enable insert access for service_role only" 
    ON public.treasury_update_runs 
    FOR INSERT 
    WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "Enable update access for service_role only" 
    ON public.treasury_update_runs 
    FOR UPDATE 
    USING (auth.role() = 'service_role')
    WITH CHECK (auth.role() = 'service_role');

-- Create indexes for performance and dead-job detection queries
CREATE INDEX IF NOT EXISTS idx_treasury_update_runs_status ON public.treasury_update_runs(status);
CREATE INDEX IF NOT EXISTS idx_treasury_update_runs_started_at ON public.treasury_update_runs(started_at DESC);
