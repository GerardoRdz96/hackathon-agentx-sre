// Simulated e-commerce log entries for the log analyst agent
// Mix of normal operations and anomalous patterns

export interface LogEntry {
  timestamp: string;
  level: 'INFO' | 'WARN' | 'ERROR' | 'DEBUG';
  service: string;
  message: string;
  metadata?: Record<string, string | number>;
}

function ts(minutesAgo: number): string {
  const d = new Date(Date.now() - minutesAgo * 60 * 1000);
  return d.toISOString();
}

// Generate 200+ log entries with patterns
export const SIMULATED_LOGS: LogEntry[] = [
  // === Normal Payment Flow (sprinkled throughout) ===
  { timestamp: ts(120), level: 'INFO', service: 'payment', message: 'Payment intent created', metadata: { cart_id: 'cart_abc123', amount: 4999 } },
  { timestamp: ts(119), level: 'INFO', service: 'payment', message: 'Payment intent confirmed', metadata: { intent_id: 'pi_001', status: 'succeeded' } },
  { timestamp: ts(118), level: 'INFO', service: 'order', message: 'Order created from cart', metadata: { order_id: 'ord_001', cart_id: 'cart_abc123' } },
  { timestamp: ts(117), level: 'INFO', service: 'inventory', message: 'Inventory reserved', metadata: { variant_id: 'var_shoe_42', quantity: 1 } },
  { timestamp: ts(116), level: 'INFO', service: 'notification', message: 'Order confirmation email sent', metadata: { order_id: 'ord_001' } },

  // === Payment Failures Start (the anomaly) ===
  { timestamp: ts(95), level: 'INFO', service: 'payment', message: 'Payment intent created', metadata: { cart_id: 'cart_def456', amount: 12500 } },
  { timestamp: ts(94), level: 'ERROR', service: 'payment', message: 'Stripe API timeout after 30000ms', metadata: { intent_id: 'pi_002', error: 'ETIMEDOUT' } },
  { timestamp: ts(93), level: 'WARN', service: 'payment', message: 'Payment capture failed, no retry configured', metadata: { intent_id: 'pi_002' } },
  { timestamp: ts(92), level: 'ERROR', service: 'order', message: 'Order creation failed: payment not confirmed', metadata: { cart_id: 'cart_def456' } },

  // Normal traffic
  { timestamp: ts(90), level: 'INFO', service: 'api', message: 'GET /store/products 200', metadata: { duration_ms: 45, ip: '192.168.1.100' } },
  { timestamp: ts(89), level: 'INFO', service: 'api', message: 'GET /store/products/prod_001 200', metadata: { duration_ms: 32 } },
  { timestamp: ts(88), level: 'INFO', service: 'auth', message: 'Customer login successful', metadata: { customer_id: 'cust_789' } },
  { timestamp: ts(87), level: 'INFO', service: 'api', message: 'POST /store/cart 200', metadata: { duration_ms: 67 } },
  { timestamp: ts(86), level: 'DEBUG', service: 'inventory', message: 'Stock check: var_shoe_42 = 15 units', metadata: { variant_id: 'var_shoe_42' } },

  // More payment failures (pattern intensifying)
  { timestamp: ts(80), level: 'INFO', service: 'payment', message: 'Payment intent created', metadata: { cart_id: 'cart_ghi789', amount: 7500 } },
  { timestamp: ts(79), level: 'ERROR', service: 'payment', message: 'Stripe API timeout after 30000ms', metadata: { intent_id: 'pi_003', error: 'ETIMEDOUT' } },
  { timestamp: ts(78), level: 'ERROR', service: 'payment', message: 'Stripe API error: rate_limit_exceeded', metadata: { intent_id: 'pi_003' } },
  { timestamp: ts(77), level: 'ERROR', service: 'webhook', message: 'Webhook processing failed: payment_intent.payment_failed', metadata: { event_id: 'evt_003' } },
  { timestamp: ts(76), level: 'WARN', service: 'order', message: 'Cart abandoned after payment failure', metadata: { cart_id: 'cart_ghi789' } },

  // Database slowness appears
  { timestamp: ts(75), level: 'WARN', service: 'database', message: 'Query execution slow: 2340ms', metadata: { query: 'SELECT * FROM product WHERE...', duration_ms: 2340 } },
  { timestamp: ts(74), level: 'WARN', service: 'database', message: 'Connection pool near capacity: 18/20', metadata: { active: 18, max: 20 } },
  { timestamp: ts(73), level: 'INFO', service: 'api', message: 'GET /store/products 200', metadata: { duration_ms: 2100 } },
  { timestamp: ts(72), level: 'WARN', service: 'api', message: 'Response time exceeded threshold', metadata: { path: '/store/products', duration_ms: 2100, threshold_ms: 1000 } },

  // Normal operations continue
  { timestamp: ts(70), level: 'INFO', service: 'auth', message: 'Customer login successful', metadata: { customer_id: 'cust_101' } },
  { timestamp: ts(69), level: 'INFO', service: 'api', message: 'GET /store/cart 200', metadata: { duration_ms: 55 } },
  { timestamp: ts(68), level: 'INFO', service: 'inventory', message: 'Low stock alert: var_tshirt_L = 3 units', metadata: { variant_id: 'var_tshirt_L', quantity: 3 } },
  { timestamp: ts(67), level: 'INFO', service: 'notification', message: 'Low stock notification sent to admin', metadata: { variant_id: 'var_tshirt_L' } },

  // Webhook storm
  { timestamp: ts(65), level: 'WARN', service: 'webhook', message: 'Duplicate webhook event received', metadata: { event_id: 'evt_004', type: 'payment_intent.succeeded' } },
  { timestamp: ts(64), level: 'WARN', service: 'webhook', message: 'Duplicate webhook event received', metadata: { event_id: 'evt_004', type: 'payment_intent.succeeded' } },
  { timestamp: ts(63), level: 'WARN', service: 'webhook', message: 'Duplicate webhook event received', metadata: { event_id: 'evt_005', type: 'charge.succeeded' } },
  { timestamp: ts(62), level: 'ERROR', service: 'webhook', message: 'Webhook handler error: duplicate order creation attempted', metadata: { event_id: 'evt_004' } },
  { timestamp: ts(61), level: 'ERROR', service: 'order', message: 'Duplicate order detected for cart', metadata: { cart_id: 'cart_jkl012', existing_order: 'ord_002' } },

  // Inventory race condition
  { timestamp: ts(60), level: 'INFO', service: 'inventory', message: 'Inventory adjustment: var_shoe_42 -1', metadata: { variant_id: 'var_shoe_42', new_qty: 14 } },
  { timestamp: ts(59), level: 'INFO', service: 'inventory', message: 'Inventory adjustment: var_shoe_42 -1', metadata: { variant_id: 'var_shoe_42', new_qty: 14 } },
  { timestamp: ts(58), level: 'WARN', service: 'inventory', message: 'Possible race condition: same quantity after concurrent updates', metadata: { variant_id: 'var_shoe_42' } },

  // More payment timeouts
  { timestamp: ts(55), level: 'ERROR', service: 'payment', message: 'Stripe API timeout after 30000ms', metadata: { intent_id: 'pi_004', error: 'ETIMEDOUT' } },
  { timestamp: ts(54), level: 'ERROR', service: 'payment', message: 'Stripe API timeout after 30000ms', metadata: { intent_id: 'pi_005', error: 'ETIMEDOUT' } },
  { timestamp: ts(53), level: 'ERROR', service: 'payment', message: 'Payment capture failed', metadata: { intent_id: 'pi_004', error: 'timeout' } },
  { timestamp: ts(52), level: 'ERROR', service: 'payment', message: 'Stripe API error: rate_limit_exceeded', metadata: { intent_id: 'pi_005' } },
  { timestamp: ts(51), level: 'WARN', service: 'payment', message: '5 payment failures in last 10 minutes', metadata: { failure_count: 5 } },

  // 500 errors on API
  { timestamp: ts(50), level: 'ERROR', service: 'api', message: 'GET /store/products/prod_999 500', metadata: { error: 'product not found', duration_ms: 12 } },
  { timestamp: ts(49), level: 'ERROR', service: 'api', message: 'POST /store/cart/cart_mno345/payment-sessions 500', metadata: { error: 'Payment service unavailable' } },
  { timestamp: ts(48), level: 'ERROR', service: 'api', message: 'POST /store/cart/cart_pqr678/complete 500', metadata: { error: 'Order creation failed' } },

  // Rate limiter kicking in
  { timestamp: ts(47), level: 'WARN', service: 'rate-limiter', message: 'Rate limit exceeded for IP', metadata: { ip: '10.0.0.50', requests: 105, window: '60s' } },
  { timestamp: ts(46), level: 'WARN', service: 'rate-limiter', message: 'Rate limit exceeded for IP', metadata: { ip: '10.0.0.51', requests: 200, window: '60s' } },
  { timestamp: ts(45), level: 'WARN', service: 'rate-limiter', message: 'Potential DDoS: multiple IPs hitting rate limits', metadata: { blocked_ips: 5 } },

  // Database connection issues escalate
  { timestamp: ts(44), level: 'ERROR', service: 'database', message: 'Connection pool exhausted: 20/20', metadata: { active: 20, max: 20, waiting: 8 } },
  { timestamp: ts(43), level: 'ERROR', service: 'database', message: 'Query timeout after 5000ms', metadata: { query: 'INSERT INTO order...', duration_ms: 5000 } },
  { timestamp: ts(42), level: 'ERROR', service: 'database', message: 'Connection pool exhausted: 20/20', metadata: { active: 20, max: 20, waiting: 15 } },
  { timestamp: ts(41), level: 'ERROR', service: 'api', message: 'Multiple endpoints returning 503', metadata: { failing_endpoints: 4 } },

  // Auth issues
  { timestamp: ts(40), level: 'WARN', service: 'auth', message: 'Multiple failed login attempts', metadata: { email: 'admin@store.com', attempts: 12 } },
  { timestamp: ts(39), level: 'WARN', service: 'auth', message: 'Brute force detection: 12 failures in 5 min', metadata: { ip: '10.0.0.99' } },
  { timestamp: ts(38), level: 'INFO', service: 'auth', message: 'Customer login successful', metadata: { customer_id: 'cust_202' } },

  // Recovery signs
  { timestamp: ts(35), level: 'INFO', service: 'database', message: 'Connection pool recovered: 12/20', metadata: { active: 12, max: 20 } },
  { timestamp: ts(34), level: 'INFO', service: 'payment', message: 'Payment intent created', metadata: { cart_id: 'cart_stu901', amount: 3200 } },
  { timestamp: ts(33), level: 'INFO', service: 'payment', message: 'Payment intent confirmed', metadata: { intent_id: 'pi_006', status: 'succeeded' } },
  { timestamp: ts(32), level: 'INFO', service: 'order', message: 'Order created from cart', metadata: { order_id: 'ord_003', cart_id: 'cart_stu901' } },

  // Notification failures
  { timestamp: ts(30), level: 'ERROR', service: 'notification', message: 'Email service timeout', metadata: { template: 'order_confirmation', order_id: 'ord_003' } },
  { timestamp: ts(29), level: 'ERROR', service: 'notification', message: 'Slack webhook failed: 403 Forbidden', metadata: { webhook: 'order_alerts' } },
  { timestamp: ts(28), level: 'WARN', service: 'notification', message: 'Notification queue growing: 45 pending', metadata: { pending: 45 } },

  // More normal traffic
  { timestamp: ts(25), level: 'INFO', service: 'api', message: 'GET /store/products 200', metadata: { duration_ms: 85 } },
  { timestamp: ts(24), level: 'INFO', service: 'api', message: 'GET /store/collections 200', metadata: { duration_ms: 42 } },
  { timestamp: ts(23), level: 'INFO', service: 'inventory', message: 'Inventory adjustment: var_hat_M +50', metadata: { variant_id: 'var_hat_M', new_qty: 75 } },
  { timestamp: ts(22), level: 'INFO', service: 'api', message: 'POST /admin/products 201', metadata: { product_id: 'prod_new_001' } },
  { timestamp: ts(21), level: 'INFO', service: 'api', message: 'PUT /admin/products/prod_001 200', metadata: { updated_fields: 'price,description' } },

  // Second wave of payment issues
  { timestamp: ts(20), level: 'ERROR', service: 'payment', message: 'Stripe API timeout after 30000ms', metadata: { intent_id: 'pi_007', error: 'ETIMEDOUT' } },
  { timestamp: ts(19), level: 'ERROR', service: 'payment', message: 'Stripe API error: api_connection_error', metadata: { intent_id: 'pi_008' } },
  { timestamp: ts(18), level: 'ERROR', service: 'payment', message: 'Failed to create payment intent', metadata: { error: 'network_error', cart_id: 'cart_vwx234' } },
  { timestamp: ts(17), level: 'ERROR', service: 'webhook', message: 'Webhook verification failed: signature mismatch', metadata: { event_id: 'evt_006' } },
  { timestamp: ts(16), level: 'ERROR', service: 'payment', message: 'Stripe API timeout after 30000ms', metadata: { intent_id: 'pi_009', error: 'ETIMEDOUT' } },

  // Error handler leaking info
  { timestamp: ts(15), level: 'WARN', service: 'security', message: 'Stack trace leaked in error response', metadata: { path: '/store/cart/complete', status: 500 } },
  { timestamp: ts(14), level: 'WARN', service: 'security', message: 'SSL disabled for database connection', metadata: { env: 'production' } },

  // System health checks
  { timestamp: ts(12), level: 'INFO', service: 'health', message: 'Health check: API responding', metadata: { status: 'degraded', response_time_ms: 1500 } },
  { timestamp: ts(11), level: 'WARN', service: 'health', message: 'Health check: payment service degraded', metadata: { success_rate: 0.6 } },
  { timestamp: ts(10), level: 'INFO', service: 'health', message: 'Health check: database connection OK', metadata: { pool_usage: '14/20' } },
  { timestamp: ts(9), level: 'WARN', service: 'health', message: 'Health check: notification service backlog', metadata: { queue_depth: 52 } },

  // Current state
  { timestamp: ts(8), level: 'ERROR', service: 'payment', message: 'Stripe API timeout after 30000ms', metadata: { intent_id: 'pi_010', error: 'ETIMEDOUT' } },
  { timestamp: ts(7), level: 'ERROR', service: 'payment', message: 'Payment failure rate at 40%', metadata: { success: 6, failure: 4, total: 10 } },
  { timestamp: ts(6), level: 'WARN', service: 'order', message: 'Order completion rate dropped to 55%', metadata: { completed: 11, attempted: 20 } },
  { timestamp: ts(5), level: 'INFO', service: 'api', message: 'GET /store/products 200', metadata: { duration_ms: 95 } },
  { timestamp: ts(4), level: 'ERROR', service: 'payment', message: 'Customer complaint: payment charged but no order confirmation', metadata: { customer_id: 'cust_303' } },
  { timestamp: ts(3), level: 'ERROR', service: 'webhook', message: 'Webhook handler error: unhandled event type charge.updated', metadata: { event_id: 'evt_007' } },
  { timestamp: ts(2), level: 'INFO', service: 'api', message: 'GET /admin/orders 200', metadata: { duration_ms: 340 } },
  { timestamp: ts(1), level: 'WARN', service: 'monitoring', message: 'Alert: Payment success rate below threshold', metadata: { current: 0.6, threshold: 0.95 } },

  // Bulk normal entries to pad to 200+
  ...generateNormalTraffic(130),
];

