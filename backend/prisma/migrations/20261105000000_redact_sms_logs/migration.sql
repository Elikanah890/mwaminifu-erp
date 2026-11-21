-- Remove historical OTPs, PINs and passwords from stored SMS audit logs.
UPDATE "SmsLog"
SET "message" = regexp_replace(
  regexp_replace(
    "message",
    '(?i)(password|pin|code|otp)([^:\n]*)[:\-]?\s*\S+',
    '\1\2 [redacted]',
    'g'
  ),
  '\m[0-9]{4,8}\M',
  '[redacted]',
  'g'
);
