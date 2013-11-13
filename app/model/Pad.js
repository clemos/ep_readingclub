
module.exports = exports = function( reading ){
	var mongoose = require('mongoose');

	var ether = reading.etherpad;
	var io = reading.io;

	var sockets = io.of('/chat');

	var schema = mongoose.Schema({
		name : {type : String },
		padID : {type : String },
		groupID : {type : String },
		initialText : 'string',
		options_colors : Boolean,
		options_fonts : Boolean,
		options_streams : Number,
		size_min : Number, 
		size_max : Number,
		status : 'string',
		users : [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
		duration : Number,
		started_date : {type:Date},
		stopped_date : {type:Date}
	});

	var createSession = function( pad , user , next ){
		console.log("adding session");
		//console.log(pad);
		//console.log(user);
		ether.createSession({
			groupID : pad.groupID,
			authorID : user.authorID,
			validUntil : +new Date(2020,1,1)
		}, function(err,res){
			if( err ) console.log( err );
			user.sessionIDs = user.sessionIDs || {};
			console.log("pad : "+pad.padID);
			console.log("session : "+res.sessionID);
			user.sessionIDs[pad._id] = res.sessionID;
			user.markModified("sessionIDs");
			user.save(function(err){
				console.log("user saved");

				if( err ) console.log( err );
				next();
			});
			
		});
	}

	var addUsers = function( pad , next ){
		console.log("adding users");
		pad.populate('users', function(){
			console.log(pad);
			var users = pad.users.slice(0);
			var nextUser = function(){
				var user = users.pop();
				if( user ){
					createSession( pad, user, nextUser );
				}else{
					next();
				}
			}
			nextUser();
		});
		
	}

	var createGroup = function( pad , next ){
		console.log("creating group");
		if( !pad.groupID ){
			ether.createGroup({
				groupMapper : pad._id
			},
			function(err,res){

				pad.groupID = res.groupID;
				next();
			});
		}else{
			next();
		}
	}

	var createPad = function( pad , next ){
		console.log("creating pad");
		//console.log(pad);
		if( !pad.padID ){
			var padID = pad.groupID;
			ether.createPad({
				padID : padID,
				name : pad.name,
				text : pad.initialText
			},
			/*ether.createGroupPad({
				groupID : pad.groupID,
				name : pad.name,
				text : pad.initialText
			},*/
			function(err,res){
				if(err) console.log( err );
				pad.padID = padID;
				if(next) next();
			});
		}else{
			next();
		}
	}

	var start = function( pad , next ){
		if( pad.duration > 0 ){
			tick( pad );
		}
		if( pad.padID == null ){
			enable( pad , next );
		}else{
			next();
		}
	}

	var enable = function( pad , next ){
		createGroup( pad , function(){ 
			createPad( pad , function(){ 
				addUsers( pad , next );
			}); 
		} );
	}

	var tick = function( pad ){
		var end_date = new Date( pad.started_date );
		end_date.setMinutes( end_date.getMinutes() + pad.duration );

		var left = end_date - new Date();

		var msg = {
			start_date : pad.started_date,
			end_date : end_date,
			left : left,
			duration : pad.duration,
			id : pad.id
		};

		sockets.emit( "pad time" , msg );

		if( left > 0 ){
			setTimeout( function(){ 
				tick( pad ); 
			} , 1000 );
		}else{
			pad.status = "stopped";
			pad.save(function(err){
				console.log("pad stopped and saved");
				console.log( err );
			});
		}

	}

	var emitStatus = function( pad , socket ){
		console.log("emit status",pad._id);
		var msg = {
			name : pad.name,
			status : pad.status,
			id : pad._id,
			url : "/pad/" + pad._id
		}

		if( !socket ){
			socket = sockets;
			msg.showInChat = true;
		}
		socket.emit("pad status", msg );
		//emitActivePads(socket);
	}

	var emitActivePads = function( socket ){
		console.log("emit active pads...");
		if( !socket ){
			socket = sockets;
		}

		var active_pads = [];
		//console.log("emit active pads");
		getActivePads(function(err,pads){
			//console.log("active pads",pads);
			if( err ){
				console.log(err);
				return;
			}
			var nextPad = function(){
				var pad = pads.pop();
				if( !pad && (pads.length == 0) ){
					console.log("ACTUALLY EMITTING", active_pads);
					socket.emit("active pads", active_pads );
				}else{
					getText(pad,function(err,txt){
						if( txt ){
							active_pads.push({
								id : pad._id,
								title : txt.title,
								name : pad.name,
								duration : pad.duration,
								url : "/pad/" + pad._id
							});
						}/*else{
							active_pads.push({
								id : pad._id,
								title : pad.name,
								name : pad.name,
								duration : pad.duration,
								url : "/pad/" + pad._id
							});
						}*/
						nextPad();
					});

				}
			}

			nextPad();
		});
	}

	var getActivePads = function( cb ){
		Pad.find( { 
			status : 'started'
		} , cb );
	}

	var getReadOnlyID = function( pad , cb ){
		ether.getReadOnlyID( { padID : pad.padID }, function(err, ret){
			if( err || !ret ){
				console.log(err);	
				cb(err,null);
			}else{
				cb(err,ret.readOnlyID );
			}
			
		});
	}

	var getText = function( pad , cb ){
		getEvent(pad,function(err,event){
			if( err ) console.log(err);
			console.log("associated event",event);
			if( event && event.texts ){
				for( var i=0; i<event.texts.length; i++ ){
					var txt = event.texts[i];
					console.log(txt);
					console.dir(""+txt.pad,""+pad._id);
					if( ""+txt.pad == ""+pad.id ){
						console.log("found");
						return cb(err,txt);
					}
				}
			}
			cb(err);
		});
	}
	var getEvent = function( pad , cb ){
		var ObjectId = mongoose.Types.ObjectId;
		console.log("trying to find event associated to ", pad);
		var Event = reading.model.Event;
		var q = { 'texts' : { '$elemMatch' : { 'pad' : new ObjectId(pad.id) } } };
		console.log(q);
		Event.findOne( q , cb );
	}

	schema.pre('save', function(next){
		//console.log("started_date : " + this.started_date);
		switch(this.status){
			case "enabled":
				console.log("ENABLING");
				enable( this , next );
				return;
			case "started":
				if( !this.started_date ){
					console.log("STARTING");
					this.started_date = new Date();
					emitStatus(this);
					start( this , next );
					return;
				}
				break;
			case "stopped":
				if( !this.stopped_date ){
					console.log("STOPPING");
					this.stopped_date = new Date();
					emitStatus(this);
				}
				break;		
		}

		next();
	});

	schema.post('save', function(){ console.log("post save"); emitActivePads(); });
	schema.post('remove', function(){ console.log("post remove"); emitActivePads(); });

	var Pad = mongoose.model( 'Pad' , schema );
	Pad.createSession = createSession;
	Pad.emitStatus = emitStatus;
	Pad.getReadOnlyID = getReadOnlyID;
	Pad.emitActivePads = emitActivePads;

	Pad.prototype.readOnlyID = function( cb ){
		return Pad.getReadOnlyID( this , cb );
	}

	Pad.statuses = [
		"disabled",
		"private",
		"public"
	];

	return Pad;
}
