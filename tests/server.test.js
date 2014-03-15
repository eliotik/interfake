var assert = require('assert');
var request = require('request');
var Q = require('q');
var get = Q.denodeify(request.get);
var post = Q.denodeify(request.post);

// The thing we're testing
var Interfake = require('..');

describe('Interfake', function () {
	describe('#createRoute()', function () {
		it('should create one GET endpoint', function (done) {
			var interfake = new Interfake();
			interfake.createRoute({
				request: {
					url: '/test',
					method: 'get'
				},
				response: {
					code: 200,
					body: {
						hi: 'there'
					}
				}
			});
			interfake.listen(3000);

			request({ url : 'http://localhost:3000/test', json : true }, function (error, response, body) {
				assert.equal(response.statusCode, 200);
				assert.equal(body.hi, 'there');
				interfake.stop();
				done();
			});
		});

		it('should create three GET endpoints with different status codes', function (done) {
			var interfake = new Interfake();
			interfake.createRoute({
				request: {
					url: '/test1',
					method: 'get'
				},
				response: {
					code: 200,
					body: {}
				}
			});
			interfake.createRoute({
				request: {
					url: '/test2',
					method: 'get'
				},
				response: {
					code: 304,
					body: {}
				}
			});
			interfake.createRoute({
				request: {
					url: '/test3',
					method: 'get'
				},
				response: {
					code: 500,
					body: {}
				}
			});
			interfake.listen(3000);

			Q.all([get('http://localhost:3000/test1'), get('http://localhost:3000/test2'), get('http://localhost:3000/test3')])
				.then(function (results) {
					assert.equal(results[0][0].statusCode, 200);
					assert.equal(results[1][0].statusCode, 304);
					assert.equal(results[2][0].statusCode, 500);
					interfake.stop();
					done();
				});
		});

		it('should create a dynamic endpoint', function (done) {
			var interfake = new Interfake();
			interfake.createRoute({
				request: {
					url: '/dynamic',
					method: 'post'
				},
				response: {
					code: 201,
					body: {}
				},
				afterResponse: {
					endpoints: [
						{
							request: {
								url: '/dynamic/1',
								method: 'get'
							},
							response: {
								code:200,
								body: {}
							}
						}
					]
				}
			});
			interfake.listen(3000);

			get('http://localhost:3000/dynamic/1')
				.then(function (results) {
					assert.equal(results[0].statusCode, 404);
					return post('http://localhost:3000/dynamic');
				})
				.then(function (results) {
					assert.equal(results[0].statusCode, 201);
					return get('http://localhost:3000/dynamic/1');
				})
				.then(function (results) {
					assert.equal(results[0].statusCode, 200);
					interfake.stop();
					done();
				});
		});

		it('should return JSONP if requested', function (done) {
			var interfake = new Interfake();
			interfake.createRoute({
				request: {
					url: '/stuff',
					method: 'get'
				},
				response: {
					code: 200,
					body: {
						stuff: 'hello'
					}
				}
			});
			interfake.listen(3000);

			get('http://localhost:3000/stuff?callback=yo')
				.then(function (results) {
					assert.equal('hello', 'yo(' + JSON.stringify({ stuff : 'hello' }) + ');');
					interfake.stop();
					done();
				});

			request('http://localhost:3000/stuff?callback=yo', function (error, response, body) {
				assert.equal(body, 'yo(' + JSON.stringify({ stuff : 'hello' }) + ');');
				interfake.stop();
				done();
			});
		});
	});
	
	// Testing the fluent interface
	describe('#get()', function () {
		it('should create one GET endpoint', function (done) {
			var interfake = new Interfake();
			interfake.get('/fluent');
			interfake.listen(3000);

			request({ url : 'http://localhost:3000/fluent', json : true }, function (error, response, body) {
				assert.equal(response.statusCode, 200);
				interfake.stop();
				done();
			});
		});
	});
	
	describe('#status()', function () {
		it('should create one GET endpoint with a particular status code', function (done) {
			var interfake = new Interfake();
			interfake.get('/fluent').status(300);
			interfake.listen(3000);

			request({ url : 'http://localhost:3000/fluent', json : true }, function (error, response, body) {
				assert.equal(response.statusCode, 300);
				interfake.stop();
				done();
			});
		});
	});
	
	describe('#body()', function () {
		it('should create one GET endpoint with a particular body', function (done) {
			var interfake = new Interfake();
			interfake.get('/fluent').body({ fluency : 'isgreat' });
			interfake.listen(3000);

			request({ url : 'http://localhost:3000/fluent', json : true }, function (error, response, body) {
				assert.equal(response.statusCode, 200);
				assert.equal(body.fluency, 'isgreat');
				interfake.stop();
				done();
			});
		});
	});
	
	// describe('#status()#method()', function () {
	// 	it('should create one GET endpoint with a particular status code', function (done) {
	// 		var interfake = new Interfake();
	// 		interfake.get('/fluent').status(300).method('post');
	// 		interfake.listen(3000);

	// 		request.post({ url : 'http://localhost:3000/fluent', json : true }, function (error, response, body) {
	// 			assert.equal(response.statusCode, 300);
	// 			interfake.stop();
	// 			done();
	// 		}.bind(this));
	// 	});
	// });
});