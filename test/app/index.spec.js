describe("APP Component - app/index.component.html", function() {
	var testFixture = document.createElement('test-fixture');
	var testBed = document.createElement('test-bed');

	beforeAll(function(done){
		// load deps
		testFixture.innerHTML = '<link rel="import" href="src/app/index.component.html" />';
		testFixture.innerHTML += '<link rel="import" href="src/app/one.component.html" />';
		testFixture.innerHTML += '<link rel="import" href="src/app/two.component.html" />';
		testFixture.innerHTML += '<link rel="import" href="src/app/three.component.html" />';

		// inject testbed into fixture and fixture into doc, wait for deps to load
		testFixture.appendChild(testBed);
		document.body.appendChild(testFixture);
		setTimeout(done, 2000);
    });

	beforeEach(function(){
		// load component to test into test bed
		testBed.innerHTML = '<base disabled><app-index></app-index>';
	});

    it('Creates a custom razilo component and binds to razilobind', function(){
		var component = testBed.querySelector('app-index');
		expect(component.razilobind).toBeDefined('razilo component defined');
    });

    it('Has content loaded from template', function(){
		var component = testBed.querySelector('app-index');
		expect(component.innerHTML.length).toBeGreaterThan(0, 'content has been loaded from template');
    });

	describe("Can swap lazy loaded routes", function() {
	    it('Lazy loaded route to two', function(){
			var component = testBed.querySelector('app-index');

			component.querySelector('razilo-router').changeRoute('two');
			expect(component.querySelector('app-two')).toBeDefined('route two loaded');
			expect(component.querySelector('app-two').innerHTML.length).toBeGreaterThan(0, 'route two has content in it');
		});

		it('Lazy loaded route to three', function(){
			var component = testBed.querySelector('app-index');

			component.querySelector('razilo-router').changeRoute('three');
			expect(component.querySelector('app-three')).toBeDefined('route three loaded');
			expect(component.querySelector('app-three').innerHTML.length).toBeGreaterThan(0, 'route three has content in it');
	    });
    });
});
