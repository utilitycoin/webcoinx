define(function () {
  var exitNode = null;
  var colorspace = null;
  var id2name = {};
  var ColorMan = function (exitnode) {
    exitNode = exitnode;
  };

  var txdatacache = {};

  function getTransaction(txHash, callback) {
    // this should be probably in exitnode.js?
    var data = txdatacache[txHash];
    if (data)
      callback(data);
    else {
      exitNode.call("txquery", [txHash], function (err, data) {
        if (err) {                                                                             
		alert("Error querying "+txHash+": " + err);
		return;
	}
	txdatacache[txHash] = data.tx;
	callback(data.tx);
      });
    }
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
    var defs = colorspace;

    // simply compare the given hash and out index with those in the 'issues'
    // field of each color definition. Return the 'name' field if we get a match.
    for(var i = 0; i < defs.length; ++i) {
      var issues = defs[i].issues[0];

      if(issues.txhash === txHash && issues.outindex === outputIdx) {
        return defs[i].colorid;
      }
    }

    // if we've got here, then none of the definitions matched
    return null;
  }

  function getColor(txHash, outputIdx, callback) {

    function Helper(hash, idx, cb) {
      this.color = null;

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
        if(color !== null) {
          // if we've already got a provisional color
          if(this.color !== null) {
            // make sure the new color matches
            if(this.color !== color) {
              this.callback(null);
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
	    // false marks uncolored btc
            if(tx.in[0].type === 'coinbase') {
              this.callback(false);
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

  ColorMan.prototype.reloadColors = function(colordefs, cb) {
     var self = this;
     var urls = colordefs.replace("\r","").split("\n");
     var doit;
     var prev = null;
     var clist = [];
     colorspace = null;
     doit = function(data,status,err) {
        var url = urls.shift();
        if (status) {
                if (status != "success") {
			alert('Failed to load ' + prev);
		} else {
			// XXX todo check for duplicates, verify the color data is actually correct etc
			var c = data[0];
			id2name[c.colorid] = c.name;
 	 		clist.push(c);
		}
	}
        if (!url) {
                colorspace = clist;
		if (cb) cb();
		$(self).trigger('colordefUpdate', [colorspace]);
		return;
	};
        prev = url;
        $.ajax(url, {dataType: 'json' }).done(doit).fail(doit);
     }
     doit();
  };

  // this must be called whenever utxo set changes, after colors are resolved
  // walletUpdate event will be fired to notify gui of color changes
  ColorMan.prototype.update = function(wm, cb) {
    this.running = cb;
    var wallet = wm.activeWallet.wallet;
    var left = wallet.unspentOuts.length;
    console.log('unspent outs '+left+ ' + colorspace + ' + colorspace.length);
    wallet.unspentOuts.forEach(function (utxo) {
      var hash = Crypto.util.bytesToHex(Crypto.util.base64ToBytes(utxo.tx.hash).reverse());
      getColor(hash, utxo.index, function (utxo_color) {
	utxo.color = utxo_color;
        if (!utxo.tx.color) utxo.tx.color = id2name[utxo_color]; // ugly hack for txview
	left = left - 1;
	if (left == 0) {
          cb();
        }
      });
    });
  };

  ColorMan.prototype.btc2color = function(b) {
     return btcToSatoshi(b);
  }

  return ColorMan;

});
