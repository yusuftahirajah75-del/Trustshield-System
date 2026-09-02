const crypto = require("crypto");
const PaymentProvider = require("./paymentProvider");
const env = require("../../config/env");

class PaystackProvider extends PaymentProvider {
  constructor(config = {}) {
    super("paystack");
    this.secretKey = config.secretKey || env.paystackSecretKey;
    this.publicKey = config.publicKey || env.paystackPublicKey;
    this.webhookSecret = config.webhookSecret || env.paymentWebhookSecret || this.secretKey;
    this.baseUrl = config.baseUrl || env.paystackBaseUrl || "https://api.paystack.co";
    this.isTestOrDummy =
      !this.secretKey ||
      this.secretKey.startsWith("sk_test_trustshield_dummy") ||
      process.env.NODE_ENV === "test";
  }

  /**
   * Initializes a Paystack transaction
   */
  async initializeTransaction({
    email,
    amount,
    currency = "USD",
    reference,
    callbackUrl,
    metadata = {}
  }) {
    // Paystack amounts are in the lowest currency unit (cents or kobo)
    const subunitAmount = Math.round(Number(amount) * 100);

    // If in test or dummy secret environment without live network:
    if (this.isTestOrDummy && (!process.env.PAYSTACK_SECRET_KEY || process.env.PAYSTACK_SECRET_KEY.startsWith("sk_test_trustshield_dummy"))) {
      const mockAuthUrl = `${callbackUrl || `${env.clientUrl}/billing`}${
        (callbackUrl || "").includes("?") ? "&" : "?"
      }reference=${encodeURIComponent(reference)}&status=success&simulated=true`;

      return {
        authorizationUrl: mockAuthUrl,
        reference,
        accessCode: `mock_code_${reference}`,
        isSimulated: true
      };
    }

    // Live / Real Paystack API call
    const payload = {
      email,
      amount: subunitAmount,
      currency: currency.toUpperCase(),
      reference,
      callback_url: callbackUrl,
      metadata: {
        ...metadata,
        custom_fields: [
          {
            display_name: "TrustShield Plan",
            variable_name: "plan_slug",
            value: metadata.planSlug || "custom"
          }
        ]
      }
    };

    const res = await fetch(`${this.baseUrl}/transaction/initialize`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.secretKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    });

    const data = await res.json();

    if (!res.ok || !data.status) {
      throw new Error(
        data.message || `Paystack initialization failed with status ${res.status}`
      );
    }

    return {
      authorizationUrl: data.data.authorization_url,
      reference: data.data.reference,
      accessCode: data.data.access_code
    };
  }

  /**
   * Verifies a Paystack transaction by reference
   */
  async verifyTransaction(reference) {
    if (this.isTestOrDummy && (!process.env.PAYSTACK_SECRET_KEY || process.env.PAYSTACK_SECRET_KEY.startsWith("sk_test_trustshield_dummy"))) {
      return {
        success: true,
        status: "success",
        amount: 19.00,
        currency: "USD",
        transactionId: `mock_trx_${Date.now()}`,
        reference,
        paidAt: new Date(),
        customerEmail: "developer@trustshield.io",
        metadata: {},
        isSimulated: true
      };
    }

    const res = await fetch(
      `${this.baseUrl}/transaction/verify/${encodeURIComponent(reference)}`,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${this.secretKey}`,
          "Content-Type": "application/json"
        }
      }
    );

    const data = await res.json();

    if (!res.ok || !data.status) {
      throw new Error(
        data.message || `Paystack transaction verification failed with status ${res.status}`
      );
    }

    const txData = data.data;
    const isSuccess = txData.status === "success";

    return {
      success: isSuccess,
      status: txData.status,
      amount: Number(txData.amount) / 100, // convert back to major unit
      currency: txData.currency,
      transactionId: String(txData.id),
      reference: txData.reference,
      paidAt: txData.paid_at ? new Date(txData.paid_at) : new Date(),
      customerEmail: txData.customer?.email || null,
      customerCode: txData.customer?.customer_code || null,
      metadata: txData.metadata || {},
      raw: txData
    };
  }

  /**
   * Cryptographically verifies the Paystack HMAC SHA512 signature
   */
  verifyWebhookSignature(signature, rawBody) {
    if (!signature || !rawBody) {
      return false;
    }

    try {
      const hash = crypto
        .createHmac("sha512", this.webhookSecret)
        .update(rawBody)
        .digest("hex");

      const signatureBuffer = Buffer.from(signature, "hex");
      const hashBuffer = Buffer.from(hash, "hex");

      if (signatureBuffer.length !== hashBuffer.length) {
        return false;
      }

      return crypto.timingSafeEqual(signatureBuffer, hashBuffer);
    } catch (err) {
      console.error("Webhook signature verification error:", err);
      return false;
    }
  }

  /**
   * Parses and normalizes a Paystack webhook event
   */
  parseWebhookEvent(payload) {
    if (!payload || !payload.event) {
      throw new Error("Invalid Paystack webhook payload: missing event type");
    }

    const eventType = payload.event;
    const data = payload.data || {};

    const reference = data.reference || data.subscription_code || `evt_${data.id || Date.now()}`;
    const eventId = String(data.id || reference);
    const amount = data.amount ? Number(data.amount) / 100 : 0;
    const currency = data.currency || "USD";
    const status = data.status || (eventType === "charge.success" ? "success" : "pending");
    const customerEmail = data.customer?.email || null;
    const customerCode = data.customer?.customer_code || null;
    const subscriptionCode = data.subscription_code || null;

    return {
      eventType,
      eventId,
      reference,
      status,
      amount,
      currency,
      customerEmail,
      customerCode,
      subscriptionCode,
      metadata: data.metadata || {},
      raw: payload
    };
  }
}

module.exports = PaystackProvider;
