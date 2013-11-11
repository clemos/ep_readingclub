var server = require("./index");
var express = require("express");
var connect = require("connect");

var port = process.env.PORT || 9000;
console.log(__dirname)
server.use( 
    express.static( __dirname ) 
);
server.listen(port);
