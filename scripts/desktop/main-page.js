/*jslint vars: true */
/*global define, EJS, ZeroClipboard */

define([
    "jquery",
], function ($) {
	'use strict';
	var initHtmlPage = function () {
            $('head').append($('<link rel="stylesheet" type="text/css" />').attr('href', 'stylesheets/desktop.css'));
            var html = new EJS({url: 'views/layout.ejs'}).render();
            $("body").html(html);

            // CSS tweaks
            $('#header #nav li:last').addClass('nobg');
            $('.block_head ul').each(function () { $('li:first', this).addClass('nobg'); });

            // // Button styling
            $('button').button();

            // $('button')
            //     .button()
            //     .filter('#nav_send_money')
            //     .button('option', 'icons', {primary: "icon-bitcoin-send"})
            //     .end();

            $('#tabs').tabs();
        },
        initmessages = function () {
            // Messages
            $('.block .message').hide().append('<span class="close" title="Dismiss"></span>').fadeIn('slow');
            $('.block .message .close').hover(
                function () { $(this).addClass('hover'); },
                function () { $(this).removeClass('hover'); }
            );
            $('.block .message .close').click(function (e) {
                $(this).parent().fadeOut('slow', function () { $(this).remove(); });
            });
        },
        initAddress = function () {
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
		render = function () {
			initHtmlPage();
			initAddress();
		};


	return {
		render: render
	};
});


