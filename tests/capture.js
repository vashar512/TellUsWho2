// set the viewport size to include all our page content.
casper.options.viewportSize = {width: 1600, height: 900};

casper.test.begin("Capture an image of the browser view", function(test) {
    // step 1: open the page.
    casper.start("http://telluswho2.herokuapp.com", function() {
        // do an example test.
        this.click('.nav > li:nth-child(4) > a:nth-child(1)');
    });

    // step 2: take some screenshots.
    casper.then(function() {
        casper.capture("page.png");
    });

    // actually run the steps we defined before.
    casper.run(function() {
        test.done();
    });
});
