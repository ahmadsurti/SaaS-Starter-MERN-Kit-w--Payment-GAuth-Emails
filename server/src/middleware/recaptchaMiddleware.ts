import { NextFunction, Request, Response } from 'express';

const verifyCaptcha = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  const { captcha } = req.body;

  if (!captcha) {
    res.status(400).json({ success: false, errors: 'Please complete the CAPTCHA' });
    return;
  }

  const secretKey = process.env.GOOGLE_RECAPTCHA_SECRET_KEY;

  if (!secretKey && process.env.NODE_ENV !== 'production') {
    console.warn('[verifyCaptcha] GOOGLE_RECAPTCHA_SECRET_KEY is not set. Bypassing captcha in development.');
    return next();
  }

  try {
    // ponytail: native fetch replaces axios+qs — no extra deps needed
    const response = await fetch('https://www.google.com/recaptcha/api/siteverify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        secret: secretKey ?? '',
        response: captcha,
        ...(req.ip ? { remoteip: req.ip } : {}),
      }),
    });

    const data = await response.json() as { success: boolean };

    if (data.success) {
      next();
    } else {
      res.status(400).json({ success: false, errors: 'CAPTCHA verification failed. Please try again.' });
    }
  } catch (error) {
    res.status(500).json({ success: false, errors: 'CAPTCHA validation error' });
  }
};

export default verifyCaptcha;
