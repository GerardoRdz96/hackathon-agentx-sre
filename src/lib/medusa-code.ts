// Simulated Medusa.js source code snippets for the code analyst agent to search
// These represent a real e-commerce platform's key modules

export interface CodeFile {
  path: string;
  content: string;
  lastModified: string;
}

export const MEDUSA_CODE_FILES: CodeFile[] = [
  {
    path: 'src/services/payment.ts',
    lastModified: '2026-04-05T14:30:00Z',
    content: `import { PaymentService } from '@medusajs/medusa';
import Stripe from 'stripe';

class CustomPaymentService extends PaymentService {
  private stripe: Stripe;

  constructor(container) {
    super(container);
    this.stripe = new Stripe(process.env.STRIPE_API_KEY!, { apiVersion: '2024-12-18.acacia' });
  }

  async createPayment(cart) {
    try {
      const intent = await this.stripe.paymentIntents.create({
        amount: cart.total,
        currency: cart.region.currency_code,
        metadata: { cart_id: cart.id },
      });
      // BUG: Missing error handling for network timeouts
      return { id: intent.id, status: intent.status };
    } catch (error) {
      // Only catches Stripe errors, not network errors
      throw new Error(\`Payment failed: \${error.message}\`);
    }
  }

  async capturePayment(paymentId: string) {
    const intent = await this.stripe.paymentIntents.capture(paymentId);
    // WARNING: No retry logic for transient failures
    return { status: intent.status };
  }

  async refundPayment(paymentId: string, amount?: number) {
    const refund = await this.stripe.refunds.create({
      payment_intent: paymentId,
      amount,
    });
    return { id: refund.id, status: refund.status };
  }
}

export default CustomPaymentService;`,
  },
  {
    path: 'src/services/inventory.ts',
    lastModified: '2026-04-04T09:15:00Z',
    content: `import { InventoryService } from '@medusajs/medusa';

class CustomInventoryService extends InventoryService {
  async adjustInventory(variantId: string, quantity: number) {
    const variant = await this.retrieve(variantId);

    // RACE CONDITION: No locking mechanism for concurrent updates
    const newQuantity = variant.inventory_quantity + quantity;

    if (newQuantity < 0) {
      throw new Error('Insufficient inventory');
    }

    await this.update(variantId, { inventory_quantity: newQuantity });

    // Check low stock threshold
    if (newQuantity <= 5) {
      await this.notifyLowStock(variantId, newQuantity);
    }

    return { variantId, newQuantity };
  }

  async reserveInventory(items: Array<{ variantId: string; quantity: number }>) {
    // BUG: Not wrapped in transaction - partial failures leave inconsistent state
    for (const item of items) {
      await this.adjustInventory(item.variantId, -item.quantity);
    }
  }

  private async notifyLowStock(variantId: string, quantity: number) {
    console.log(\`Low stock alert: \${variantId} has \${quantity} units\`);
    // TODO: Implement webhook notification
  }
}

export default CustomInventoryService;`,
  },
  {
    path: 'src/api/webhooks/stripe.ts',
    lastModified: '2026-04-06T02:00:00Z',
    content: `import { Router } from 'express';
import Stripe from 'stripe';

const router = Router();
const stripe = new Stripe(process.env.STRIPE_API_KEY!);

router.post('/webhooks/stripe', async (req, res) => {
  const sig = req.headers['stripe-signature'];

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(
      req.body,
      sig as string,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (err) {
    console.error('Webhook signature verification failed:', err);
    return res.status(400).send('Webhook Error');
  }

  // BUG: No idempotency check - duplicate events processed multiple times
  switch (event.type) {
    case 'payment_intent.succeeded':
      await handlePaymentSuccess(event.data.object as Stripe.PaymentIntent);
      break;
    case 'payment_intent.payment_failed':
      await handlePaymentFailure(event.data.object as Stripe.PaymentIntent);
      break;
    case 'charge.dispute.created':
      await handleDispute(event.data.object);
      break;
    default:
      console.log('Unhandled event type:', event.type);
  }

  res.json({ received: true });
});

async function handlePaymentSuccess(intent: Stripe.PaymentIntent) {
  const orderId = intent.metadata.order_id;
  // WARNING: No timeout on database operation
  await updateOrderStatus(orderId, 'paid');
  await sendConfirmationEmail(orderId);
}

async function handlePaymentFailure(intent: Stripe.PaymentIntent) {
  const orderId = intent.metadata.order_id;
  await updateOrderStatus(orderId, 'payment_failed');
  // BUG: cart_id used in creation but order_id used here - mismatch
}

async function handleDispute(dispute: any) {
  console.error('DISPUTE CREATED:', dispute.id);
  // TODO: Implement proper dispute handling
}

async function updateOrderStatus(orderId: string, status: string) { /* db call */ }
async function sendConfirmationEmail(orderId: string) { /* email service */ }

export default router;`,
  },
  {
    path: 'src/services/auth.ts',
    lastModified: '2026-04-03T16:45:00Z',
    content: `import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';

const JWT_SECRET = process.env.JWT_SECRET || 'default-secret-change-me';
const TOKEN_EXPIRY = '24h';

export class AuthService {
  async login(email: string, password: string) {
    const customer = await this.findCustomerByEmail(email);
    if (!customer) {
      throw new Error('Invalid credentials');
    }

    const isValid = await bcrypt.compare(password, customer.password_hash);
    if (!isValid) {
      // WARNING: No rate limiting on login attempts
      throw new Error('Invalid credentials');
    }

    const token = jwt.sign(
      { customerId: customer.id, email: customer.email },
      JWT_SECRET,
      { expiresIn: TOKEN_EXPIRY }
    );

    return { token, customer: { id: customer.id, email: customer.email } };
  }

  async verifyToken(token: string) {
    try {
      return jwt.verify(token, JWT_SECRET);
    } catch {
      throw new Error('Invalid or expired token');
    }
  }

  async findCustomerByEmail(email: string) {
    // Simulated DB lookup
    return null;
  }
}

export default new AuthService();`,
  },
  {
    path: 'src/api/middleware/rate-limiter.ts',
    lastModified: '2026-04-05T11:00:00Z',
    content: `// Simple in-memory rate limiter
// WARNING: Does not work in multi-instance deployments (no shared state)

const requestCounts = new Map<string, { count: number; resetAt: number }>();

export function rateLimiter(maxRequests: number = 100, windowMs: number = 60000) {
  return (req: any, res: any, next: any) => {
    const key = req.ip || req.headers['x-forwarded-for'] || 'unknown';
    const now = Date.now();

    let entry = requestCounts.get(key);
    if (!entry || now > entry.resetAt) {
      entry = { count: 0, resetAt: now + windowMs };
      requestCounts.set(key, entry);
    }

    entry.count++;

    if (entry.count > maxRequests) {
      return res.status(429).json({ error: 'Too many requests' });
    }

    // BUG: Memory leak - old entries never cleaned up
    next();
  };
}`,
  },
  {
    path: 'src/services/order.ts',
    lastModified: '2026-04-05T18:20:00Z',
    content: `import { OrderService } from '@medusajs/medusa';

class CustomOrderService extends OrderService {
  async createOrder(cartId: string) {
    const cart = await this.cartService.retrieve(cartId, {
      relations: ['items', 'payment', 'shipping_methods'],
    });

    // Validate cart has payment
    if (!cart.payment) {
      throw new Error('Cart has no payment');
    }

    // BUG: Race condition between payment verification and order creation
    const order = await super.createWithPayment(cartId);

    // Post-order processing
    try {
      await this.inventoryService.reserveInventory(
        cart.items.map(i => ({ variantId: i.variant_id, quantity: i.quantity }))
      );
    } catch (error) {
      // WARNING: Order created but inventory not reserved - inconsistent state
      console.error('Failed to reserve inventory for order:', order.id, error);
      // Does not roll back the order
    }

    await this.eventBus.emit('order.placed', { id: order.id });
    return order;
  }

  async cancelOrder(orderId: string) {
    const order = await this.retrieve(orderId, { relations: ['items'] });

    // Release inventory
    for (const item of order.items) {
      await this.inventoryService.adjustInventory(item.variant_id, item.quantity);
    }

    // Process refund
    await this.paymentService.refundPayment(order.payment_id);

    return await this.update(orderId, { status: 'canceled' });
  }
}

export default CustomOrderService;`,
  },
  {
    path: 'src/api/routes/products.ts',
    lastModified: '2026-04-04T13:00:00Z',
    content: `import { Router } from 'express';

const router = Router();

router.get('/store/products', async (req, res) => {
  try {
    const { limit = 20, offset = 0, category } = req.query;

    // WARNING: No input validation on limit/offset - potential DoS
    const products = await req.scope.resolve('productService').list(
      { ...(category && { category_id: [category] }) },
      { take: Number(limit), skip: Number(offset), relations: ['variants', 'images'] }
    );

    res.json({ products, count: products.length });
  } catch (error) {
    console.error('Product listing error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/store/products/:id', async (req, res) => {
  try {
    const product = await req.scope.resolve('productService').retrieve(
      req.params.id,
      { relations: ['variants', 'images', 'options'] }
    );
    res.json({ product });
  } catch (error) {
    // BUG: Returns 500 for not-found instead of 404
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;`,
  },
  {
    path: 'src/subscribers/order-notification.ts',
    lastModified: '2026-04-05T20:00:00Z',
    content: `class OrderNotificationSubscriber {
  constructor({ eventBusService, notificationService }) {
    eventBusService.subscribe('order.placed', this.handleOrderPlaced);
    eventBusService.subscribe('order.canceled', this.handleOrderCanceled);
    eventBusService.subscribe('order.refund_created', this.handleRefund);
  }

  handleOrderPlaced = async (data: { id: string }) => {
    // WARNING: No dead letter queue - failed notifications are lost
    try {
      await this.sendEmail(data.id, 'order_confirmation');
      await this.sendSlackNotification(data.id, 'New order placed');
    } catch (error) {
      console.error('Notification failed for order:', data.id, error);
      // Swallows error - no retry mechanism
    }
  };

  handleOrderCanceled = async (data: { id: string }) => {
    await this.sendEmail(data.id, 'order_canceled');
  };

  handleRefund = async (data: { id: string }) => {
    await this.sendEmail(data.id, 'refund_processed');
  };

  private async sendEmail(orderId: string, template: string) {
    // Simulated email sending
    console.log(\`Sending \${template} email for order \${orderId}\`);
  }

  private async sendSlackNotification(orderId: string, message: string) {
    // BUG: Hardcoded webhook URL, should be env variable
    const webhookUrl = 'https://hooks.slack.com/services/T00000000/B00000000/XXXXXXXX';
    // fetch(webhookUrl, { method: 'POST', body: JSON.stringify({ text: message }) });
  }
}

export default OrderNotificationSubscriber;`,
  },
  {
    path: 'src/loaders/database.ts',
    lastModified: '2026-04-02T08:30:00Z',
    content: `import { DataSource } from 'typeorm';

const AppDataSource = new DataSource({
  type: 'postgres',
  url: process.env.DATABASE_URL,
  entities: ['dist/models/*.js'],
  migrations: ['dist/migrations/*.js'],
  logging: process.env.NODE_ENV === 'development',
  // WARNING: No connection pool limits set - defaults may be too high
  // WARNING: No query timeout configured
  extra: {
    // BUG: SSL disabled in production for "convenience"
    ssl: process.env.NODE_ENV === 'production' ? false : false,
  },
});

export async function initializeDatabase() {
  try {
    await AppDataSource.initialize();
    console.log('Database connected');

    // Run pending migrations
    await AppDataSource.runMigrations();
    console.log('Migrations complete');
  } catch (error) {
    console.error('Database initialization failed:', error);
    // BUG: Process continues even if DB connection fails
  }
}

export default AppDataSource;`,
  },
  {
    path: 'src/api/middleware/error-handler.ts',
    lastModified: '2026-04-05T15:00:00Z',
    content: `export function errorHandler(err: any, req: any, res: any, next: any) {
  console.error('Unhandled error:', err);

  // WARNING: Leaks stack trace in production
  const response = {
    error: err.message || 'Internal server error',
    ...(process.env.NODE_ENV !== 'production' && { stack: err.stack }),
    code: err.code || 'INTERNAL_ERROR',
  };

  // BUG: Always returns 500, doesn't check for known error types
  const statusCode = err.statusCode || 500;

  res.status(statusCode).json(response);
}`,
  },
];

