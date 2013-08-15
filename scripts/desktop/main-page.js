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
        setConnectionInfo = function (text) {
            $('#exitnode_status').text(text);
        },
        setConnectionStatus = function (statusClass) {
            $('#exitnode_status').removeClass('unknown error warning ok');
            $('#exitnode_status').addClass(statusClass);
        },
        render = function () {
            initHtmlPage();
        };


    return {
        render: render,
        setConnectionInfo: setConnectionInfo,
        setConnectionStatus: setConnectionStatus
    };
});
