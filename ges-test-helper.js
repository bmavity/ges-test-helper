var spawn = require('child_process').spawn
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

console.log('Environment: ', process.env.ES_BIN)

module.exports = function createMemoryEventStore(args, cb) {
	if(!cb && typeof args === 'function') {
		cb = args
		args = {}
	}

	var es = spawn(cmd, getArgsArray(args), opts)

	es.stdout.on('data', function(data) {
		console.log(data.toString())
		if(data.toString().indexOf('Starting Normal TCP listening on TCP endpoint:') !== -1) {
			cb(null, es)
		}
	})

	es.stderr.on('data', function(data) {
		console.log(data.toString())
		cb(data.toString())
	})

/*
	es.on('close', function(err, signal) {
		if(err) return console.log('ES process closed with error: ', err)
		console.log('ES process closed with sig: ' + signal)
	})
*/

	es.on('error', function(err) {
		cb(err)
	})
}

function getArgsArray(args) {
	var allArgs = ['--mem-db']
	if(args.ip) allArgs.push('--ext-ip=' + args.ip) 
	if(args.tcpPort) allArgs.push('--ext-tcp-port=' + args.tcpPort) 
	return allArgs
}
