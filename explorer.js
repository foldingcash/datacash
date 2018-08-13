'use strict';

const request = require('superagent');
const bch = require('bitcore-lib-cash');

function Insight(url) {
  this.request = request;
  this.url = url
  return this;
}

Insight.prototype.getUnspentUtxos = function(addresses, callback) {
  this.request
    .get(this.url + '/address/utxo/' + addresses)
    .then(res => {
      let unspent = res.body
      unspent = unspent.map(utxo => new bch.Transaction.UnspentOutput(utxo))
      return callback(null, unspent);
    }, err => {
      return callback(err);
    })
};

Insight.prototype.broadcast = function(transaction, callback) {
  this.request
    .post(this.url + '/rawtransactions/sendRawTransaction/' + transaction)
    .then(res => {
      return callback(null, res.body ? res.body : null);
    }, err => {
      return callback(err);
    })
};

module.exports = {
  Insight: Insight
};
