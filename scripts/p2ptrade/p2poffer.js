define("jquery", function($) {
     function ExchangeOffer(oid, A, B) {
         // A = offerer's side, B = replyer's side
         // ie. offerer says "I want to give you A['value'] coins of color 
         // A['colorid'] and receive B['value'] coins of color B['colorid']"

         if (oid == null) {
             if (!A) 
                 return; //empty object
             oid = make_random_id();
         } else if (typeof oid == 'object') {
             A = $.extend(true, {}, oid.A);
             B = $.extend(true, {}, oid.B);
             oid = oid.oid;
         }
         this.oid = oid;
         this.A = A;
         this.B = B;
         this.expires = null;
     }
     ExchangeOffer.prototype.getData = function () {
         return {
             oid: this.oid,
             A: this.A,
             B: this.B
         };
     };
     ExchangeOffer.prototype.expired = function (shift) {
         return !this.expires 
             || (this.expires < now() + (shift || 0));
     };
     ExchangeOffer.prototype.refresh = function (delta) {
         this.expires = now() + (delta || STANDARD_OFFER_EXPIRY_INTERVAL);
     };
     ExchangeOffer.prototype.matches = function (offer) {
         // cross match A -> B, B -> A.
         var self = this;
         function prop_matches(name) {
             return (self.A[name] == offer.B[name]) && (self.B[name] == offer.A[name]);
         }
         return prop_matches('value') && prop_matches('colorid');
     };
     ExchangeOffer.prototype.isSameAsMine = function (my_offer) {
         if (my_offer.A.address && my_offer.A.address != this.A.address)
             return false;
         if (my_offer.B.address && my_offer.B.address != this.B.address)
             return false;
         var self = this;
         function checkprop (name) {
             if (self.A[name] != my_offer.A[name]) return false;
             if (self.B[name] != my_offer.B[name]) return false;
             return true;
         }
         if (!checkprop('colorid')) return false;
         if (!checkprop('value')) return false;
         return true;
     };
     
     function MyExchangeOffer (oid, A, B, auto_post){
         ExchangeOffer.apply(this, arguments);
         this.auto_post = (auto_post === false) ? false : true;
     };
     MyExchangeOffer.prototype = new ExchangeOffer();

    
     function ExchangeProposal (wallet) {
         this.wallet = wallet;
     }
     ExchangeProposal.prototype.createNew = function (offer, etx, my_offer) {
         this.pid = make_random_id();
         this.offer = offer;
         this.etx = etx;
         this.my_offer = my_offer;
         this.state = 'proposed';
     };
     ExchangeProposal.prototype.getData = function () {
         return {
             pid: this.pid,
             offer: this.offer.getData(),
             tx: this.etx.getData()
         };
     };
     ExchangeProposal.prototype.importTheirs = function (data) {
         this.pid = data.pid;
         this.offer = new ExchangeOffer(data.offer);
         this.etx = this.wallet.importTx(data.tx);
         this.my_offer = null;
         this.state = 'imported';
     };
     ExchangeProposal.prototype.addMyTranche = function (p) {
         this.etx.appendTx(p);
     };
     ExchangeProposal.prototype.checkOutputsToMe = function (myaddress, color, value) {
         /*  Does their tranche have enough of the color
          that I want going to my address? */
         return this.etx.checkOutputsToMe(myaddress, color, value);
     };
     ExchangeProposal.prototype.signMyInputs = function (reftx) {
         return this.etx.signMyInputs(reftx);
     };
	 return MyExchangeOffer;
}
