#!/usr/bin/env node

var _ = require('lodash');
var path = require('path');
var childProcess = require('child_process');
var phantomjs = require('phantomjs-prebuilt')
var cliParser = require('./cli-parser');
var base64Stream = require('base64-stream');


function render(url, opts) {
    opts = _.extend(cliParser.defaultOpts, opts);

    var args = [];
    if (_.isString(opts.phantomArguments)) {
        args = opts.phantomArguments.split(' ');
    }

    if (!_.startsWith(url, 'http')) {
        url = 'http://' + url;
    }

    args = args.concat([
        path.join(__dirname, 'url-to-image.js'),
        url,
        opts.width,
        opts.height,
        opts.requestTimeout,
        opts.maxTimeout,
        opts.verbose,
        opts.fileType,
        opts.fileQuality,
        opts.cropWidth,
        opts.cropHeight,
        opts.cropOffsetLeft,
        opts.cropOffsetTop
    ]);

    var execOpts = {
        maxBuffer: Infinity
    };

    var killTimer;
    var child;
    var stream = base64Stream.decode();

    killTimer = setTimeout(function() {
        killPhantom(opts, child)
        throw new Error('Phantomjs process timeout')
    }, opts.killTimeout);

    // Ref: https://nodejs.org/api/child_process.html#child_process_options_stdio
    child = childProcess.spawn(phantomjs.path, args);
    child.stdout.pipe(stream);
    child.stderr.pipe(process.stderr)
    return stream

    function errorHandler(err) {
        // Remove bound handlers after use
        child.removeListener('close', closeHandler);
        throw(err);
    }

    function closeHandler(exitCode) {
        child.removeListener('error', errorHandler);
        if (exitCode > 0) {
            var err;
            if (exitCode === 10) {
                err = new Error('Unable to load given url: ' + url);
            }
            throw(err);
        } else {
            return
        }
    }

    child.once('error', errorHandler);
    // child.once('disconnect', errorHandler);
    // child.once('exit', errorHandler);
    // child.once('message', errorHandler);
    child.once('close', closeHandler);

    // .finally(function() {
    // if (killTimer) {
    //     clearTimeout(killTimer);
    // }
    // });
}

function killPhantom(opts, child) {
    if (child) {
        var msg = 'Phantomjs process didn\'t finish in ' +
                  opts.killTimeout + 'ms, killing it..';
        console.error(msg);

        child.kill();
    }
}

if (require.main === module) {
    var opts;
    try {
        opts = cliParser.getOpts();
    } catch (err) {
        if (err.argumentError) {
            console.error(err.message);
            process.exit(1);
        }

        throw err;
    }

    try {
        return render(opts.url, opts)
    } catch(err) {
        console.error('\nTaking screenshot failed to error:');
        if (err && err.message) {
            console.error(err.message);
        } else if (err) {
            console.error(err);
        } else {
            console.error('No error message available');
        }
        process.exit(2);        
    }
}

module.exports = render;
