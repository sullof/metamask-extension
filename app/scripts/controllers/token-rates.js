const ObservableStore = require('obs-store')
const log = require('loglevel')

// By default, poll every 3 minutes
const DEFAULT_INTERVAL = 180 * 1000

/**
 * A controller that polls for token exchange
 * rates based on a user's current token list
 */
class TokenRatesController {
  /**
   * Creates a TokenRatesController
   *
   * @param {Object} [config] - Options to configure controller
   */
  constructor ({ interval = DEFAULT_INTERVAL, preferences } = {}) {
    this.store = new ObservableStore()
    this.preferences = preferences
    this.interval = interval
  }

  /**
   * Updates exchange rates for all tokens
   */
  async updateExchangeRates () {
    if (!this.isActive) { return }
    const contractExchangeRates = {}
    const pairs = this._tokens.map(token => `pairs[]=${token.address}/ETH`)
    const query = pairs.join('&')
    if (this._tokens.length > 0) {
      try {
        const response = await fetch(`https://exchanges.demo.balanc3.net/pie?${query}&autoConversion=true`)
        const { prices = [] } = await response.json()
        prices.forEach(({ pair, price }) => {
          contractExchangeRates[pair.split('/')[0]] = typeof price === 'number' ? price : 0
        })
      } catch (error) {
        log.warn(`MetaMask - TokenRatesController exchange rate fetch failed.`, error)
      }
    }
    this.store.putState({ contractExchangeRates })
  }

  /**
   * @type {Number}
   */
  set interval (interval) {
    this._handle && clearInterval(this._handle)
    if (!interval) { return }
    this._handle = setInterval(() => { this.updateExchangeRates() }, interval)
  }

  /**
   * @type {Object}
   */
  set preferences (preferences) {
    this._preferences && this._preferences.unsubscribe()
    if (!preferences) { return }
    this._preferences = preferences
    this.tokens = preferences.getState().tokens
    preferences.subscribe(({ tokens = [] }) => { this.tokens = tokens })
  }

  /**
   * @type {Array}
   */
  set tokens (tokens) {
    this._tokens = tokens
    this.updateExchangeRates()
  }
}

module.exports = TokenRatesController
