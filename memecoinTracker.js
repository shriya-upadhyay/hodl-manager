require('dotenv').config();
const axios = require('axios');

async function getMemeCoinPrices() {
  try {
    const response = await axios.get('https://pro-api.coinmarketcap.com/v1/cryptocurrency/quotes/latest', {
      headers: {
        'X-CMC_PRO_API_KEY': process.env.CMC_API_KEY,
      },
      params: {
        id: '74,5994,24478,10804,23095', // DOGE, SHIB, PEPE, FLOKI, BONK
        convert: 'USD'
      }
    });

    console.log('\n🚀 MEME COIN PRICES 🚀\n');
    
    const coins = response.data.data;
    for (const coinId in coins) {
      const coin = coins[coinId];
      const price = coin.quote.USD;
      
      console.log(`${coin.name} (${coin.symbol})`);
      console.log(`Price: $${price.price.toFixed(6)}`);
      console.log(`24h: ${price.percent_change_24h.toFixed(2)}%`);
      console.log('---');
    }
    
  } catch (error) {
    console.error('Error:', error.response?.data?.status || error.message);
  }
}

getMemeCoinPrices();