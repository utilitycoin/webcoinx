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
            
            this.comm = new HTTPExchangeComm('http://webcoinx.tumak.cz/messages');
            this.epa = new ExchangePeerAgent(ewallet, this.comm);
            var self = this;

            window.setInterval(function() {
                                   self.comm.update();
                                   self.updateGUIstate();
                               }, 2000);

            $('#buy-button').click(function(event) {
                                       event.preventDefault();
                                       
                                       self.epa.registerMyOffer(
                                           new ExchangeOffer(null, {
                                                                 colorid: false,
                                                                 value: 11
                                                             }, {
                                                                 colorid: self.colorid,
                                                                 value: 22
                                                             }, true));
                                   });

            $('#sell-button').click(function() {
                                        event.preventDefault();
                                        self.epa.registerMyOffer(
                                            new ExchangeOffer(null, {
                                                                  colorid: self.colorid,
                                                                  value: 22
                                                              }, {
                                                                  colorid: false,
                                                                  value: 11
                                                              }, true));
                                    });
        }
        
        p2pgui.prototype.updateGUIstate = function () {
            var active = this.epa.hasActiveEP();
            var text = "";
            if (active) {
                text = "Transaction in progress: " + this.epa.active_ep.state;
            }

            $("#status").text(text);
        };

        p2pgui.prototype.setCurrentColor = function(colorid) {
        	this.colorid = colorid;
        };

        return p2pgui;

    });
