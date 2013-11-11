
module.exports = exports = function( reading ){
	var mongoose = require('mongoose');
	var Pad = reading.model.Pad;
	var Chat = reading.model.Chat;
	
	var ether = reading.etherpad;

	var statuses = ["draft","upcoming","active","archive"];

	var schema = mongoose.Schema({
		title : { type : String },
		place : { type : String },
		date : { type : String },
		event_date : { type : Date , default : Date.now },
		info : { type : String },
		status : { type : String , enum : statuses },
		//chat : { type : String },
		chat_start : { type : Date , default : Date.now },
		chat_end : { type : Date , default : Date.now },
		texts : [ { 
			title : String,
			author : String, 
			info : String, 
			pad : { ref : 'Pad' , type : mongoose.Schema.Types.ObjectId },
			bios : String,
			chat_start : { type : Date , default : Date.now },
			chat_end : { type : Date , default : Date.now }
		} ]
	});

	var Event = mongoose.model( 'Event' , schema );

	Event.statuses = statuses;

	Event.prototype.getChats = function(textId, callback){
		var txt;
		var start = this.chat_start;
		var end = this.chat_end;
		
		if( textId && (txt=this.texts[textId]) ){
			start = txt.chat_start;
			end = txt.chat_end;
		}
		
		Chat.find({ 'date' : { $gte : start , $lte : end } })
			.sort("date")
			.exec( function( err , chats ){
				
				//console.log(chats);
				if( err ){
					//console.log(err);
					callback([]);
				}else{
					callback( chats );
				}
			});
	}

	return Event;
}
