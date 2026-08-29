-- realtime.messages is managed by Supabase Realtime and already has RLS
-- enabled. Only its authorization policies are application-owned.

-- Allow authenticated users to receive broadcasts/postgres_changes on public market data channels
CREATE POLICY "Authenticated can read public market channels"
ON realtime.messages
FOR SELECT
TO authenticated
USING (
  realtime.topic() IN (
    'ticker-realtime',
    'market-realtime',
    'commodities-page-rt',
    'rates-page-rt',
    'stocks-page-rt'
  )
  OR realtime.topic() = ('notifications-rt:' || auth.uid()::text)
);

-- Allow anonymous users to receive broadcasts on public market data channels (these tables are publicly readable)
CREATE POLICY "Anonymous can read public market channels"
ON realtime.messages
FOR SELECT
TO anon
USING (
  realtime.topic() IN (
    'ticker-realtime',
    'market-realtime',
    'commodities-page-rt',
    'rates-page-rt',
    'stocks-page-rt'
  )
);
