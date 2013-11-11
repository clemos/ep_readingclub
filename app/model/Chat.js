
module.exports = exports = function( reading ){
	var mongoose = require('mongoose');
	
	var schema = mongoose.Schema({
		name : { type : String },
		text : { type : String },
		date : { type : Date }
	});

	var Chat = mongoose.model( 'Chat' , schema );

	return Chat;
}
