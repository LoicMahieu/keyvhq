'use strict';

const redis = require('redis');
const pify = require('pify');
const JSONB = require('json-buffer');

class KeyvRedis {
	constructor(opts) {
		this.ttlSupport = true;
		opts = opts || {};
		if (opts.uri) {
			opts = Object.assign({}, { url: opts.uri }, opts);
		}

		const client = redis.createClient(opts);

		this.redis = ['get', 'set', 'del', 'flushdb'].reduce((obj, method) => {
			obj[method] = pify(client[method].bind(client));
			return obj;
		}, {});

		if (opts.keyv) {
			client.on('error', err => opts.keyv.emit('error', err));
		}
	}

	get(key) {
		return this.redis.get(key)
			.then(value => {
				if (value === null) {
					return undefined;
				}
				return JSONB.parse(value);
			});
	}

	set(key, value, ttl) {
		return Promise.resolve()
			.then(() => {
				value = JSONB.stringify(value);
				if (typeof ttl === 'number') {
					return this.redis.set(key, value, 'PX', ttl);
				}
				return this.redis.set(key, value);
			});
	}

	delete(key) {
		return this.redis.del(key)
			.then(items => items > 0);
	}

	clear() {
		return this.redis.flushdb()
			.then(() => undefined);
	}
}

module.exports = KeyvRedis;
