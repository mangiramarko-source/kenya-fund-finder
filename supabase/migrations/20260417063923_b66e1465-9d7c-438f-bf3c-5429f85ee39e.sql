-- Allow admins to read the email send log for auditability
CREATE POLICY "Admins can read email send log"
ON public.email_send_log
FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));