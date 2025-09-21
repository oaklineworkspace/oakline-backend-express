// controllers/stripe/stripeWebhookController.js
import Stripe from 'stripe';
import { supabaseAdmin } from '../../lib/supabaseClient.js';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

export const stripeWebhook = async (req, res) => {
  const sig = req.headers['stripe-signature'];

  let event;
  try {
    // Stripe requires the raw request body
    event = stripe.webhooks.constructEvent(
      req.body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    console.error('Webhook signature verification failed:', err);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  switch (event.type) {
    case 'payment_intent.succeeded':
      const paymentIntent = event.data.object;
      await supabaseAdmin
        .from('transactions')
        .update({ status: 'completed' })
        .eq('stripe_payment_intent_id', paymentIntent.id);
      break;

    case 'payment_intent.payment_failed':
      const failedIntent = event.data.object;
      await supabaseAdmin
        .from('transactions')
        .update({ status: 'failed' })
        .eq('stripe_payment_intent_id', failedIntent.id);
      break;

    default:
      console.log(`Unhandled event type ${event.type}`);
  }

  res.json({ received: true });
};
