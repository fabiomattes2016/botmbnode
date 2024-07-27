const { default: axios } = require("axios");

const token = '7189117556:AAEt3A8mU1xad84RqxQgmTzH9EB1nuL9Feo'; // Substitua pelo seu token
const url = `https://api.telegram.org/bot${token}/getUpdates`;


axios.get(url)
    .then(data => {
        //
        console.log(data.data.result[0])
    })
    .catch(error => console.error('Erro ao obter chat ID:', error));
