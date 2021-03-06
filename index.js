/**
 * leaflet-headless
 *
 * Server side leaflet with fake DOM using jsdom.
 */

var jsdom = require('jsdom').jsdom;
var path = require('path');

var reset = function () {

    // make some globals to fake browser behaviour.

    if (global.window) {
        global.window.close();
    }
    global.document = jsdom('<html><head></head><body></body></html>', {
        features: {
            FetchExternalResources: ['img']
        }
    });
    global.window = global.document.defaultView;
    global.window.navigator.userAgent = 'webkit';
    global.navigator = global.window.navigator;
    global.Image = require('./src/image.js');

    global.L_DISABLE_3D = true;
    global.L_NO_TOUCH = true;

    var leafletPath = require.resolve('leaflet');
    var L = require(leafletPath);
    global.L = L;

    var scriptLength = leafletPath.split(path.sep).slice(-1)[0].length;
    L.Icon.Default.imagePath = 'file://' + leafletPath.substring(0, leafletPath.length - scriptLength) + 'images/';

};

if (!global.L) {

    /* without redefining gobals, and using leaft-image, it pollutes the virual dom like no other */
    /* so "reset it" */
    reset();

    // Monkey patch Leaflet
    var originalInit = L.Map.prototype.initialize;
    L.Map.prototype.initialize = function (id, options) {
        options = L.extend(options || {}, {
            fadeAnimation: false,
            zoomAnimation: false,
            markerZoomAnimation: false,
            preferCanvas: true
        });

        return originalInit.call(this, id, options);
    }

    // jsdom does not have clientHeight/clientWidth on elements.
    // Adjust size with L.Map.setSize()
    L.Map.prototype.getSize = function () {
        if (!this._size || this._sizeChanged) {
            this._size = new L.Point(1024, 1024);
            this._sizeChanged = false;
        }
        return this._size.clone();
    };

    L.Map.prototype.setSize = function (width, height) {
        this._size = new L.Point(width, height);
        // reset pixelOrigin
        this._resetView(this.getCenter(), this.getZoom());
        return this;
    };

    L.Map.prototype.saveImage = function (outfilename, callback) {
        var leafletImage = require('leaflet-image');
        var fs = require('fs');

        leafletImage(this, function (err, canvas) {
            if (err) {
                console.error(err);
                return;
            }
            var data = canvas.toDataURL().replace(/^data:image\/\w+;base64,/, '');
            fs.writeFile(outfilename, new Buffer(data, 'base64'), function () {
                if (callback) {
                    callback(outfilename);
                }
            });
        });
    };

    L.Map.prototype.toBuffer = function (callback) {
        var leafletImage = require('leaflet-image');

        leafletImage(this, function (err, canvas) {
            if (err) {
                console.error(err);
                callback(err, null);
                return;
            }

            callback(null, new Buffer(canvas.toDataURL().replace(/^data:image\/\w+;base64,/, ''), 'base64'));
        });
    };

    L.Map.prototype.toCanvas = function (callback) {
        var leafletImage = require('leaflet-image');

        leafletImage(this, function (err, canvas) {
            if (err) {
                console.error(err);
                callback(err, null);
                return;
            }

            callback(null, canvas);
        });
    };

    L.Map.prototype.canvasToBuffer = function (canvas, callback) {
        if (!canvas) {
            callback('canvas cannot be null');
        } else {
            callback(null, new Buffer(canvas.toDataURL().replace(/^data:image\/\w+;base64,/, ''), 'base64'));
        }
    };

    L.Map.prototype.reset = reset;
}

module.exports = global.L;