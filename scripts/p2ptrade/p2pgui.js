define(["jquery", "p2pcomm", "p2pagent", "p2poffer", "p2pwallet"], function($,HTTPExchangeComm,ExchangePeerAgent,ExchangeOffer,MockWallet) {

var comm = null;
var epa = null;

var color1 = "1111";
var color2 = "2222";

function updateGUIstate () {
    var active = epa.hasActiveEP();
    var text = "";
    if (active) {
        text = "Transaction in progress: " + epa.active_ep.state;
        
    }

    $("#status").text(text);
}

var p2pgui = function(wm,cm) {
      comm = new HTTPExchangeComm('http://p2ptrade.btx.udoidio.info/messages');
      epa = new ExchangePeerAgent(new MockWallet(), comm);
      comm.addAgent(epa);
      window.setInterval(function () {
                             comm.update();
                             updateGUIstate();
                         }, 2000);

      $('#buy-button').click(
          function () {
              epa.registerMyOffer( 
                  new ExchangeOffer(null, {
                                          colorid: color1,
                                          value: 11
                                      }, {
                                          colorid: color2,
                                          value: 22
                                      }, true));
          });

      $('#sell-button').click(
          function () {
              epa.registerMyOffer( 
                  new ExchangeOffer(null, {
                                          colorid: color2,
                                          value: 22
                                      }, {
                                          colorid: color1,
                                          value: 11
                                      }, true));
          });
}      


return p2p_gui;      
              
});
