define(
    ["jquery", "colorman"], 
    function($, ColorMan)  {

        function log_event(ekind, msg) {
            console.log("Event: " + ekind + " Msg:" + msg);
        }
        
        function outpointString(outpoint) {
            return outpoint.hash + ":" + outpoint.index.toString();
        }

        function MockExchangeTransaction(wallet, data) {
            this.wallet = wallet;
            this.tx = data.tx;
            this.my = data.my;
            this.inp_colors = data.inp_colors || {};
            this.realtx = null;
        }

        MockExchangeTransaction.prototype.withInputColors = function(next) {
            var self = this;

            var todo = 1;
            
            function process (inp, txdata, color) {
                self.inp_colors[outpointString(inp.outpoint)] = {
                    color: color,
                    value: txdata.out[inp.outpoint.index].value
                };
                todo -= 1;
                if (todo == 0) next();
            }
            
            this.tx.ins.forEach(
                function (inp) {
                    if (!self.inp_colors[outpointString(inp.outpoint)]) {
                        todo += 1;
                        ColorMan.instance.getTransaction(
                            inp.outpoint.hash, 
                            function (txdata) {
                                ColorMan.instance.getColor(
                                    inp.outpoint.hash,
                                    inp.outpoint.index,
                                    function (color) {
                                        process(inp, txdata, color);
                                    });
                            });
                    }
                });

            todo -= 1;
            if (todo == 0) next();
        };
        MockExchangeTransaction.prototype.checkOutputsToMe = function(myaddress, color, value) {
            var total = 0;
            this.tx.outs.forEach(function(out) {
                    if (out.to == myaddress/* && out.color == color*/) // XXX uncomment when fetchOutputColors works
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
            this.tx.ins.forEach(
                function(inp) {
                    realtx.ins.push(new TransactionIn({
                                                          outpoint: inp.outpoint,
                                                          script: new Bitcoin.Script(),
                                                          sequence: 4294967295
                                                      }));
                });
            
            // outputs
            this.tx.outs.forEach(function(out) {
                    realtx.outs.push(new TransactionOut({
                                value: out.value,
                                script: Script.createOutputScript(out.to)
                            }));
                });
            this.realtx = realtx;

            return realtx;
        };


        MockExchangeTransaction.prototype.signMyInputs = function(reftx) {
            var my = reftx ? reftx.my : this.my;

            var real = this.getRealTx();

            for (var i = 0; i < this.tx.inp.length; i++) {
                var inp = this.tx.inp[i];
                if (my.indexOf(inp.outpoint_s) >= 0) {
                    var utxo = this.ops2utxo[real.ins[i].outpoint_s];
                    if (!utxo)
                        throw "missing utxo for outpoint";
                    var hash = real.hashTransactionForSignature(utxo.out.script, i, 1); // SIGHASH_ALL
                    var pkhash = utxo.out.script.simpleOutPubKeyHash();
                    var sig = this.signWithKey(pkhash, hash);
                    sig.push(parseInt(hashType, 10));
                    var pk = real.getPubKeyFromHash(pkhash);

                    inp.sig = {
                        sig: sig,
                        pk: pk
                    };                    
                }
                real.ins[i].script = Script.createInputScript(inp.sig.sig, inp.sig.pk);
            }

            return true;
        };
        MockExchangeTransaction.prototype.broadcast = function(cb) {
            log_event("MockExchangeTransaction.broadcast");
            if (!this.hasEnoughSignatures())
                throw "trying to broadcast tx without enough signatures";
            this.wallet.sendTx(this.realtx, cb);
            return true;
        };
        MockExchangeTransaction.prototype.hasEnoughSignatures = function() {
            var ok = true;
            this.tx.inp.forEach(function(inp) {
                    if (!inp.sig)
                        ok = false;
                });
            return ok;
        };
        MockExchangeTransaction.prototype.appendTx = function(etx) {
            // TODO: handle colors?
            this.tx.ins = this.tx.inp.concat(etx.tx.ins);
            this.tx.outs = this.tx.out.concat(etx.tx.outs);
            this.my = this.my.concat(etx.my);
            // invalidate realtx cache
            this.realtx = null;
        };
        MockExchangeTransaction.prototype.getData = function() {
            return this.tx;
        };

        function MockWallet(wm,cm,exit) {
            // here we go again :(
            var self = this;
            $(wm).bind('walletInit', function(e) {
                    self.wallet = e.newWallet.wallet;
                });
            this.exit = exit;
            this.wm = wm;
            this.cm = cm;
            this.exit = exit;
        }



        MockWallet.prototype.sendTx = function (tx, cb) {
            var txBase64 = Crypto.util.bytesToBase64(tx.serialize());
            return this.exit.call("txSend", {tx:txBase64}, cb || function(){});
        };


        // color representation everywhere:
        // "c010...." - colorid
        // false - btc
        // undefined/null - we're not sure (waiting for colorman)
        // returns { utxos: [ utxo, utxo ... ], value: sum_of_utxos }
        //
        // XXX: move this to bitcoinjs-lib later, but for now let's confine necessary changes to this file
        MockWallet.prototype.collectMyUTXOs = function(colorid) {
            var w = this.wallet;
            var res = [];
            var val = BigInteger.ZERO;

            for (var i = 0; i < w.unspentOuts.length; i++) {
                if (!w.isGoodColor(i, colorid)) continue;
                res.push(w.unspentOuts[i]);
                val = val.add(utxo.tx.value);
            }
            return { utxos: res, value: val };
        };


        MockWallet.prototype.getAddress = function(colorid, is_change) {
            return this.wallet.getCurAddress().toString();
        };
        MockWallet.prototype.createPayment = function(color, amount, to_address) {
            amount = BigInteger.valueOf(amount);
            var payment = this.wallet.selectCoins(amount, color); //TODO: BigInteger?
            if (payment) {
                var ins = payment.outs.map(function (out) {
                                              return {
                                                  outpoint: {
                                                      hash: out.tx.hash,
                                                      index: out.index
                                                  },
                                                  script: null
                                              };
                                           });
                var outs = [{to: to_address, // TODO: replace with script?
                             value: amount.toString(),
                             color: color // TODO: not needed?
                            }];
                if (payment.value.compareTo(amount)>0) {
                    outs.push({
                                 to: this.getAddress(color, true),
                                 value: payment.value.subtract(amount).toString()
                             });
                }
                var inp_colors = {};
                payment.outs.forEach(
                    function (out) {
                        inp_colors[outpointString({hash: out.tx.hash, index: out.index})] = {
                            color:  out.color,
                            value:  out.tx.outs[out.index].value
                        };
                    });
                return new MockExchangeTransaction(this, 
                                                   {
                                                       tx: {outs: outs, ins: ins },
                                                       my: payment.outs,
                                                       inp_colors: inp_colors
                                                   });
            } else 
                throw "not enough coins";
        };
        MockWallet.prototype.importTx = function(tx_data) {
            return new MockExchangeTransaction(this, {
                tx: tx_data,
                my: []
            });
        };

        return MockWallet;
});
