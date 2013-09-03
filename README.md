# webcoinx

Early prototype of color coins client with p2ptrade.

# Status

It somewhat works, including orderbook but still needs a lot of polish.
see http://utilitycoin.github.io/webcoinx for live demo (running from this repository)

# Development

Contributions are always welcome however small. Please use pull request system for small changes, if you
commit on regular basis you'll be given push access - abusing git for svn/cvs style kitchen-sink
development, with rebasing on the go, is what we do here.


Live demo lives in gh-pages branch and only tested changes should go in there.

## Style guide
For html, we want to use the Google htmlcss [styleguide](http://google-styleguide.googlecode.com/svn/trunk/htmlcssguide.xml)
Short summary: 2 spaces indentation

For javascript, we let jslint decide and try to follow as many of its rules as possible. 
We use 4 spaces indentation.

# Installation


``` sh
git clone git://github.com/bitcoinx/webcoinx.git
```

And point your webserver at the directory 'webcoinx'. Using http server is a necessity because
of assumptions the code makes in a lot of different places, local filesystem browsing will not work.

# Server-side

Server (which works much like electrum-server) provides exit node data to this client. If you want
to run your own, see https://github.com/katuma/node-bitcoin-exit for details.
