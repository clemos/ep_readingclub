
var attach = function( reading ){

	var Event = reading.model.Event;
	var Pad = reading.model.Pad;
	var moment = require('moment');

	reading.app.get('/events/new', function( req, res ){
		if( !req.session.rc_user 
			|| req.session.rc_user.role != "root" ){
			res.redirect("/");
			return;
		}

		var form = {
			title : "New Event",
			place : "New Place",
			date : "...",
			info : "",
			status : "draft",
			chat : "Chat log",
			texts : []
		};

		var event = null;

		res.view.render( 'events/edit' , {
			form : form,
			event : null,
			op : 'infos',
			statuses : Event.statuses,
			path : ['events']
		} );
		
	});

	reading.app.post('/events/new', function( req, res ){
		if( !req.session.rc_user 
			|| req.session.rc_user.role != "root" ){
			res.redirect("/");
			return;
		}

		var err = false;
		var form = req.body;

		form.event_date = moment( form.event_date , reading.context.date_template ).toDate();
		form.chat_start = moment( form.chat_start , reading.context.datetime_template ).toDate();
		form.chat_end = moment( form.chat_end , reading.context.datetime_template ).toDate();

		var messages = [];
		form.messages = messages;

		if( !err ){
			Event.create(form, 
				function(err){
					res.redirect("/events");
				});

		}else{
			res.view.render( 'events/edit' , {
				form : form,
				event : null,
				op : 'infos',
				statuses : Event.statuses,
				path : ['events']
			} );
		}
		
	});

	reading.app.get('/events/remove/:id', function( req, res ){
		if( !req.session.rc_user || req.session.rc_user.role != "root" ){
			res.redirect('/');
			return;
		}
		Event.remove( {_id : req.params.id } , function(err){
			res.redirect("/events");
			return;
		});
	});

	reading.app.get('/events/edit/:id/:op', function( req, res ){

		if( !req.session.rc_user 
			|| ( req.session.rc_user.role != "root" )
		){
			res.redirect("/");
			return;
		}

		Event.findOne( {_id : req.params.id } )
			.populate('texts.pad')
			.exec( function(err,event){
			if( err || !event ){
				res.redirect("/events");
				return;
			}

			var form = event;

			res.view.render('events/edit' , {
				messages : [],
				form : form,
				event : event,
				op : req.params.op,
				statuses : Event.statuses,
				path : ['events']
			} );
		});
	});

	reading.app.get('/events/:id/:op', function( req, res ){
		var op = req.params.op;
		if( op != "info" && op != "bio" ){
			res.redirect("/");
			return;
		}
		Event.findOne( { _id : req.params.id } )
			.ne( 'status' , 'upcoming' )
			.ne( 'status' , 'draft' )
			.sort( '-event_date' )
			.exec(function(err,event){
				if( event && !err ){
					switch( event.status ){
						case 'archive' : 
							path = ['archive']; 
							break;
						case 'active' :
							path = ['event'];
							break;
						default :
							path = [];
							break;
					}

					res.view.render('events/view' , {
						//message : message,
						op : op,
						event : event,
						path : path
					} );
				}else{
					res.redirect("/");
				}
			});
	});

	reading.app.get('/events/:id/:tid/:op', function( req, res ){
		var tid = req.params.tid;
		var op = req.params.op;
		var ERR = function(){ res.redirect("/"); }
		Event.findOne( { _id : req.params.id , status : 'archive' } )
			.populate('texts.pad')
			.exec(function(err,event){
				if( event && !err ){
					var text = event.texts[tid];
					if( !text ) return ERR();
					var pad = text.pad;
					if( !pad ) return ERR();
					Pad.getReadOnlyID( pad , function(err, roId){
						event.getChats( tid , function(chats){
							res.view.render('events/archive/' + op , {
								//message : message,
								chats : chats,
								text : text,
								pad : pad,
								roId : roId,
								textId : tid,
								event : event,
								path : ['archive'],
								op : op
							} );

						});
					} );
				}else{
					res.redirect("/");
				}
			});

	});
	

	reading.app.get('/archive', function( req, res ){
		Event.find( { status : "archive" } )
			.sort('-event_date')
			.exec(function(err,events){
				
				res.view.render('archive' , {
					//message : message,
					events : events,
					path : ['archive']
				} );
			});
	});

	reading.app.get('/', async function( req, res ){
		const [
			archives,
			upcoming
		] = await Promise.all([
			Event.find( { status : "archive" } )
				.sort( '-event_date' )
				.exec(),
			Event.find()
				//.ne( 'status' , 'draft' )
				.where( 'status' ).in( ["active","upcoming"] )
				.sort( 'event_date' )
				.exec()
		]);

		res.view.render('index' , {
			//message : message,
			archives : archives,
			upcoming : upcoming,
			path : []
		} );

		// var q_archives = Event.find( { status : "archive" } )
		// 	.sort( '-event_date' );

		// var q_upcoming = Event.find()
		// 	//.ne( 'status' , 'draft' )
		// 	.where( 'status' ).in( ["active","upcoming"] )
		// 	.sort( 'event_date' );
		
		// q_archives.exec(function(err,archives){
		// 	q_upcoming.exec( function(err,upcoming){
		// 		res.view.render('index' , {
		// 			//message : message,
		// 			archives : archives,
		// 			upcoming : upcoming,
		// 			path : []
		// 		} );
		// 	} );
		// });

	});

	reading.app.post('/events/edit/:id/:op', function( req, res ){

		if( !req.session.rc_user 
			|| ( req.session.rc_user.role != "root" )
			//&& req.params.id != req.session.rc_user.id ) 
			){
			res.redirect("/");
			return;
		}

		var op = req.params.op;

		Event.findOne( {_id : req.params.id } )
			.populate('texts.pad')
			.exec( function(err,event){
			if( err || !event ){
				res.redirect("/events");
				return;
			}

			var messages = [];

			var data = req.body;

			var i = 0;

			var nextText = function(){
				if( req.params.op != "texts" ){
					return end();
				}
				var txt = data.texts[i];
				if( !txt ) return end();

				if( txt.remove ||
					( !txt.pad && !txt.title && !txt.author ) 
				){
					data.texts.splice(i, 1);
					nextText();
					return;
				}else{
					
					if( txt.chat_start ){
						txt.chat_start = moment( txt.chat_start , reading.context.datetime_template ).toDate();
					}
					
					if( txt.chat_end ){
						txt.chat_end = moment( txt.chat_end , reading.context.datetime_template ).toDate();
					}		

					Pad.findOne( { name : txt.pad } , function(err, pad){
						if( pad && !err ){
							txt.pad = pad;
						}else{
							messages.push({
								text : "Pad not found : " + txt.pad,
								type : "error"
							});
						}
						i++;
						nextText();
					} );

				}
			}

			var end = function(){
				//
				if( op == 'infos' ){
					data.event_date = moment( data.event_date , reading.context.date_template ).toDate();
					data.chat_start = moment( data.chat_start , reading.context.datetime_template ).toDate();
					data.chat_end = moment( data.chat_end , reading.context.datetime_template ).toDate();
				}
				
				event.set(data);
				
				event.save(function(err){
					if(err){
						messages.push( {
							type : "error",
							text : err
						} );
					}else{
						messages.push( {
							type : "success",
							text : "Event updated !"
						} );
					}
					//console.log(form.messages);

					event.populate('texts.pad', function(){
						var form = event;
						form.messages = messages;

						res.view.render('events/edit' , {
							//message : message,
							event : event,
							op : req.params.op,
							form : form,
							statuses : Event.statuses,
							path : ['events']
						} );
					});
					
				});
			}

			nextText();

		});
	});

	

	reading.app.get('/events', function( req , res ){
		if( !req.session.rc_user || req.session.rc_user.role != "root" ){
			res.redirect('/');
			return;
		}

		Event.find({})
			.sort( 'event_date' )
			.exec( function(err,events){
			res.view.render( 'events/index' , { 
				items : events || [],
				path : ['events']
			} );
		});

	});

}

module.exports = exports = attach;