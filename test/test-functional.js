var http = require('http');
var fs = require('fs');
var assert = require('assert');
var sizeOf = require('image-size');

var urlToImage = require('../src/index');

var phantomjs = require('phantomjs-prebuilt')


describe('urlToImage', function() {

    var server = http.createServer(function(req, res) {
        res.end('<html>test</html>');
    });

    before(function(done) {
        server.listen(9000);
        server.on('listening', done);
    });

    after(function(done) {
        server.close();
        done();
    });

    describe('render', function() {
        this.timeout(20000);

        it('should render test image', function(done) {
            urlToImage('http://gitlogs.com')
            .pipe(fs.createWriteStream('localhost.png'))
            .on('finish', function() {
                var dimensions = sizeOf('localhost.png');
                assert.equal(dimensions.width, 1280, 'default width is incorrect');
                fs.unlinkSync('localhost.png');
                done();
            });
        });

        it('should render image in custom size', function(done) {
            urlToImage(
                'http://localhost:9000', {
                    width: 800,
                    height: 600
                }
            )
            .pipe(fs.createWriteStream('localhost.png'))
            .on('finish', function() {
                var dimensions = sizeOf('localhost.png');

                assert.equal(dimensions.width, 800, 'width is incorrect');

                // The content of test page is so small, so viewport
                // is larger than content. If content were larger,
                // urlToImage's height could be bigger than viewport's width
                assert.equal(dimensions.height, 600, 'height is incorrect');

                fs.unlinkSync('localhost.png');
                done();
            });
        });

        it('should fail to incorrect url', function(done) {
            this.timeout(10000);

            // TODO phantom takes a really long time to setup and end, 2-4 seconds just to stream a failure
            // NOTE: can try to keep a phantom process alive
            try {
                var stream = urlToImage(
                  'http://failure', {
                      width: 800,
                      height: 600
                  }
                )

                  stream.on('close', err => {
                      console.log('closed')
                      done()
                  })
                  stream.on('error', err => {
                      console.error('ON ERR', err)
                      done()
                  })

                stream.pipe(fs.createWriteStream('failure.png'))
            } catch (err) {
                done();
            }
        });
    });
});
