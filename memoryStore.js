var util = require('util')
	, EventEmitter = require('events').EventEmitter
	, spawn = require('child_process').spawn
	, path = require('path')
	, cmdDir = process.env.ES_BIN || path.resolve(__dirname, 'EventStore')
	, cmd = path.resolve(cmdDir, 'clusternode')
	, opts = {
			cwd: cmdDir
		, env: {
				'LD_LIBRARY_PATH': cmdDir + ':$LD_LIBRARY_PATH'
			, 'MONO_GC_DEBUG': 'clear-at-gc'
			}
		}
	, currentPort = 5000

module.exports = MemoryStore


function MemoryStore(done) {
	if(!(this instanceof MemoryStore)) {
    return new MemoryStore(done)
	}
	EventEmitter.call(this)

	var me = this
	initializeGesProcess()

	function initializeGesProcess() {
		var settings = getSettings()
			, es = spawn(cmd, getArgsArray(settings), opts)
			, isIntialized = false

		me._es = es

		es.stdout.on('data', function(data) {
			//console.log('[LOG] : ' + data.toString())
			var logLine = data.toString()
			if(logLine.indexOf("'$users' projection source has been written") !== -1) {
				isIntialized = true
				done(null, {
					host: settings.ip
				, port: settings.tcpPort
				})
			} else if(logLine.indexOf('Exit reason: Address already in use') !== -1) {
				me._removeHandlers()
				initializeGesProcess()
			}
		})

		es.stderr.on('data', function(data) {
			//console.log('[ERR] : ' + data.toString())
			var err = data.toString()
			cb(data.toString())
			if(isIntialized) {
				me.emit('error', err)
				me._close()
			} else {
				done(err)
			}
		})

		es.on('close', function(signal) {
			//console.log('passive', arguments)
			me._removeHandlers()
		})

		es.on('error', function(err) {
			if(isIntialized) {
				me.emit('error', err)
				me._close()
			} else {
				done(err)
			}
		})
	}
}
util.inherits(MemoryStore, EventEmitter)

MemoryStore.prototype._close = function() {
	this._es.kill('SIGINT')
}

MemoryStore.prototype._removeHandlers = function() {
	this._es.removeAllListeners()
	this._es.stdin.removeAllListeners()
	this._es.stdout.removeAllListeners()
}

MemoryStore.prototype.addConnection = function(con) {
	this._con = con
}

MemoryStore.prototype.cleanup = function(cb) {
	var me = this
	this._es.removeAllListeners('close')
	this._es.on('close', function(signal) {
		//console.log('in handler',arguments)
		me._removeHandlers()
		cb()
	})

	function closeGes() {
		me._close()
	}

	if(this._con) {
		this._con.close(closeGes)
	} else {
		closeGes()
	}
}

function getSettings() {
	currentPort += 1
	return {
		ip: '127.0.0.1'
	, tcpPort: currentPort
	}
}

function getArgsArray(args) {
	var allArgs = ['--mem-db']
	if(args.ip) allArgs.push('--ext-ip=' + args.ip) 
	if(args.tcpPort) {
		allArgs.push('--ext-tcp-port=' + args.tcpPort) 
		allArgs.push('--ext-http-port=' + (args.tcpPort + 1000))
	}
	return allArgs
}