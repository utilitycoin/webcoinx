define(["jquery", "p2ptrade/comm", "p2ptrade/agent", "p2ptrade/offer", "p2ptrade/wallet", "p2ptrade/mockwallet"], 
       function($, HTTPExchangeComm, ExchangePeerAgent, ExchangeOffer, EWallet, MockWallet) {

        var comm1 = null;
        var epa1 = null;
        var comm2 = null;
        var epa2 = null;

        var color1 = "1111";
        var color2 = "2222";

        function updateGUIstate() {
            var active = epa1.hasActiveEP();
            var text = "";
            if (active) {
                text = "Transaction in progress: " + epa1.active_ep.state;

            }

            $("#status").text(text);
        }

        function p2pgui(wm, cm, exit, cfg) {

            var ewallet;
            if (cfg.get('p2ptradeMockWallet', false) == true) {
                ewallet = new MockWallet();
            } else {
                ewallet = new EWallet(wm, cm, exit);
            }

            comm1 = new HTTPExchangeComm('http://webcoinx.tumak.cz/messages');
            epa1 = new ExchangePeerAgent(ewallet, comm1);
            comm1.addAgent(epa1);

            comm2 = new HTTPExchangeComm('http://webcoinx.tumak.cz/messages');
            epa2 = new ExchangePeerAgent(ewallet, comm2);
            comm2.addAgent(epa2);

            window.setInterval(function() {
                    comm1.update();
                    comm2.update();
                    updateGUIstate();
                }, 2000);
            var self = this;

            $('#buy-button').click(function(event) {
                    event.preventDefault();
                    epa1.registerMyOffer(
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
                    epa2.registerMyOffer(
                        new ExchangeOffer(null, {
                                colorid: self.colorid,
                                value: 22
                            }, {
                                colorid: false,
                                value: 11
                            }, true));
                });
        }

        p2pgui.prototype.setCurrentColor = function(colorid) {
        	this.colorid = colorid;
        };

        return p2pgui;

    });
