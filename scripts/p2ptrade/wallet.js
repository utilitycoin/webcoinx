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
                    realtx.ins.push(new Bitcoin.TransactionIn({
                                                          outpoint: inp.outpoint,
                                                          script: new Bitcoin.Script(),
                                                          sequence: 4294967295
                                                      }));
                });
            
            // outputs
            this.tx.outs.forEach(function(out) {
                    realtx.outs.push(new Bitcoin.TransactionOut({
                                value: out.value,
                                script: Bitcoin.Script.createOutputScript(
                                    new Bitcoin.Address(out.to)
                                )
                            }));
                });
            this.realtx = realtx;

            return realtx;
        };


        MockExchangeTransaction.prototype.signMyInputs = function(reftx) {
            var my = reftx ? reftx.my : this.my;
            var self = this;

            var real = this.getRealTx();

            // create signautures for my inputs
            for (var j = 0; j < my.length; j++) {
                var found = false;
                var utxo = my[j];
                for (var i = 0; i < this.tx.ins.length; i++) {
                    var inp = this.tx.ins[i];
                    if (inp.outpoint.hash == utxo.tx.hash && inp.outpoint.index == utxo.index) {
                        var hash = real.hashTransactionForSignature(utxo.out.script, i, 1); // SIGHASH_ALL
                        var pkhash = utxo.out.script.simpleOutPubKeyHash();
                        var sig = this.wallet.signWithKey(pkhash, hash);
                        var hashType = 1; // SIGHASH_ALL
                        sig.push(parseInt(hashType, 10));
                        var pk = this.wallet.getPubKeyFromHash(pkhash);
                        
                        inp.sig = {
                            sig: sig,
                            pk: pk
                        };    
                        found = true;
                        break;
                    }
                }
                if (!found) throw "my input isn't present in transaction";
            }

            // now create signatures in real tx
            for (var i = 0; i < this.tx.ins.length; i++) {
                var inp = this.tx.ins[i];
                if (inp.sig)
                    real.ins[i].script = Bitcoin.Script.createInputScript(inp.sig.sig, inp.sig.pk);
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
            this.tx.ins.forEach(function(inp) {
                    if (!inp.sig)
                        ok = false;
                });
            return ok;
        };
        MockExchangeTransaction.prototype.appendTx = function(etx) {
            // TODO: handle colors?
            this.tx.ins = this.tx.ins.concat(etx.tx.ins);
            this.tx.outs = this.tx.outs.concat(etx.tx.outs);
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
                           // TODO: remove once selectCoins is moved to bitcoinjs-lib
                           self.wallet.selectCoins = function (rqValue, color) {
                               var selectedOuts = [];
                               var selectedValue = BigInteger.ZERO;
                               var i;
                               for (i = 0; i < this.unspentOuts.length; i++) {
                                   if (!this.isGoodColor(i, color)) continue;
                                   selectedOuts.push(this.unspentOuts[i]);
                                   selectedValue = selectedValue.add(Bitcoin.Util.valueToBigInt(this.unspentOuts[i].out.value));
                                   
                                   if (selectedValue.compareTo(rqValue) >= 0) break;
                               }
                               if (selectedValue.compareTo(rqValue) < 0) 
                                   return null;
                               else 
                                   return {
                                       outs: selectedOuts,
                                       value: selectedValue
                                   };
                           };
                       });
            this.exit = exit;
            this.wm = wm;
            this.cm = cm;
        }


        MockWallet.prototype.sendTx = function (tx, cb) {
            var txBase64 = Crypto.util.bytesToBase64(tx.serialize());
            return this.exit.call("txSend", {tx:txBase64}, cb || function(){});
        };


        // color representation everywhere:
        // "c010...." - colorid
        // false - btc
        // undefined/null - we're not sure (waiting for colorman)

        MockWallet.prototype.getAddress = function(colorid, is_change) {
            return this.wallet.getCurAddress().toString();
        };
        MockWallet.prototype.signWithKey = function (pkhash, hash) {
            return this.wallet.signWithKey(pkhash, hash);
        };
        MockWallet.prototype.getPubKeyFromHash = function (pkhash) {
            return this.wallet.getPubKeyFromHash(pkhash);
        };
        MockWallet.prototype.createPayment = function(color, amount, to_address) {
            amount = BigInteger.valueOf(amount);
            var fee = (color === false) ? BigInteger.valueOf(50000) : BigInteger.ZERO;
            var amountWithFee = amount.add(fee);

            var payment = this.wallet.selectCoins(amountWithFee, color);
            if (payment) {
                var ins = payment.outs.map(function (out) {
                                              return {
                                                  outpoint: {
                                                      hash: out.tx.hash,
                                                      index: out.index
                                                  },
                                                  sig: false
                                                  // not signed by us/counterparty yet
                                                  // note that we do not transfer scripts over the wire, just the signature
                                                  // and pk itself. this saves us the trouble of verifying the counterparty
                                                  // sent us proper script, since we recreate it by ourselves should we
                                                  // worry about that in the future.
                                              };
                                           });
                var outs = [{to: to_address, // TODO: replace with script? nope, realtx does scripts
                             value: amount.toString(),
                             color: color // TODO: not needed?
                            }];
                if (payment.value.compareTo(amountWithFee)>0) {
                    outs.push({
                                 to: this.getAddress(color, true),
                                 value: payment.value.subtract(amountWithFee).toString()
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
                                                       // beware everything in tx: must be wire serializable
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
