import dotenv from 'dotenv';
if (process.env.NODE_ENV !== 'production') {
  dotenv.config({ path: '.env.dev', override: true });
}
import './config/instrument.js';
import MongoStore from 'connect-mongo';
import cors, { CorsOptions } from 'cors';
import express from 'express';
import rateLimit from 'express-rate-limit';
import session from 'express-session';
import helmet from 'helmet';
import morgan from 'morgan';
import passport from 'passport';
import configurePassport from './config/passport';
import connectDB from './database/database';
import authRoute from './routes/authRoute';
import stripeWebhookRoute from './routes/stripeWebhookRoute';
import subscriptionRoute from './routes/subscriptionsRoute';
import userRoute from './routes/userRoutes';
import Sentry from '@sentry/node';

const app = express();
//cors policy to make request from other servers
const isProd = process.env.NODE_ENV === 'production';

if (isProd) {
  app.set('trust proxy', 1); // trust first proxy
}

function resolveFrontEndUrl(): string {
  const raw = process.env.FRONT_END_URL || (isProd ? '' : 'localhost:5173');
  if (/^https?:\/\//i.test(raw)) {
    return raw.replace(/\/+$/, '');
  }
  return `${isProd ? 'https://' : 'http://'}${raw}`.replace(/\/+$/, '');
}

export const frontEndUrl = resolveFrontEndUrl();

// Additional allowed origins beyond the primary frontend (e.g. Stripe, secondary domains)
// Set CORS_EXTRA_ORIGINS as a comma-separated list in your environment
const extraOrigins = process.env.CORS_EXTRA_ORIGINS
  ? process.env.CORS_EXTRA_ORIGINS.split(',').map((o) => o.trim())
  : [];
const whiteList = [frontEndUrl, 'https://m.stripe.com', 'https://stripe.com', ...extraOrigins];

const corsOptions: CorsOptions = {
  origin: (origin, callback) => {
    // Allow requests with no origin (direct navigation, Postman, curl)
    if (!origin) return callback(null, true);

    if (isProd) {
      // Production: Only allow exact public frontend domain
      return origin === frontEndUrl || whiteList.includes(origin!)
        ? callback(null, true)
        : callback(new Error('Not allowed by CORS (production mode)'));
    }

    // ---------------- DEVELOPMENT ----------------

    // Allow local dev frontend
    if (origin === frontEndUrl) {
      return callback(null, true);
    }

    // Allow localhost / 127.0.0.1 fallbacks
    if (/^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)) {
      return callback(null, true);
    }

    return callback(new Error(`Not allowed by CORS (dev mode): ${origin}`));
  },
  credentials: true,
};
const limiter = rateLimit({
  windowMs: 10 * 60 * 1000, // 10 minutes
  limit: 700, // Limit each IP to 700 requests per window (10 minutes)
  standardHeaders: 'draft-8', // draft-6: `RateLimit-*` headers; draft-7 & draft-8: combined `RateLimit` header
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers.
  ipv6Subnet: 56, // Set to 60 or 64 to be less aggressive, or 52 or 48 to be more aggressive
  // keyGenerator: (req, res) => ipKeyGenerator(req.ip as string)
});

// this route need to come before express.json() because it uses raw data not json() and before csrf
app.use('/webhook', express.raw({ type: 'application/json' }));
app.use('/webhook', stripeWebhookRoute);

app.use(cors(corsOptions));
app.use(limiter);
app.use(morgan('combined'));
// app.use(cookieParser());
app.use(helmet());
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

const sessionSecret =
  process.env.EXPRESS_SESSION_SECRET ||
  process.env.EXPRESS_SECTION_SECRET ||
  (isProd ? '' : 'saas-dev-session-secret-change-in-production');

if (isProd && !sessionSecret) {
  throw new Error('EXPRESS_SESSION_SECRET environment variable is required in production');
}

app.use(
  session({
    secret: sessionSecret,
    resave: false,
    saveUninitialized: false,
    name: 'connect.sid',
    store: MongoStore.create({
      mongoUrl: process.env.DB_STRING as string,
      ttl: 14 * 24 * 60 * 60,
      autoRemove: 'native',
    }),
    cookie: {
      secure: process.env.NODE_ENV === 'production', // HTTPS in production
      sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
      maxAge: 14 * 24 * 60 * 60 * 1000, // 14 days
      httpOnly: true, // ← ADD THIS for security
      path: '/',
    },
  }),
);

configurePassport(passport);

// Passport middleware
app.use(passport.initialize());
app.use(passport.session());

app.use('/api/auth', authRoute);
app.use('/api/user', userRoute);
app.use('/api/subscriptions', subscriptionRoute);

Sentry.setupExpressErrorHandler(app);

// Global JSON error handler — ensures consistent API response shape across all failures
app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  const statusCode = typeof err.status === 'number' ? err.status : typeof err.statusCode === 'number' ? err.statusCode : 500;
  const message = isProd && statusCode === 500 ? 'Internal Server Error' : (err.message || 'An unexpected error occurred');
  res.status(statusCode).json({
    success: false,
    message,
    errors: err.errors || [message],
  });
});

const startServer = async () => {
  await connectDB();

  const PORT = process.env.APP_PORT || 3000;
  app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
};

startServer()
 .catch((err) => {
    console.error('Failed to start server:', err);
    process.exit(1);
  });
