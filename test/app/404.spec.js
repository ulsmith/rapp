describe("APP Component - app/404.component.html", function() {
	var testFixture = document.createElement('test-fixture');
	var testBed = document.createElement('test-bed');

	beforeAll(function(done){
		// shrink fixture debug output
		testFixture.style.transform = 'scale(0.5)';
		testFixture.style.transformOrigin = '0 0';

		// load deps
		testFixture.innerHTML = '<link rel="import" href="base/src/app/404.component.html" />';

		// inject testbed into fixture and fixture into doc, wait for deps to load
		testFixture.appendChild(testBed);
		document.body.appendChild(testFixture);
		setTimeout(done, 1000);
    });

	beforeEach(function(){
		// load component to test into test bed
		testBed.innerHTML = '<app-404></app-404>';
	});

    it('Creates a custom razilo component and binds to razilobind', function(){
		var component = testBed.querySelector('app-404');
		expect(component.razilobind).toBeDefined('razilo component defined');
    });

    it('Has content loaded from template', function(){
		var component = testBed.querySelector('app-404');
		expect(component.innerHTML.length).toBeGreaterThan(0, 'content has been loaded from template');
    });
});
