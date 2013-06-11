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
            this.cm = cm;
            
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
                                 false, "1", $('#buyprice').val(),
                                 self.colorid, self.unit, $('#buyamt').val()
                                 );
           	});

            $('#sell-button').click(function() {
                event.preventDefault();
                self.create_offer(
                                  self.colorid, self.unit, $('#sellamt').val(),
                                  false, "1", $('#sellprice').val(), "1"
                                  );
            });
        }

		// send refers to what we're sending to counterparty, recv what we want in return
        // TBA: should API user (which gui is) ever worry about units?        
        p2pgui.prototype.create_offer = function(sendcolor, sendunit, sendamt, recvcolor, recvunit, recvamt) {
        	console.log("create_offer: send "+sendcolor+","+sendunit+","+sendamt);
        	console.log("create_offer: recv "+recvcolor+","+recvunit+","+recvamt);
        	function conv(a,b,c) {
                if (c===false) return Bitcoin.Util.parseValue(a,false).toString();
        		return (new BigInteger(a)).multiply(new BigInteger(b)).toString();
        	};
        	this.epa.registerMyOffer(new ExchangeOffer(null, {
        		colorid: sendcolor,
        		value: conv(sendamt, sendunit, sendcolor)
        	}, {
        		colorid: recvcolor,
        		value: conv(recvamt, recvunit, recvcolor)
        	}, true));
        };


        
        p2pgui.prototype.updateGUIstate = function () {
            var active = this.epa.hasActiveEP();
            var text = "";
            if (active) {
                text = "Transaction in progress: " + this.epa.active_ep.state;
            }

            $("#p2p_status").text(text);
            var bids = $('#p2p_bids');
            var asks = $('#p2p_asks');

            bids.empty();
            asks.empty();
            var offers = this.epa.their_offers;
            var my_offers = this.epa.my_offers;
            for (var oid in offers) {
                var offer = offers[oid];
                var target;
                if (offer.A.colorid == this.colorid && offer.B.colorid == false) {
                    target = asks;
                } else if (offer.B.colorid == this.colorid && offer.A.colorid == false) {
                    target = bids;
                } else continue;

                target.append('<tr><td>'+this.cm.formatValueU(offer.A.value, offer.A.colorid)
                              +"<td>"+this.cm.formatValueU(offer.B.value, offer.B.colorid));
            }



        };

        p2pgui.prototype.setCurrentColor = function(colorid, unit) {
        	console.log("setCurrentColor: "+colorid+","+unit);
        	this.colorid = colorid;
        	this.unit = unit.toString();
        };

        return p2pgui;

    });
