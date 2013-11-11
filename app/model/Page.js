
module.exports = exports = function( reading ){
	var mongoose = require('mongoose');
	
	var ether = reading.etherpad;

	var schema = mongoose.Schema({
		name : { type : String },
		title : { type : String },
		title_en : { type : String },
		content : { type : String },
		content_en : { type : String }
	});

	var Page = mongoose.model( 'Page' , schema );

	return Page;
}