function generateNormalTraffic(count: number): LogEntry[] {
  const services = ['api', 'auth', 'inventory', 'order', 'notification'];
  const endpoints = [
    'GET /store/products 200',
    'GET /store/collections 200',
    'GET /store/cart 200',
    'POST /store/cart/items 200',
    'GET /store/shipping-options 200',
    'GET /admin/orders 200',
    'GET /admin/products 200',
    'POST /admin/batch-jobs 201',
    'GET /store/customers/me 200',
    'PUT /store/customers/me 200',
  ];
  const entries: LogEntry[] = [];
  for (let i = 0; i < count; i++) {
    const minutesAgo = Math.floor(Math.random() * 120);
    const service = services[i % services.length];
    entries.push({
      timestamp: ts(minutesAgo),
      level: 'INFO',
      service,
      message: service === 'api'
        ? endpoints[i % endpoints.length]
        : `${service} operation completed successfully`,
      metadata: { duration_ms: Math.floor(Math.random() * 200) + 20 },
    });
  }
  return entries;
}

export function searchLogs(query: string, options?: {
  service?: string;
  level?: string;
  limit?: number;
}): LogEntry[] {
  const queryLower = query.toLowerCase();
  const keywords = queryLower.split(/\s+/);

  const filtered = SIMULATED_LOGS.filter(log => {
    const matchesQuery = keywords.some(kw =>
      log.message.toLowerCase().includes(kw) ||
      log.service.toLowerCase().includes(kw) ||
      JSON.stringify(log.metadata || {}).toLowerCase().includes(kw)
    );
    const matchesService = !options?.service || log.service === options.service;
    const matchesLevel = !options?.level || log.level === options.level;
    return matchesQuery && matchesService && matchesLevel;
  });

  // Sort by timestamp desc (most recent first)
  filtered.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  return filtered.slice(0, options?.limit || 50);
}

export function getAnomalousLogs(): LogEntry[] {
  return SIMULATED_LOGS.filter(log => log.level === 'ERROR' || log.level === 'WARN')
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
}
