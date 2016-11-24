// PhantomJS script
// Takes screeshot of a given page. This correctly handles pages which
// dynamically load content making AJAX requests.

// Instead of waiting fixed amount of time before rendering, we give a short
// time for the page to make additional requests.

// Phantom internals
var system = require('system');
var webPage = require('webpage');
var fs = require('fs')

console.error = function () {
    system.stderr.writeLine([].slice.call(arguments).join(' '));
};

function main() {
    // I tried to use yargs as a nicer commandline option parser but
    // it doesn't run in phantomjs environment
    var args = system.args;
    var opts = {
        url: args[1],
        width: args[2],
        height: args[3],
        requestTimeout: args[4],
        maxTimeout: args[5],
        verbose: args[6] === 'true',
        fileType: args[7],
        fileQuality: args[8] ? args[8] : 100,
        cropWidth: args[9],
        cropHeight: args[10],
        cropOffsetLeft: args[11] ? args[11] : 0,
        cropOffsetTop: args[12] ? args[12] : 0
    };

    renderPage(opts);
}

function renderPage(opts) {
    var requestCount = 0;
    var forceRenderTimeout;
    var dynamicRenderTimeout;

    var page = webPage.create();
    page.viewportSize = {
        width: opts.width,
        height: opts.height
    };
    // Silence confirmation messages and errors
    page.onConfirm = page.onPrompt = function noOp() {};
    page.onError = function(err) {
        console.error('Page error:', err);
    };

    page.onResourceRequested = function(request) {
        // log('->', request.method, request.url);
        requestCount += 1;
        clearTimeout(dynamicRenderTimeout);
    };

    page.onResourceReceived = function(response) {
        if (!response.stage || response.stage === 'end') {
            // log('<-', response.status, response.url);
            requestCount -= 1;
            if (requestCount === 0) {
                dynamicRenderTimeout = setTimeout(renderAndExit, opts.requestTimeout);
            }
        }
    };

    page.open(opts.url, function(status) {
        if (status !== 'success') {
            console.error('Unable to load url:', opts.url);
            phantom.exit(10);
        } else {
            forceRenderTimeout = setTimeout(renderAndExit, opts.maxTimeout);
        }
    });

    function renderAndExit() {
        if(opts.cropWidth && opts.cropHeight) {
            page.clipRect = {top: opts.cropOffsetTop, left: opts.cropOffsetLeft, width: opts.cropWidth, height: opts.cropHeight};
        }
        var fileType

        if (opts.fileType) {
            fileType = opts.fileType
        }
        // var renderOpts = {
        //     fileQuality: opts.fileQuality
        // };


        // if(opts.fileType) {
        // log("Adjusting File Type...");
        // renderOpts.fileType = opts.fileType;
        // }

        // Ref: https://github.com/kevva/screenshot-stream/blob/master/stream.js#L124
        console.log(page.renderBase64(fileType))
        phantom.exit();
    }
}

function isString(value) {
    return typeof value == 'string'
}

main();
