// Generated by CoffeeScript 1.6.3
var PORT, app, connect, feedr, human, logger;

connect = require('connect');

logger = new (require('caterpillar').Logger)();

human = new (require('caterpillar-human').Human)();

logger.pipe(human).pipe(process.stdout);

feedr = require('feedr').create({
  log: logger.log.bind(logger)
});

process.on('uncaughtException', function(err) {
  return logger.log('err', err.message);
});

PORT = process.env.PORT || 8000;

app = connect();

app.use(connect.limit('200kb'));

app.use(connect.timeout());

app.use(connect.compress());

app.use(connect.query());

app.use(connect.json());

app.use(function(req, res) {
  var fetchUrl, ipAddress, requestOptions, sendError, sendResponse, sendSuccess;
  ipAddress = req.headers['X-Forwarded-For'] || req.connection.remoteAddress;
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Request-Method', '*');
  res.setHeader('Access-Control-Allow-Methods', 'OPTIONS, GET');
  res.setHeader('Access-Control-Allow-Headers', '*');
  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }
  sendResponse = function(opts) {
    var level, str;
    str = null;
    if (opts.data == null) {
      opts.data = {};
    }
    if (opts.code == null) {
      opts.code = 200;
    }
    if (opts.headers == null) {
      opts.headers = {};
    }
    opts.headers['Content-Type'] = 'application/json';
    res.writeHead(opts.code, opts.headers);
    if (req.query.callback) {
      str = req.query.callback + '(' + JSON.stringify(opts.data) + ')';
    } else {
      str = JSON.stringify(opts.data);
    }
    level = opts.code === 200 ? 'info' : 'warning';
    logger.log(level, "" + opts.code + " response:", str);
    res.write(str);
    return res.end();
  };
  sendError = function(opts) {
    var _base, _base1;
    if (opts.data == null) {
      opts.data = {};
    }
    if (opts.code == null) {
      opts.code = 400;
    }
    if (opts.err == null) {
      opts.err = 'Something went wrong';
    }
    if (opts.err.message) {
      opts.err = opts.err.message;
    }
    if ((_base = opts.data).success == null) {
      _base.success = false;
    }
    if ((_base1 = opts.data).error == null) {
      _base1.error = opts.err;
    }
    return sendResponse(opts);
  };
  sendSuccess = function(opts) {
    var _base;
    if (opts.data == null) {
      opts.data = {};
    }
    if (opta.code == null) {
      opta.code = 200;
    }
    if ((_base = opts.data).success == null) {
      _base.success = true;
    }
    return sendResponse(opts);
  };
  logger.log('info', 'received request:', req.url, req.query, req.body);
  fetchUrl = req.query.url || req.body.url;
  requestOptions = req.query.requestOptions || req.body.requestOptions || {};
  if (!fetchUrl) {
    return sendError({
      err: 'missing url'
    });
  }
  if (requestOptions.url == null) {
    requestOptions.url = fetchUrl;
  }
  if (requestOptions.uri != null) {
    delete requestOptions.uri;
  }
  return feedr.readFeed(requestOptions, function(err, data, headers) {
    if (err) {
      return sendError({
        err: err
      });
    }
    if (data) {
      return sendResponse({
        data: data,
        headers: headers
      });
    }
  });
});

app.listen(PORT, function() {
  return logger.log('info', 'opened server on', PORT);
});

module.exports = app;