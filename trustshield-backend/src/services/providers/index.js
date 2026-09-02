const PaystackProvider = require("./paystackProvider");

class PaymentProviderFactory {
  constructor() {
    this.providers = new Map();
    // Register default providers
    this.registerProvider("paystack", new PaystackProvider());
  }

  registerProvider(name, providerInstance) {
    this.providers.set(name.toLowerCase(), providerInstance);
  }

  getProvider(name = "paystack") {
    const provider = this.providers.get(name.toLowerCase());
    if (!provider) {
      throw new Error(`Payment provider '${name}' is not configured or supported`);
    }
    return provider;
  }
}

const factory = new PaymentProviderFactory();

module.exports = {
  paymentProviderFactory: factory,
  defaultProvider: factory.getProvider("paystack")
};
