/**
 * Google reCAPTCHA v2 Site Key resolution.
 *
 * If VITE_GOOGLE_RECAPTCHA_SITE_KEY or VITE_RECAPTCHA_SITE_KEY is not defined in the environment,
 * falls back to Google's official public test sitekey (always passes validation):
 * https://developers.google.com/recaptcha/docs/faq#id-like-to-run-automated-tests-with-recaptcha.-what-should-i-do
 */
export const RECAPTCHA_SITE_KEY: string =
  import.meta.env.VITE_GOOGLE_RECAPTCHA_SITE_KEY ||
  import.meta.env.VITE_RECAPTCHA_SITE_KEY ||
  '6LeIxAcTAAAAAJcZVRqyHh71UMIEGNQ_MXjiZKhI';
