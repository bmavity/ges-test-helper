var util = require('util')
	, EventEmitter = require('events').EventEmitter

module.exports = ExternalStore


function ExternalStore(done) {
	if(!(this instanceof ExternalStore)) {
    return new ExternalStore(done)
	}
	EventEmitter.call(this)

	setImmediate(function() {
		done(null, {})
	})
}
util.inherits(ExternalStore, EventEmitter)

ExternalStore.prototype.addConnection = function(con) {
	this._con = con
}

ExternalStore.prototype.cleanup = function(cb) {
	if(!this._con) return
	this._con.close(cb)
}
