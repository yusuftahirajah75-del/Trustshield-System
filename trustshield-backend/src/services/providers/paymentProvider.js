/**
 * PaymentProvider Interface / Base Abstract Class
 *
 * All payment providers (Paystack, Stripe, Flutterwave, etc.) must implement this interface.
 * This ensures the billing and subscription services are decoupled from provider-specific APIs.
 */
class PaymentProvider {
  constructor(name) {
    if (new.target === PaymentProvider) {
      throw new TypeError("Cannot construct PaymentProvider abstract instances directly");
    }
    this.name = name;
  }

  /**
   * Initialize a checkout session / transaction with the provider
   * @param {Object} params
   * @param {string} params.email - Customer email address
   * @param {number} params.amount - Major currency amount (e.g. 19.00)
   * @param {string} params.currency - e.g. "USD" or "NGN"
   * @param {string} params.reference - Unique internal transaction reference
   * @param {string} params.callbackUrl - Browser redirect URL upon completion
   * @param {Object} params.metadata - Custom metadata passed to provider
   * @returns {Promise<{ authorizationUrl: string, reference: string, accessCode: string }>}
   */
  async initializeTransaction(params) {
    throw new Error("Method 'initializeTransaction()' must be implemented");
  }

  /**
   * Verify transaction status with provider API
   * @param {string} reference - Transaction reference
   * @returns {Promise<{ success: boolean, status: string, amount: number, currency: string, transactionId: string, paidAt: Date, metadata: Object }>}
   */
  async verifyTransaction(reference) {
    throw new Error("Method 'verifyTransaction()' must be implemented");
  }

  /**
   * Cryptographically verify the webhook signature sent by the provider
   * @param {string} signature - Header signature from request
   * @param {Buffer|string} rawBody - Raw body buffer of the incoming HTTP request
   * @returns {boolean}
   */
  verifyWebhookSignature(signature, rawBody) {
    throw new Error("Method 'verifyWebhookSignature()' must be implemented");
  }

  /**
   * Parse provider webhook payload into normalized event representation
   * @param {Object} payload - Parsed JSON body
   * @returns {{ eventType: string, eventId: string, reference: string, status: string, amount: number, currency: string, customerEmail: string, metadata: Object, raw: Object }}
   */
  parseWebhookEvent(payload) {
    throw new Error("Method 'parseWebhookEvent()' must be implemented");
  }
}

module.exports = PaymentProvider;
