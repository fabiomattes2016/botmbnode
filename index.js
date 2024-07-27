require("dotenv").config();
const { default: axios } = require("axios");
const WebSocket = require("ws");
const notifier = require("node-notifier");


const telegram_token = process.env.TELEGRAM_TOKEN
const chatId = process.env.TELEGRAM_CHAT_ID

const ws = new WebSocket(`${process.env.STREAM_URL}`);
var asset = "";
var brl = "";

let sellPrice = 0;
let stopLoss = 0;
let access_token = "";
let accountId = `${process.env.ACCOUNT_ID}`;

login();

ws.onopen = () => {
  ws.send(
    JSON.stringify({
      type: "subscribe",
      subscription: {
        name: "ticker",
        id: `${process.env.STREAM_ID}`,
      },
    })
  );
};

ws.onmessage = (event) => {
  console.clear();
  const obj = JSON.parse(event.data);

  if (obj.type !== "ticker") return;

  let tendencia = tendenciaBitcoin(obj.data);

  if (sellPrice === 0 && tendencia === "comprar") {
    sellPrice = parseFloat(obj.data.sell) * parseFloat(process.env.PROFITABILITY);
    stopLoss = parseFloat(obj.data.sell) * (2 - parseFloat(process.env.STOP_LOSS));

    console.log(`Comprou a ${obj.data.sell}`);
    console.log(`Stoploss: ${stopLoss}`);

    sendMessage(`Atenção! Comprou ${process.env.BUY_QTDE} a R$ ${obj.data.sell}`);

    notifier.notify(
      {
        title: `Atenção! Comprou ${process.env.BUY_QTDE} a R$ ${obj.data.sell}`,
        message: `Preço de venda ${sellPrice.toFixed(2)}! Com Stop loss de R$ ${stopLoss.toFixed(2)}`,
        sound: true, // Toca um som na notificação, se suportado
        wait: false, // Espera até que o usuário interaja com a notificação
      },
      (err, response, metadata) => {
        if (err) {
          console.error("Erro ao exibir notificação:", err);
        } else {
          console.log("Notificação exibida com sucesso");
        }
      }
    );
  } else if (tendencia === "vender") {
    if (parseFloat(obj.data.buy) >= sellPrice) {
      console.log(`Vendeu a ${sellPrice}`);

      sendMessage(`Vendeu ${process.env.BUY_QTDE} a R$ ${sellPrice.toFixed(2)}!`);

      notifier.notify(
        {
          title: "Atenção",
          message: `Vendeu ${process.env.BUY_QTDE} a R$ ${sellPrice.toFixed(2)}!`,
          sound: true, // Toca um som na notificação, se suportado
          wait: false, // Espera até que o usuário interaja com a notificação
        },
        (err, response, metadata) => {
          if (err) {
            console.error("Erro ao exibir notificação:", err);
          } else {
            console.log("Notificação exibida com sucesso");
          }
        }
      );
    } else if(parseFloat(obj.data.buy) <= stopLoss) {
      console.log(`Alcançou o Stop loss de ${stopLoss}`);

      sendMessage(`Alcançou o Stop loss de R$ ${stopLoss.toFixed(2)}!`);

      notifier.notify(
        {
          title: "Atenção",
          message: `Alcançou o Stop loss de R$ ${stopLoss.toFixed(2)}!`,
          sound: true, // Toca um som na notificação, se suportado
          wait: false, // Espera até que o usuário interaja com a notificação
        },
        (err, response, metadata) => {
          if (err) {
            console.error("Erro ao exibir notificação:", err);
          } else {
            console.log("Notificação exibida com sucesso");
          }
        }
      );
    }
  } else {
    console.log("Aguardando melhor momento...");
  }
};

function tendenciaBitcoin(dados) {
  const ultimoPreco = parseFloat(dados.last);
  const precoCompra = parseFloat(dados.buy);
  const precoVenda = parseFloat(dados.sell);
  const precoAbertura = parseFloat(dados.open);

  if (ultimoPreco > precoAbertura && ultimoPreco < precoVenda) {
    return "comprar";
  } else if (ultimoPreco < precoAbertura && ultimoPreco > precoCompra) {
    return "vender";
  } else {
    return "neutro";
  }
}

async function getAccounId(access_token) {
  const url = `${process.env.API_URL}/accounts`;
  const headers = { Authorization: `Bearer ${access_token}` };

  const { data } = await axios.get(url, { headers });
  console.log(data);
}

async function getAssetBalance(access_token, accountId, symbol) {
  const url = `${process.env.API_URL}/accounts/${accountId}/balances`;
  const headers = { Authorization: `Bearer ${access_token}` };

  const { data } = await axios.get(url, { headers });
  const result = data.find((item) => item.symbol === symbol);

  asset = parseFloat(result.available);

  console.log(`Saldo BTC: ${asset}`);
}

async function getBrlBalance(access_token, accountId) {
  const url = `${process.env.API_URL}/accounts/${accountId}/balances`;
  const headers = { Authorization: `Bearer ${access_token}` };

  const { data } = await axios.get(url, { headers });
  const result = data.find((item) => item.symbol === "BRL");

  brl = parseFloat(result.available);

  console.log(`Saldo BRL: ${brl}`);
}

async function login() {
  const url = `${process.env.API_URL}/authorize`;
  const body = { login: process.env.API_KEY, password: process.env.API_SECRET };
  const { data } = await axios.post(url, body);

  access_token = data.access_token;
  console.log("Acesso autorizado!");

  setTimeout(login, data.expiration * 1000 - Date.now());
}

async function newOrder(side, type) {
  const url = `${process.env.API_URL}/accounts/${process.env.ACCOUNT_ID}/${process.env.SYMBOL}/orders`;
  const body = {
    qty: parseFloat(process.env.BUY_QTDE),
    side,
    type,
  };
  const headers = { Authorization: `Bearer ${access_token}` };

  try {
    const { data } = axios.post(url, body, { headers });
  } catch (err) {
    console.error(err.response ? err.response.data : err.message);
    process.exit(0);
  }
}

function sendMessage(message) {
  const url = `https://api.telegram.org/bot${telegram_token}/sendMessage`
  headers = {'Content-Type': 'application/json' }
  body = {
    chat_id: chatId,
    text: message
  }

  axios.post(url, body, { headers });
}
