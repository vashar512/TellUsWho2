// Creating a casper module instance
var casper = require('casper').create({
  verbose: false,
  logLevel: "debug"
});

var config = {
  url: 'http://telluswho2.herokuapp.com/',
};

casper.start(config.url);

casper.then(function() {
  console.log("Current page: " + this.getCurrentUrl());
  this.click('a.btn-lg:nth-child(3)');
  console.log("Button was just clicked.")
});

casper.run(function() {
  console.log("Current page: " + this.getCurrentUrl());
  njitTitle = "New Jersey Institute of Technology";
  
  if(njitTitle = this.getTitle()) {
  	console.log("'Visit TellUsWho2 Research Page' link goes to njit's website. TEST PASSED!");
  } else {
  	console.log("'Visit TellUsWho2 Research Page' link DOES NOT go to njit's website. TEST FAILED.");
  }
  this.exit();
});