// Simulated git log for "recent deployments"
export const SIMULATED_GIT_LOG = `commit a3f8c2d (HEAD -> main, origin/main)
Author: deploy-bot <deploy@medusa-store.com>
Date:   Sun Apr 6 02:00:00 2026 -0600
    fix: update stripe webhook handler for new event types

commit 7e91b4a
Author: dev-sarah <sarah@medusa-store.com>
Date:   Sat Apr 5 18:20:00 2026 -0600
    feat: add order cancellation with inventory release

commit c4d2f1e
Author: dev-marcus <marcus@medusa-store.com>
Date:   Sat Apr 5 15:00:00 2026 -0600
    fix: improve error handler middleware

commit 9a8b3c7
Author: dev-sarah <sarah@medusa-store.com>
Date:   Sat Apr 5 14:30:00 2026 -0600
    hotfix: payment service timeout handling (partial)

commit e5f7d2a
Author: dev-marcus <marcus@medusa-store.com>
Date:   Sat Apr 5 11:00:00 2026 -0600
    feat: add rate limiter middleware

commit b2c4e8f
Author: deploy-bot <deploy@medusa-store.com>
Date:   Fri Apr 4 13:00:00 2026 -0600
    feat: product listing with category filter

commit 1d3a5b7
Author: dev-sarah <sarah@medusa-store.com>
Date:   Fri Apr 4 09:15:00 2026 -0600
    refactor: inventory service with low stock alerts

commit 8f2e6c9
Author: dev-marcus <marcus@medusa-store.com>
Date:   Thu Apr 3 16:45:00 2026 -0600
    feat: auth service with JWT tokens

commit 4a7d9e1
Author: deploy-bot <deploy@medusa-store.com>
Date:   Wed Apr 2 08:30:00 2026 -0600
    chore: database loader configuration`;

export function searchCodeFiles(query: string): CodeFile[] {
  const queryLower = query.toLowerCase();
  const keywords = queryLower.split(/\s+/);

  return MEDUSA_CODE_FILES.filter(file => {
    const contentLower = file.content.toLowerCase();
    const pathLower = file.path.toLowerCase();
    return keywords.some(kw => contentLower.includes(kw) || pathLower.includes(kw));
  }).sort((a, b) => {
    // Sort by relevance (number of keyword matches)
    const aScore = keywords.filter(kw => a.content.toLowerCase().includes(kw) || a.path.toLowerCase().includes(kw)).length;
    const bScore = keywords.filter(kw => b.content.toLowerCase().includes(kw) || b.path.toLowerCase().includes(kw)).length;
    return bScore - aScore;
  });
}

export function getRecentChanges(hours: number = 48): CodeFile[] {
  const cutoff = new Date(Date.now() - hours * 60 * 60 * 1000);
  return MEDUSA_CODE_FILES.filter(f => new Date(f.lastModified) > cutoff);
}
