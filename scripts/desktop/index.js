/*jslint vars: true */
/*global setTimeout, alert, prompt, document, location */
/*global define, EJS, ZeroClipboard */
/*global Bitcoin, BigInteger, Crypto, Settings, Message, TransactionDatabase, Option */

// We have a lot of globals, I don't think this is the way to use require.js */
define([
    "jquery",
    "../walletmanager",
    "../exitnode",
    "./txview",
    "../bindings",
    "../colorman",
    "../p2ptrade/gui",
    "desktop/color-selector",
    "desktop/issue-panel",
    "desktop/send-panel",
    "desktop/transaction-panel",
    "desktop/settings-dialog",
    "desktop/main-page",
    "../wallets/miniwallet"
], function ($,
             WalletManager,
             ExitNode,
             TransactionView,
             setCommonBindings,
             ColorMan,
             P2pgui,
             ColorSelector,
             IssuePanel,
             SendPanel,
             TransactionPanel,
	     SettingsDialog,
	     MainPage,
             MiniWallet) {
    'use strict';
    var colorSelector,
        issuePanel,
        sendPanel,
        transactionPanel,
        settingsDialog;

    $(function () {
        MainPage.render();

        // Options for autoNumeric to render BTC amounts
        var autoNumericBtc = {
            aSign: "BTC ",
            mDec: 8,
            aPad: 2
        };

        var autoNumericColor = {
            vMin: '0',
            mDec: null,
        };

        var cfg = new Settings();
        var wallet;
        var wm = new WalletManager();
        var txDb = new TransactionDatabase(); // Tx chain
        var txMem = new TransactionDatabase(); // Memory pool

        // Once wallet is loaded, we can connect to the exit node
        var allowedColors = cfg.get('allowedColors') || {};
        var exitNodeHost = cfg.get('exitNodeHost');
        var exitNodePort = cfg.get('exitNodePort');
        var exitNodeSecure = cfg.get('exitNodeSecure');
        var txView;
        var exitNode = new ExitNode(exitNodeHost, +exitNodePort, !!exitNodeSecure,
                                    txDb, txMem, txView);
        var colorMan = new ColorMan(exitNode);

        txView = new TransactionView($('#main_tx_list'));
        var colordefServers = cfg.get('colordefServers');

        var pgui = new P2pgui(wm, colorMan, exitNode, cfg);

        colorSelector = ColorSelector.makeColorSelector(allowedColors);

        if (!cfg.get('have_wallet')) {
            setTimeout(function () {
                wm.createWallet({
                    'type': 'mini',
                    'name': 'testing'
                });
                cfg.apply({have_wallet: 1});
            }, 300);
        }

        if (cfg.get('addrType') === 0x6f) { // testnet
            $('#faucet').click(
                function (e) {
                    e.preventDefault();
                    if (!wallet) {
                        return;
                    }
                    $.ajax(
                        "http://devel.hz.udoidio.info/faucet",
                        {
                            type: 'POST',
                            data: { address: wallet.getCurAddress().toString() }
                        }
                    )
                        .done(function (data) {
                            $('#testnet_wallet').hide();
                            alert('You got 1 testnet Bitcoin, transaction id: ' + data);
                        })
                        .fail(function (e) {
                            alert('Sorry, faucet failure:' + e.toString());
                        });
                }
            );
            $('#testnet_wallet').show();
        }

        $('#exitnode_status').text(exitNodeHost);


        function mangle_addr(addr) {
            var color = colorSelector.getColor(); // '' = BTC
            return color !== '' ? (color + '@' + addr) : addr;
        }

        function updateBalance() {
            var color = colorSelector.getColor(); // '' = BTC
            console.log('@@@@' + color);
            pgui.setCurrentColor(color !== '' ? color : false, (color !== '') ? colorMan.cmap(color).unit.toString() : "1");
            if (wallet.dirty > 0) {
                $("#updating-balance").show();
            } else {
                $("#updating-balance").hide();
            }
            var v = Bitcoin.Util.formatValue(colorMan.s2c(color, wallet.getBalance(color)));
            if (color) {
                // btc2color prevents rounding errors
                v = colorMan.btc2color(v, color);
                //                      autoNumericColor.aSign = colorSelector.getColorName() + ' ';
                //                      autoNumericColor.vMax = ''+v;
                console.log(autoNumericColor);
            }
            $('#wallet_active .balance .value').text(v);
            $('#wallet_active .balance .unit').text(colorSelector.getColorName());

            $('.colorind').text(colorSelector.getColorName());
            var addr = wallet.getCurAddress().toString();
            $('#addr').val(mangle_addr(wallet.getCurAddress().toString()));
        }

        // UGLY UGLY UGLY UGLY
        function reload_colors() {
            colorMan.reloadColors(colordefServers, function () { // triggers colordefUpdate above
                colorMan.update(wm, function () {
                    $(wm).trigger('walletUpdate');
                });
            });
        }


        setCommonBindings(cfg, wm, txDb, txMem, txView, exitNode, colorMan);

        $(exitNode).bind('connectStatus', function (e) {
            console.log('connect', e);
            $('#exitnode_status').removeClass('unknown error warning ok');
            $('#exitnode_status').addClass(e.status);
        });

        $(exitNode).bind('txData txAdd txNotify', function (e) {
            updateBalance();
        });

        $(wm).bind('walletProgress', function (e) {
            $("#wallet_init_status").text("Creating wallet " + e.n + "/" + e.total);
        });

        $(wm).bind('walletInit', function (e) {
            $("#wallet_init_status").text("");
            $('#wallet_active').show();
            $('#wallet_init').hide();
            wallet = e.newWallet.wallet;
            var addr = e.newWallet.wallet.getCurAddress().toString();
            $('#addr').val(addr);
        });

        $(wm).bind('walletDeinit', function (e) {
            $("#wallet_init_status").text("");
            $('#wallet_active').hide();
            $('#wallet_init').show();
        });

        // Load wallet if there is one
        wm.init();

        // Interface buttons
        $('#wallet_init_create').click(function (e) {
            e.preventDefault();
            wm.createWallet({
                'type': 'mini',
                'name': 'testing'
            });
        });
        $('#wallet_active_recreate').click(function (e) {
            e.preventDefault();
            if (prompt("WARNING: This action will make the application forget your current wallet. Unless you have the wallet backed up, this is final and means your balance will be lost forever!\n\nIF YOU ARE SURE, TYPE \"YES\".") === "YES") {
                wm.createWallet({
                    'type': 'mini',
                    'name': 'testing'
                });
            }
        });

        $('#wallet_active .new_addr').click(function (e) {
            e.preventDefault();
            var addr = mangle_addr(wallet.getNextAddress().toString());
            $('#addr').val(addr);
            wm.save();
        });

        $(colorSelector).change(function () {
            updateBalance();
        });

        $(wm).bind('walletUpdate', function () {
            updateBalance();
        });

        $(colorMan).bind(
            'colordefUpdate',
            function (e, d) {
                colorSelector.setColors(d);
            }
        );

        issuePanel = IssuePanel.makeIssuePanel(wallet, cfg, wm, colorMan,
                                              colordefServers,
                                              allowedColors,
                                              exitNode, reload_colors);

        sendPanel = SendPanel.makeSendPanel(wallet, cfg, wm, colorMan,
                                            exitNode, colorSelector);

        transactionPanel = TransactionPanel.makeTransactionPanel();

        settingsDialog = SettingsDialog.makeSettingsDialog(allowedColors,
							   colordefServers,
							   cfg,
							   autoNumericBtc,
							   reload_colors);
        $('#nav .settings').click(function () {
            settingsDialog.openDialog();
            return false;
        });

        /*
        // Some testing code:
        //$('#addr').text(Bitcoin.Base58.encode(Crypto.util.hexToBytes("0090fd25b15e497f5d0986bda9f7f98c1f8c8a73f6")));
        var key = new Bitcoin.ECKey();
        key.pub = Crypto.util.hexToBytes("046a76e56adf269cb896a7af1cdb01aa4acce82881a2696bc33a04aed20c176a44ed7bfbb10b91186f1a6b680daf000f742213bb3033b56c73695f357afc768781");
        console.log(key.getBitcoinAddress().toString());

        var addr = new Bitcoin.Address('1EDdZbvAJcxoHxJq6UDQGDtEQqgoT3XK3f');
        console.log(Crypto.util.bytesToHex(addr.hash));
        console.log(addr.toString());*/
    });
});
