/*jslint vars:true*/
/*global define*/
define([
    "jquery"
], function ($) {
    "use strict";
	var initAddress = function () {
            // Address copy-to-clipboard
            ZeroClipboard.setMoviePath('scripts/vendor/zeroclipboard/ZeroClipboard.swf');
            var addrClip = new ZeroClipboard.Client();

            // Address auto-selection
            $('#addr').focus(function (e) {
                this.select();
            }).mouseup(function (e) {
                this.select();
                e.preventDefault();
            }).change(function () {
                var addr = $(this).addr();
                addrClip.setText(addr);
                addrClip.reposition();
            });

            //addrClip.glue('addr_clip', 'wallet_active');

            // Disabling below, breaks Internet Explorer (addEventListener)
            // Probably easy to fix with jquery.bind
            // But: there is no #addr_clip button, so is this bitrot?
            // However, the code still sometimes requires the addrClip object.

            // var addrClipButton = $('#addr_clip');
            //  addrClip.addEventListener( 'mouseOver', function(client) {
            //     addrClipButton.addClass('ui-state-hover');
            //  });

            //  addrClip.addEventListener( 'mouseOut', function(client) {
            //     addrClipButton.removeClass('ui-state-hover');
            //  });

            //  addrClip.addEventListener( 'mouseDown', function(client) {
            //     addrClipButton.addClass('ui-state-focus');
            //  });

            //  addrClip.addEventListener( 'mouseUp', function(client) {
            //     addrClipButton.removeClass('ui-state-focus');
            //  });
        },
	    init = function () {
			initAddress();
		},
		showTestnetWalletInfo = function () {
            $('#testnet_wallet').show();
		},
        setWalletInitInfo = function (text) {
            $("#wallet_init_status").text(text);
        },
        setWalletActiveState = function () {
            $("#wallet_init_status").text("");
            $('#wallet_active').show();
            $('#wallet_init').hide();
        },
        setWalletInitState = function () {
            $("#wallet_init_status").text("");
            $('#wallet_active').hide();
            $('#wallet_init').show();
        },
		setBalance = function (value, unit) {
            $('#wallet_active .balance .value').text(value);
            $('#wallet_active .balance .unit').text(unit);
		},
		setAddress = function (text) {
			$('#addr').val(text);
		},
		api = {
			showTestnetWalletInfo: showTestnetWalletInfo,
			setWalletInitInfo: setWalletInitInfo,
			setWalletInitState: setWalletInitState,
			setWalletActiveState: setWalletActiveState,
			setBalance: setBalance,
			setAddress: setAddress
		};



	return {
		makeOverviewPanel: function () {
			init();
			return api;
		}
	};

});
