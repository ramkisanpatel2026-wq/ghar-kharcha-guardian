CREATE OR REPLACE FUNCTION public.reject_disposable_signup_email()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  email_domain text;
  blocked_domains text[] := ARRAY[
    '10minutemail.com', '10minutemail.net', '20minutemail.com', '33mail.com',
    'dispostable.com', 'emailondeck.com', 'fakeinbox.com', 'getairmail.com',
    'getnada.com', 'guerrillamail.com', 'guerrillamail.net', 'inboxkitten.com',
    'maildrop.cc', 'mailinator.com', 'mailnesia.com', 'mintemail.com',
    'mohmal.com', 'mytemp.email', 'nada.email', 'sharklasers.com',
    'tempmail.com', 'temp-mail.org', 'throwawaymail.com', 'trashmail.com',
    'yopmail.com', 'yopmail.fr', 'disposablemail.com', 'fake-email.com'
  ];
BEGIN
  email_domain := lower(split_part(COALESCE(NEW.email, ''), '@', 2));
  IF email_domain = ANY(blocked_domains) OR EXISTS (
    SELECT 1
    FROM unnest(blocked_domains) AS blocked(domain)
    WHERE email_domain LIKE '%.' || blocked.domain
  ) THEN
    RAISE EXCEPTION 'This temporary email domain is not allowed. Please use your regular email address.'
      USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END;
$function$;

CREATE TRIGGER reject_disposable_signup_email
BEFORE INSERT ON auth.users
FOR EACH ROW
EXECUTE FUNCTION public.reject_disposable_signup_email();