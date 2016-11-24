module.exports = function(config) {
	config.set({
		browsers: ['Chrome'],
		frameworks: ['jasmine'],
		reporters: ['progress', 'kjhtml'],
		files: [
			// test scripts
			{pattern: 'src/**/*.spec.js', watched: true, included: true, served: true},
			{pattern: 'test/**/*.spec.js', watched: true, included: true, served: true},

			// System deps for components
			{pattern: 'build/index.js', watched: false, included: true, served: true},
			{pattern: 'build/index.css', watched: false, included: true, served: true},

			// Make files available in server, watch some for changes too
			{pattern: 'src/**/*.html', watched: true, included: false, served: true},
			{pattern: 'node_modules/**/*.html', watched: true, included: false, served: true},
			{pattern: 'assets/**/*', watched: false, included: false, served: true}
		],
		proxies: {
			// map paths to base to allow component imports and assets
			'/assets/': '/base/assets/',
			'/src/': '/base/src/',
			'/node_modules/': '/base/node_modules/'
		}
	});
};
