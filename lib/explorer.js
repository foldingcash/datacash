'use strict';

const request = require('superagent');
const bch = require('bitcore-lib-cash');

function Insight(url) {
  this.request = request;
  this.url = url
  return this;
}

Insight.prototype.getUnspentUtxos = function(address, callback) {
  this.request
    .get(this.url + '/address/utxo/' + address)
    .then(res => {
      let unspent = res.body.utxos;
      unspent = unspent.map(utxo => new bch.Transaction.UnspentOutput({...utxo, scriptPubKey: res.body.scriptPubKey}))
      return callback && callback(null, unspent);
    }, err => {
      return callback && callback(err);
    })
};

Insight.prototype.broadcast = function(transaction, callback) {
  this.request
    .get(this.url + '/rawtransactions/sendRawTransaction/' + transaction)
    .then(res => {
      return callback && callback(null, res.body ? res.body : null);
    }, err => {
      return callback && callback(err);
    })
};

module.exports = {
  Insight: Insight
};
