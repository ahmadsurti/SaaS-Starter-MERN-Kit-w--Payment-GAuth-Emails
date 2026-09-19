import express from 'express';
import * as webhookController from '../controllers/stripeWebhookController';
const route = express.Router();

// express.raw({ type: 'application/json' }) is applied at the app level in server.ts
// before this router is mounted, so we do not re-apply it here.
route.post('/', webhookController.handleWebhook);

export default route;