define(["jquery", "p2ptrade/comm", "p2ptrade/agent", "p2ptrade/offer", "p2ptrade/wallet"], function($, HTTPExchangeComm, ExchangePeerAgent, ExchangeOffer, MockWallet) {

        var comm = null;
        var epa = null;

        var color1 = "1111";
        var color2 = "2222";

        function updateGUIstate() {
            var active = epa.hasActiveEP();
            var text = "";
            if (active) {
                text = "Transaction in progress: " + epa.active_ep.state;

            }

            $("#status").text(text);
        }

        function p2pgui(wm, cm, exit) {
            comm = new HTTPExchangeComm('http://webcoinx.tumak.cz/messages');
            epa = new ExchangePeerAgent(new MockWallet(wm, cm, exit), comm);
            comm.addAgent(epa);
            window.setInterval(function() {
                    comm.update();
                    updateGUIstate();
                }, 2000);
            var self = this;

            $('#buy-button').click(function(event) {
                    event.preventDefault();
                    epa.registerMyOffer(
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
                    epa.registerMyOffer(
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
        }

        return p2pgui;

    });
