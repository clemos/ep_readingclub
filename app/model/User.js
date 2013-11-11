
module.exports = exports = function( reading ){
	var mongoose = require('mongoose');
	var mongoose_text_search = require('mongoose-text-search');

	var ether = reading.etherpad;

	var schema = mongoose.Schema({
		name : { type : String },
		authorID : { type : String },
		email : { type : String },
		password : 'string',
		role : 'string',
		sessionIDs : mongoose.Schema.Types.Mixed,
		color : 'string'
	});

	schema.plugin(mongoose_text_search);
	schema.index( { name : 'string', email : 'string' } );

	schema.pre('save', function(next){
		var user = this
		if( !user.authorID ){
			console.log("creating etherpad user for ("+user.name+")");
			ether.createAuthor(
			{ name : user.name }, 
			function(err,res){
				if( err ){
					console.log( err );
				}
				console.log(res);
				user.authorID = res.authorID;
				next();
			});
		}else{
			next();
		}
	});

	var User = mongoose.model( 'User' , schema );

	User.roles = ["author","root"];

	return User;
}
