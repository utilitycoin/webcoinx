define(
    ["jquery", "p2ptrade/comm", "p2ptrade/agent", "p2ptrade/offer", "p2ptrade/wallet", "p2ptrade/mockwallet"], 
    function($, HTTPExchangeComm, ExchangePeerAgent, ExchangeOffer, EWallet, MockWallet) {
           
        function p2pgui(wm, cm, exit, cfg) {
            
            var ewallet;
            if (cfg.get('p2ptradeMockWallet', false) == true) {
                ewallet = new MockWallet();
            } else {
                ewallet = new EWallet(wm, cm, exit);
            }
            this.ewallet = ewallet;
            
            this.comm = new HTTPExchangeComm('http://p2ptrade.btx.udoidio.info/messages');
            this.epa = new ExchangePeerAgent(ewallet, this.comm);
            var self = this;

            window.setInterval(function() {
                                   self.comm.update();
                                   self.updateGUIstate();
                               }, 1000);

            $('#buy-button').click(function(event) {
            	event.preventDefault();
            	self.create_offer(
                                 false, "20000", "1", // send
                                 self.colorid, "1", self.unit
                                 );
           	});

            $('#sell-button').click(function() {
                event.preventDefault();
                self.create_offer(
                                  self.colorid, "1", self.unit, // send
                                  false, "20000", "1"
                                  );
            });
        }

		// send refers to what we're sending to counterparty, recv what we want in return
        p2pgui.prototype.create_offer = function(sendcolor, sendunit, sendamt, recvcolor, recvunit, recvamt) {
        	console.log("create_offer: send "+sendcolor+","+sendunit+","+sendamt);
        	console.log("create_offer: recv "+recvcolor+","+recvunit+","+recvamt);
        	function conv(a,b) {
        		// TBA: should API user (which gui is) ever worry about units?
        		return (new BigInteger(a)).multiply(new BigInteger(b)).toString();
        	};
        	this.epa.registerMyOffer(new ExchangeOffer(null, {
        		colorid: sendcolor,
        		value: conv(sendamt, sendunit)
        	}, {
        		colorid: recvcolor,
        		value: conv(recvamt, recvunit)
        	}, true));
        };


        
        p2pgui.prototype.updateGUIstate = function () {
            var active = this.epa.hasActiveEP();
            var text = "";
            if (active) {
                text = "Transaction in progress: " + this.epa.active_ep.state;
            }

            $("#status").text(text);
        };

        p2pgui.prototype.setCurrentColor = function(colorid, unit) {
        	console.log("setCurrentColor: "+colorid+","+unit);
        	this.colorid = colorid;
        	this.unit = unit.toString();
        };

        return p2pgui;

    });
