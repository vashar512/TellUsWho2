// Creating a casper module instance
var casper = require('casper').create({

  viewportSize: {
    width: 1600,
    height: 900
  },
  verbose: true,
  logLevel: "debug"
});

// Defining config object
var config = {
  url: 'http://telluswho2.herokuapp.com//',
};

casper.start(config.url);

casper.then(function() {

  // Clicks Login button
  this.click('.nav > li:nth-child(4) > a:nth-child(1)');

  // Waits one second for modal to load.
  casper.wait(1000);

});

casper.then(function() {

  // Tests if the modal is visible or not.
  if (this.visible('.modal-content')) {
      this.echo("I can see the modal. TEST PASSED!");
  } else {
      this.echo("I can't see the modal. TEST FAILED.");
  }

});

casper.run(function() {
  this.exit();
});