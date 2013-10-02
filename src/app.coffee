# Require
connect = require('connect')

# Logging
logger = new (require('caterpillar').Logger)()
human  = new (require('caterpillar-human').Human)()
logger.pipe(human).pipe(process.stdout)

# Feedr
feedr = require('feedr').create(
	log: logger.log.bind(logger)
)

# Don't crash when an error occurs, instead log it
process.on 'uncaughtException', (err) ->
	logger.log('err', err.message)

# Config
PORT = process.env.PORT or 8000

# Create our server
app = connect()
app.use connect.limit('200kb')
app.use connect.timeout()
app.use connect.compress()
app.use connect.query()
app.use connect.json()
app.use (req,res) ->
	# Prepare
	ipAddress = req.headers['X-Forwarded-For'] or req.connection.remoteAddress

	# CORS
	res.setHeader('Access-Control-Allow-Origin', '*')
	res.setHeader('Access-Control-Request-Method', '*')
	res.setHeader('Access-Control-Allow-Methods', 'OPTIONS, GET')
	res.setHeader('Access-Control-Allow-Headers', '*')
	if req.method is 'OPTIONS'
		res.writeHead(200)
		res.end()
		return

	# Send Response Helper
	sendResponse = (opts) ->
		# Prepare
		str = null
		opts.data ?= {}
		opts.code ?= 200
		opts.headers ?= {}

		# Prepare headers
		opts.headers['Content-Type'] = 'application/json'

		# Send code
		res.writeHead(opts.code, opts.headers)

		# Prepare response
		if req.query.callback
			str = req.query.callback + '(' + JSON.stringify(opts.data) + ')'
		else
			str = JSON.stringify(opts.data)

		# Log
		level = if opts.code is 200 then 'info' else 'warning'
		logger.log(level, "#{opts.code} response:", str)

		# Flush
		res.write(str)
		res.end()

	# Send Error Helper
	sendError = (opts) ->
		# Prepare
		opts.data ?= {}
		opts.code ?= 400
		opts.err ?= 'Something went wrong'
		opts.err = opts.err.message if opts.err.message

		# Prepare error
		opts.data.success ?= false
		opts.data.error ?= opts.err

		# Send error
		return sendResponse(opts)

	# Send Success Helper
	sendSuccess = (opts) ->
		# Prepare
		opts.data ?= {}
		opta.code ?= 200

		# Prepare success
		opts.data.success ?= true

		# Send response
		return sendResponse(opts)

	# Log
	logger.log('info', 'received request:', req.url, req.query, req.body)

	# Extract params
	fetchUrl = req.query.url or req.body.url
	requestOptions = req.query.requestOptions or req.body.requestOptions or {}

	# Check for essential params
	return sendError(err:'missing url')  unless fetchUrl

	# Prepare requestOptions
	requestOptions.url ?= fetchUrl
	delete requestOptions.uri  if requestOptions.uri?

	# Return data
	feedr.readFeed requestOptions, (err,data,headers) ->
		return sendError({err})  if err
		return sendResponse({data,headers})  if data

# Start our server
app.listen PORT, ->
	logger.log('info', 'opened server on', PORT)

# Export
module.exports = app