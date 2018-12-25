/*
web3.eth.accounts.signTransaction({
  to: '0xF0109fC8DF283027b6285cc889F5aA624EaC1F55',
  value: '1000000000',
  gas: 2000000,
  gasPrice: '234567897654321',
  nonce: 0,
  chainId: 1
}, '0x4c0883a69102937d6231471b5dbb6204fe5129617082792ae468d01a3f362318')
.then(console.log);
> {
  messageHash: '0x6893a6ee8df79b0f5d64a180cd1ef35d030f3e296a5361cf04d02ce720d32ec5',
  r: '0x9ebb6ca057a0535d6186462bc0b465b561c94a295bdb0621fc19208ab149a9c',
  s: '0x440ffd775ce91a833ab410777204d5341a6f9fa91216a6f3ee2c051fea6a0428',
  v: '0x25',
  rawTransaction: '0xf86a8086d55698372431831e848094f0109fc8df283027b6285cc889f5aa624eac1f55843b9aca008025a009ebb6ca057a0535d6186462bc0b465b561c94a295bdb0621fc19208ab149a9ca0440ffd775ce91a833ab410777204d5341a6f9fa91216a6f3ee2c051fea6a0428'
}


nonce - String: (optional) The nonce to use when signing this transaction. Default will use web3.eth.getTransactionCount().
chainId - String: (optional) The chain id to use when signing this transaction. Default will use web3.eth.net.getId().
to - String: (optional) The recevier of the transaction, can be empty when deploying a contract.
data - String: (optional) The call data of the transaction, can be empty for simple value transfers.
value - String: (optional) The value of the transaction in wei.
gasPrice - String: (optional) The gas price set by this transaction, if empty, it will use web3.eth.gasPrice()
gas - String: The gas provided by the transaction.

*/


var Web3 = require('web3');
const EthereumTx = require('ethereumjs-tx');
const ethUtil = require('ethereumjs-util');
const rlp = require('rlp');

const Keychain = require('./keychain');
const API_KEY = 'https://ropsten.infura.io/v3/046804e3dd3240b09834531326f310cf';


let web3 = new Web3(new Web3.providers.HttpProvider(API_KEY)); //
 
// params
const key = 'test1@6de493f01bf590c0';
const to = '0xE8899BA12578d60e4D0683a596EDaCbC85eC18CC';
const publicKey = '0x6a99ea8d33b64610e1c9ff689f3e95b6959a0cc039621154c7b69c019f015f4521bb9f3fc36a4d447002787d4d408da968185fc5116b8ffd385e8ad3196812e2';
// const privKey = '1552e84aa697185f06bbd8287725c63362b287bb45d0814308f409ba189f03ba'
const fromAddress = ethUtil.publicToAddress(publicKey).toString('hex');
const chainIdHere = 3;
const value = 100;
const data = '';
const gasLimit = 21000; // await web3.eth.estimateGas(draftTxParams) ||
const nonce = 0; //await web3.eth.getTransactionCount(fromAddress);
const gasPrice = 100; //await web3.eth.getGasPrice().then(wei => Number(wei))

// ................
const draftTxParams = {
  nonce,
  gasPrice,
  to,
  value,
  data,
  chainId: chainIdHere
}

let transactionParams = {
  ...draftTxParams,
  gasLimit
}

signTransaction = async (txParams, keyname) => {
  const keychain = await Keychain.create(); //   const keychain = new Keychain();
 
  const buildTxSinature = async (txParams) => {
    class EthereumTxKeychain extends EthereumTx {
      hashEncode() {
        let items
        if (this._chainId > 0) {
          const raw = this.raw.slice()
          this.v = this._chainId
          this.r = 0
          this.s = 0
          items = this.raw
          this.raw = raw
        } else {
          items = this.raw.slice(0, 6)
        }
        // create hash
        return rlp.encode(items)
      }
    }
    const tx = new EthereumTxKeychain(txParams);
    let buffer = tx.hashEncode(false);
    const hex = buffer.toString('hex');
    return hex;
  }

  const buildRawTransaction = async (txParams) => {
    const tx = new EthereumTx(txParams);
    let buffer = tx.serialize();
    const hex = buffer.toString('hex');
    return hex;
  }

  const rsv = async (signature) => {
    const ret = {};
    ret.r = `0x${signature.slice(0, 64)}`;
    ret.s = `0x${signature.slice(64, 128)}`;
    const recovery = parseInt(signature.slice(128, 130), 16);
    let tmpV = recovery + 27;
    if (chainIdHere > 0) {
      tmpV += chainIdHere * 2 + 8;
    }
    hexString = tmpV.toString(16);
    if (hexString.length % 2) {
      hexString = '0' + hexString;
    }
    ret.v = `0x${hexString}`;
    return ret;
  }

  
  const rawHex = await buildTxSinature(txParams);
  const messageHash = web3.eth.accounts.hashMessage(rawHex);
  const data = await keychain.signHex(rawHex, keyname);
  let ret = await rsv(data.result);
  let rawParams = {
    ...txParams,
    ...ret
  }
  const rawTransaction = await buildRawTransaction(rawParams);
  const rawTransactionHex = `0x${rawTransaction}`;
  

  await keychain.term();  
  
  console.log({ rawTransactionHex, ...ret, messageHash });
  return { rawTransactionHex, ...ret, messageHash };
}


web3.eth.accounts.signTransaction = signTransaction;

web3.eth.accounts.signTransaction(transactionParams, key);