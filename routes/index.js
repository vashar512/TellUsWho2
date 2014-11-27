var path = require("path");

exports.index = function(req, res){
  res.render('index2', { title: "Start Bootstrap"});
};

exports.ping = function(req, res){
  res.send("pong!", 200);
};
