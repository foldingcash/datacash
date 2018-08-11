'use strict';

const request = require('request');
const bch = require('bitcore-lib-cash');

function Insight(url) {
  this.request = request;
  this.url = url
  return this;
}

Insight.prototype.requestPost = function(path, data, callback) {
  this.request({
    method: 'POST',
    url: this.url + path,
    json: data
  }, callback);
};

Insight.prototype.requestGet = function(path, callback) {
  this.request({
    method: 'GET',
    url: this.url + path
  }, callback);
};

Insight.prototype.getUnspentUtxos = function(addresses, callback) {
  this.requestGet('/address/utxo/' + addresses, function(err, res, unspent) {
    if (err || res.statusCode !== 200) {
      return callback(err || res);
    }
    unspent = JSON.parse(unspent).map(utxo => new bch.Transaction.UnspentOutput(utxo))
    return callback(null, unspent);
  });
};

Insight.prototype.broadcast = function(transaction, callback) {
  this.requestPost('/rawtransactions/sendRawTransaction/' + transaction, null, function(err, res, body) {
    if (err || res.statusCode !== 200) {
      return callback(err || body);
    }
    return callback(null, body ? body : null);
  });
};

module.exports = {
  Insight: Insight
};
