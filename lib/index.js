const bch = require('bitcore-lib-cash');
const explorer = require('./explorer.js');
const defaults = {
  rpc: "https://rest.bch.actorforth.org/v2",
  fee: 400,
  feePerByte: 2,
  maxPostBytes: 214,
}
// The end goal of 'build' is to create a hex formated transaction object
// therefore this function must end with _tx() for all cases 
// and return a hex formatted string of either a tranaction or a script
var build = function(options, callback) {
  let script = null;
  let rpcaddr = (options.cash && options.cash.rpc) ? options.cash.rpc : defaults.rpc;
  let fee = (options.cash && options.cash.fee) ? options.cash.fee : defaults.fee;
  let feePerByte = (options.cash && options.cash.feePerByte) ? options.cash.feePerByte : defaults.feePerByte;
  let maxPostBytes = (options.cash && options.cash.maxPostBytes) ? options.cash.maxPostBytes : defaults.maxPostBytes;
  if (options.tx) {
    // if tx exists, check to see if it's already been signed.
    // if it's a signed transaction
    // and the request is trying to override using 'data' or 'cash',
    // we should throw an error
    let tx = new bch.Transaction(options.tx)
    // transaction is already signed
    if (tx.inputs.length > 0 && tx.inputs[0].script) {
      if (options.cash || options.data) {
        callback && callback(new Error("the transaction is already signed and cannot be modified"))
        return;
      }
    }
  } else {
    // construct script only if transaction doesn't exist
    // if a 'transaction' attribute exists, the 'data' should be ignored to avoid confusion
    if (options.data) {
      if (options.data[1].length > maxPostBytes) {
        options.data[1] = options.data[1].slice(0, maxPostBytes)
      }
      script = _script(options)
    }
  }
  // Instantiate cash
  if (options.cash && options.cash.key) {
    // key exists => create a signed transaction
    let key = options.cash.key;
    const privateKey = new bch.PrivateKey.fromWIF(key);
    const address = privateKey.toAddress().toCashAddress();
    const bytesPerInput = 148;
    const bytesPerOutput = 34;
    let opReturnBytes = 0;
    let totalBytes = 0;
    let numInputs = 0;
    let numOuts = 0;
    const insight = new explorer.Insight(rpcaddr);
    insight.getUnspentUtxos(address, function (err, res) {
      let tx = new bch.Transaction().from(res)
      numInputs++;
      if (script) {
        tx.addOutput(new bch.Transaction.Output({ script: script, satoshis: 0 }));
        opReturnBytes = 14 + options.data[1].length
      }
      if (options.cash.to && Array.isArray(options.cash.to)) {
        options.cash.to.forEach(function(receiver) {
          tx.to(receiver.address, receiver.value)
          numOuts++;
        })
      }

      tx.change(address);
      numOuts++;
      totalBytes = (bytesPerInput * numInputs) + (bytesPerOutput * numOuts) + opReturnBytes + 10;
      tx.fee(Math.floor(totalBytes * feePerByte + 1));

      // Check all the outputs for dust
      for (var i = 0; i < tx.outputs.length; i++) {
        if (tx.outputs[i]._satoshis > 0 && tx.outputs[i]._satoshis < 546) {
          tx.outputs.splice(i, 1)
          i--
        }
      }

      let transaction = tx.sign(privateKey);

      callback && callback(null, transaction);
    })
  } else {
    // key doesn't exist => create an unsigned transaction
    let tx = new bch.Transaction(options.tx).fee(fee);
    if (script) {
      tx.addOutput(new bch.Transaction.Output({ script: script, satoshis: 0 }));
    }
    callback && callback(null, tx)
  }
}
var send = function(options, callback) {
  build(options, function(err, tx) {
    let rpcaddr = (options.cash && options.cash.rpc) ? options.cash.rpc : defaults.rpc;
    const insight = new explorer.Insight(rpcaddr);
    insight.broadcast(tx.toString(), callback);
  })
}
// compose script
var _script = function(options) {
  var s = null;
  if (options.data) {
    if (Array.isArray(options.data)) {
      s = new bch.Script();
      // Add op_return
      s.add(bch.Opcode.OP_RETURN);
      options.data.forEach(function(item) {
        // add push data
        if (/^0x/i.test(item)) {
          // ex: 0x6d02
          s.add(Buffer.from(item.slice(2), "hex"))
        } else {
          // ex: "hello"
          s.add(Buffer.from(item))
        }
      })
    } else if (typeof options.data === 'string') {
      // Exported transaction 
      s = bch.Script.fromHex(options.data);
    }
  }
  return s;
}
var connect = function(endpoint) {
  var rpc = endpoint ? endpoint : defaults.rpc;
  return new explorer.Insight(rpc);
}
module.exports = {
  build: build,
  send: send,
  bch: bch,
  connect: connect,
}

