
exports = module.exports = function( reading ){

	var Chat = reading.model.Chat;
	var io = reading.io.of('/chat');
	var app = reading.app;
	var Pad = reading.model.Pad;

	app.get("/chats/clean" , function(req, res){
		var removeIds = [];
		var prevText = null;
		Chat.find({})
			.sort("date")
			.exec(function(err, chats){
				chats.forEach(function(chat,i){
					if( !chat.name || !chat.text || !chat.date ){
						removeIds.push(chat._id);
					}else{
						if( prevText == chat.text ){
							removeIds.push(chat._id);
						}
						prevText = chat.text;
					}
				});
				console.log("remove : ");
				console.log(removeIds);
				Chat.find({})
					.in("_id" , removeIds)
					.remove(function(err){
						res.send("Done!");
					});
			});

	});

	app.get("/chats" , function(req, res){
		var offset = parseInt(req.query.offset) || 0;
		var n = parseInt(req.query.n) || 100;
		var prev = offset - n;
		var next = offset + n;

		Chat.find({})
			.sort("date")
			.limit(n)
			.skip( req.query.offset )
			.exec(function(err, chats){
				Chat.count({}, function(err,max){
					if( next > max ){
						next = -1;
					}
					res.view.render("chats/index" , {
						path : ['chat'],
						chats : chats,
						offset : offset,
						next : next,
						prev : prev,
						max : max,
						n : n
					});
				});
				
			});

	});

	var user_count = 0;

	var emitCount = function(){
		io.emit( "user_count", user_count );
	}

	io.on("connection" , function(socket){
		user_count++;
		emitCount();

		socket.on("disconnect", function(){
			user_count--;
			emitCount();
		});

		socket.on( "set name" , function(data){
			console.log("setting name " + data.name);
			socket.set("nickname" , data.name,function(err,o){
				console.log("err",err);
				console.log("o",o);
			} );
		});

		socket.on( "chat" , function(data){
			socket.get("nickname" , function(err,name){
				console.log("err",err);
				console.log("name",name);
				var msg = {
					text : data.text,
					date : new Date(),
					name : name || "Nobody"
				};

				Chat.create(msg,function(err){
					if( err ){ console.log(err); }
					io.emit( "chat" , msg );
				});
				
			});
			
		});

		socket.on("get history" , function(data){
			Chat.find()
				.sort("-date")
				.limit(10)
				.exec( function( err , chats ){
					socket.emit( "history" , { chats : chats } );
				});

		});

		socket.on("get active pads", function(){
			Pad.emitActivePads(socket);
		});

	});
}