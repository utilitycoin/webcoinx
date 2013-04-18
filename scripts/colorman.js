define(function () {
  var ColorMan = function () {
    
  };

  var txdatacache = {};

  function getTransaction(txHash, callback) {
    var data = txdatacache[txHash];
    if (data)
      callback(data);
    else
      $.ajax({
	url: "/json/tx-v0/" + txHash,
	dataType: "json"
      }).done(function (data) {
	txdatacache[txHash] = data;
	callback(data);
      }).fail(function (what, thefuck) { alert('fail:' + what + ' ' + thefuck);});
  }


  // move decimal point 8 places
  function btcToSatoshi(s) {
    if (typeof s != 'string') return s;
    // find decimal point
    var i = s.indexOf('.');
    if(i !== -1) {
      // parse string without '.' as an integer
        var x = +(s.substr(0, i) + s.substr(i+1, i+9));

        // multiply by power of 10 to make into satoshis
        return x * Math.pow(10, 9 - s.length + i);
    } else {
        return +s * 1e8;
    }
  }


  // convert the input and output values from BTC to Satoshis
  // If not, then floating point rounding errors will propagate
  // and cause the matching algorithm to give wrong results
  function fixData(tx) {
    tx.out.forEach(function(o) {
      o.value = btcToSatoshi(o.value);
    });
    
    tx.in.forEach(function(i) {
      i.value = btcToSatoshi(i.value);
    });
  }


  
  function matchInputs(tx) {
    var inputs = [0];
    var outputs = [];
    var matching = [];

    // create prefix sums
    tx.out.reduce(function(prev, curr) {
      prev += curr.value;            
      outputs.push(prev);
      return prev;
    }, 0);
    tx.in.reduce(function(prev, curr) {            
      prev += curr.value
      inputs.push(prev);
      return prev;
    }, 0);

    // matching algorithm
    var inIdx = 0; var outIdx = 0;
    for(var outIdx = 0; 
        outIdx < outputs.length && inIdx < inputs.length-1; 
        ++outIdx) 
    {
      matching[outIdx] = []      

      for(; inIdx < inputs.length-1; inIdx++) {
        matching[outIdx].push(inIdx);
        if(inputs[inIdx+1] >= outputs[outIdx]) {                
          break;
        }
      }
    }
    
    return matching;
  }

  function getMatching(txHash, callback) {
    getTransaction(txHash, function(tx) {
      callback(matchInputs(tx));
    });
  }

  function getColorByDefinition(txHash, outputIdx) {
    // embed some color definitions here for now.
    var defs = [{
      "issues": [{
        "outindex": 0, 
        "txhash": "b1586cd10b32f78795b86e9a3febe58dcb59189175fad884a7f4a6623b77486e"
      }], 
      "style": "genesis", 
      "name": "Blue", 
      "unit": 1, 
      "colorid": "8ec9668e393f2b7682daa2fd40eeee873c07c9ed"
    },{
      "metaprops": [
        "name", 
        "unit"
      ], 
      "metahash": "776d7100a4e22ca75d038d4e533b876f61ecc3a6", 
      "name": "TESTcc", 
      "colorid": "7452b90e22a0b758a048a3db9efa4fd361107350", 
      "style": "genesis", 
      "unit": 1, 
      "issues": [{
        "outindex": 0, 
        "txhash": "c26166c7a387b85eca0adbb86811a9d122a5d96605627ad4125f17f6ddcbf89b"
      }]
    },{
      "issues": [{
        "outindex": 0, 
        "txhash": "8f6c8751f39357cd42af97a67301127d497597ae699ad0670b4f649bd9e39abf"
      }], 
      "style": "genesis", 
      "name": "Red", 
      "unit": 1, 
      "colorid": "f92734dea46ca06107244cc20e44276724846043"
    }];

    // simply compare the given hash and out index with those in the 'issues'
    // field of each color definition. Return the 'name' field if we get a match.
    for(var i = 0; i < defs.length; ++i) {
      var issues = defs[i].issues[0];

      if(issues.txhash === txHash && issues.outindex === outputIdx) {
        return defs[i].name;
      }
    }

    // if we've got here, then none of the definitions matched
    return 'Unknown';
  }

  function getColor(txHash, outputIdx, callback) {

    function Helper(hash, idx, cb) {
      this.color = 'Unknown';

      // put initial transaction output in queue
      this.queue = [{
        txHash: hash,
        index: idx
      }];

      this.callback = cb;


      this.getColorHelper = function() {
        if(this.queue.length === 0) {
          // we've visited everything and not found a conflict!
          this.callback(this.color);
          return;
        }

        var currentOutput = this.queue.pop();
        var currentHash = currentOutput['txHash'];
        var currentOutIdx = currentOutput['index'];


        // is the current input colored by definition?
        var color = getColorByDefinition(currentHash, currentOutIdx);
        if(color !== 'Unknown') {
          // if we've already got a provisional color
          if(this.color !== 'Unknown') {
            // make sure the new color matches
            if(this.color !== color) {
              this.callback('None');
            } else {
              // it matches, keep searching
              this.getColorHelper();
            }
          } else {
            // otherwise, this becomes the provisional color
            this.color = color;

            // and carry on with next iteration of loop
            this.getColorHelper();
          }
        }

        // otherwise, get the transaction, and add
        // the matching inputs to the queue
        else {
          getTransaction(currentHash, function(tx) {
            // is it coinbase, then we can't go any deeper, so it isn't colored
            if(tx.in[0].type === 'coinbase') {
              this.callback('None');
            }

            else {

	      fixData(tx);
              var matching = matchInputs(tx);


              // add the matching inputs to the queue
              matching[currentOutIdx].reverse().forEach(function(inIdx) {
                var input = tx.in[inIdx];

                this.queue.push({
                  txHash: input.prev_out.hash,
                  index: input.prev_out.n
                });
              }.bind(this));

              // next round in 'loop'
              this.getColorHelper();
            }
          }.bind(this));
        }
      };

      // start traversing
      this.getColorHelper();
    };


    var helper = new Helper(txHash, outputIdx, callback);
  }


  ColorMan.prototype.colorizeWallet = function (wallet, cont) {
    var left = wallet.unspentOuts.length;
    wallet.unspentOuts.forEach(function (utxo) {
      var hash = Crypto.util.bytesToHex(Crypto.util.base64ToBytes(tx.hash).reverse());
      getColor(hash, utxo.index, function (utxo_color) {
	utxo.color = utxo_color;
	left = left - 1;
	if (left == 0)
	  cont(wallet);
      });
    });			  
  };
  return ColorMan;

});