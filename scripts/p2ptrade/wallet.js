define(["jquery"], function($) {
        function log_event(ekind, msg) {
            console.log("Event: " + ekind + " Msg:" + msg);
        }

        function make_random_id() {
            var text = "";
            var possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

            for (var i = 0; i < 10; i++)
                text += possible.charAt(Math.floor(Math.random() * possible.length));
            return text;
        }

        // returns [ "txhash:id" , "txhash:id" ... ]
        MockExchangeTransaction.prototype.collectMyOutpoints = function(colorid) {

        };


        function MockExchangeTransaction(wallet, data) {
            this.wallet = wallet;
            this.tx = data.tx;
            this.my = data.my;
            this.realtx = null;
        }
        MockExchangeTransaction.prototype.fetchOutputColors = function(next) {
            // TODO: use colorman on all outputs we don't know, and after colors are known
            // call next
            next();
        };
        MockExchangeTransaction.prototype.checkOutputsToMe = function(myaddress, color, value) {
            var total = 0;
            this.tx.out.forEach(function(out) {
                    if (out.to == myaddress && out.color == color)
                        total += out.value;
                });
            return (total >= value);
        };


        // reconstruct tx so bitcoinjs-lib understands it
        MockExchangeTransaction.prototype.getRealTx = function() {
            // cache
            if (this.realtx) return this.realtx;

            var realtx = new Bitcoin.Transaction();

            // inputs
            this.tx.inp.forEach(function(inp) {
                    realtx.ins.push(new TransactionIn({
                                outpoint: inp.outpoint,
                                script: script: new Bitcoin.Script(),
                                sequence: 4294967295
                            }));
                });

            // outputs
            this.tx.out.forEach(function(out) {
                    realtx.outs.push(new TransactionOut({
                                value: BigInteger.valueOf(out.value), // XXX fp
                                script: Script.createOutputScript(address)
                            }));
                });
            this.realtx = realtx;

            return realtx;
        }


        MockExchangeTransaction.prototype.signMyInputs = function(reftx) {
            var my = reftx ? reftx.my : this.my;

            var real = this.getRealTx();

            for (var i = 0; i < this.tx.inp.length; i++) {
                var inp = this.tx.inp[i];
                if (my.indexOf(inp.outpoint) < 0) continue;
                var utxo = real.ins[i].utxo;
                if (!utxo)
                    throw "missing utxo for outpoint";
                var hash = real.hashTransactionForSignature(utxo.out.script, i, 1); // SIGHASH_ALL
                var pkhash = utxo.out.script.simpleOutPubKeyHash();
                var sig = this.signWithKey(pkhash, hash);
                sig.push(parseInt(hashType, 10));
                var pk = real.getPubKeyFromHash(pkhash);

                // this will be done somewhere else when real is reconstructed to be dispatched off to network 
                //			 real.ins[i].script = Script.createInputScript(sig, pk);
                inp.signed = {
                    sig: sig,
                    pk: pk
                };
            }
            this.tx.inp.forEach(function(inp) {
                    inp.signed = true;
                });
            return true;
        };
        MockExchangeTransaction.prototype.broadcast = function() {
            log_event("MockExchangeTransaction.broadcast");
            if (!this.hasEnoughSignatures())
                throw "trying to broadcast tx without enough signatures";
            return true;
        };
        MockExchangeTransaction.prototype.hasEnoughSignatures = function() {
            var ok = true;
            this.tx.inp.forEach(function(inp) {
                    if (!inp.signed)
                        ok = false;
                });
            return ok;
        };
        MockExchangeTransaction.prototype.appendTx = function(etx) {
            // TODO: handle colors?
            this.tx.inp = this.tx.inp.concat(etx.tx.inp);
            this.tx.out = this.tx.out.concat(etx.tx.out);
            this.my = this.my.concat(etx.my);
            // invalidate realtx cache
            this.realtx = null;
        };
        MockExchangeTransaction.prototype.getData = function() {
            return this.tx;
        };

        function MockWallet(wm) {
            // here we go again :(
            var self = this;
            $(wm).bind('walletInit', function(e) {
                    console.log('wallet creep');
                    self.wallet = e.newWallet.wallet;
                    console.log(self.wallet);
                });
            this.wm = wm;
            this.id = make_random_id();
        }
        MockWallet.prototype.getAddress = function(colorid, is_change) {
            return this.wallet.getCurAddress().toString();
        };
        MockWallet.prototype.createPayment = function(color, amount, to_address) {
            var utxos = this.collectMyUTXO(color, amount);
            var t = MockExchangeTransaction(this, {
                    tx: {
                        inp: utxos.list.forEach.
                        function(utxo) {
                            return {
                                outpoint: utxo.outpoint,
                                utxo: utxo,
                                signed: false
                            };
                        }
                    },
                    out: [{
                            to: to_address,
                            value: amount,
                            color: color
                        }
                    ]
                },
                my: outpoints
            });
        // if the total is larger, append sending change back
        if (utxos.total > amount) {
            t.tx.out.push({
                    to: this.getAddress(),
                    value: utxos.total - amount
                });
            t.realtx = null;
        }
        return t;
    }; MockWallet.prototype.importTx = function(tx_data) {
        return new MockExchangeTransaction(this, {
                tx: tx_data,
                my: []
            });
    };

    return MockWallet;
});
