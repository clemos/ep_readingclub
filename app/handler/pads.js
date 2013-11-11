
var attach = function( reading ){

	var Pad = reading.model.Pad;
	var User = reading.model.User;

	var ether = reading.etherpad;
	var io = reading.io;

	reading.app.get('/pads/new', function( req, res ){
		if( !req.session.rc_user 
			|| req.session.rc_user.role != "root" ){
			res.redirect("/");
			return;
		}

		var form = {
			name : "New pad",
			initialText : "",
			options_colors : false,
			options_fonts : false,
			options_streams : 0,
			size_min : 0,
			size_max : 200,
			duration : 0
		};
		
		var pad = null;

		res.view.render( 'pads/edit' , {
			form : form,
			path : ["pads"],
			pad : pad,
			statuses : Pad.statuses,
			messages : [],
			op : "infos"
		} );
		
	});

	reading.app.post('/pads/new', function( req, res ){
		console.log("HERE");
		if( !req.session.rc_user 
			|| req.session.rc_user.role != "root" ){
			res.redirect("/");
			return;
		}

		var err = false;
		var form = req.body;
		var messages = [];
		
		if( !err ){
			console.log("creating pad !");
			Pad.create({
				name : form.name,
				initialText : form.initialText,
				options_colors : !!form.options_colors,
				options_fonts : !!form.options_fonts,
				options_streams : form.options_streams,
				size_min : form.size_min,
				size_max : form.size_max,
				status : "draft",
				users : [req.session.rc_user._id],
				duration : form.duration || 0
			}, 
			function(err,pad){
				console.log("created pad");
				console.log(err);
				if(err){
					res.view.render( 'pads/edit' , {
						form : form,
						pad : null,
						path : ["pads"],
						statuses : Pad.statuses,
						messages : [{
							type : "error",
							text : err.message
						}],
						op : "infos"
					} );
				}else{
					res.redirect("/pads/edit/" + pad._id + "/infos" );
				}
			});

		}else{
			res.view.render( 'pads/edit' , {
				form : form,
				path : ["pads"],
				pad : null,
				statuses : Pad.statuses,
				messages : [],
				op : "infos"
			} );
		}
		
	});

	reading.app.get('/pad/:id', function(req,res){

		Pad.findOne( {_id : req.params.id } , function(err, pad){
			
			if(!pad){
				res.send(404,"Pad doesn't exist");
				return;	
			} 

			var renderEditable = function(){
				res.view.render("pads/view", {
					path : ["pads"],
					pad : pad
				});
			};
			var renderReadOnly = function(){
				Pad.getReadOnlyID( pad , function(err, roId){
					if( err || !roId ){
						console.log(err);
						res.redirect("/");
					}else{
						res.view.render("pads/ro", {
							path : ["pads"],
							pad : pad,
							readOnlyID : roId
						});
					}
				});
			};

			var renderFullscreen = function(){
				Pad.getReadOnlyID( pad , function(err, roId){
					res.view.render("pads/fs", {
						path : ["pads"],
						pad : pad,
						readOnlyID : roId
					});
				});
			};
			var renderTimeline = function(){
				res.view.render("pads/tl", {
					path : ["pads"],
					pad : pad
				});
			}
			var renderSoon = function(){
				res.view.render("pads/soon", {
					path : ["pads"],
					pad : pad
				});
			}

			if( (pad.status == "stopped") || req.query.timeline ){
				renderTimeline();
			}else if( 
				pad.status == "started"
				&& req.session.rc_user 
				&& !req.query.readonly
				&& !req.query.fullscreen ){

				console.log("pad started, checking users ");

				var isWriter = false;
				for( i=0; i<pad.users.length; i++ ){
					u=pad.users[i];
					console.log("testing "+u);
					if( u == req.session.rc_user.id ){
						console.log("isWriter");
						isWriter = true;
					}
				}

				if( isWriter ){
					//res.cookie( "sessionID" , sessionIDs[pad._id] );
					renderEditable();
				}else{
					renderReadOnly();
				}
			}else if( pad.status == "started" || ( pad.status == "enabled" && req.session.rc_user && (req.session.rc_user.role == "root") ) ){
				if( req.query.fullscreen ){
					renderFullscreen();
				}else{
					renderReadOnly();
				}
			}else{
				renderSoon();
			}

		} );
	});

	reading.app.get('/pads/start/:id' , function(req,res){
		
		if( !req.session.rc_user 
			|| req.session.rc_user.role != "root" ){
			res.redirect("/");
			return;
		}

		Pad.findOne( {_id : req.params.id } , function(err, pad){
			pad.status = "started";
			pad.save(function(){
				res.redirect("/pads" );
			});
		} );

	});

	reading.app.get('/pads/enable/:id' , function(req,res){
		
		if( !req.session.rc_user 
			|| req.session.rc_user.role != "root" ){
			res.redirect("/");
			return;
		}

		Pad.findOne( {_id : req.params.id } , function(err, pad){
			pad.status = "enabled";
			pad.save(function(){
				res.redirect("/pads" );
			});
		} );

	});

	reading.app.get('/pads/stop/:id' , function(req,res){
		if( !req.session.rc_user 
			|| ( req.session.rc_user.role != "root" 
			&& req.params.id != req.session.rc_user.id ) ){
			res.redirect("/");
			return;
		}

		Pad.findOne( {_id : req.params.id } , function(err, pad){
			pad.status = "stopped";
			pad.save(function(){
				res.redirect( "/pads" );
			});
		} );

	});

	reading.app.get('/pads/edit/:id/:op', function( req, res ){

		if( !req.session.rc_user 
			|| ( req.session.rc_user.role != "root" 
			&& req.params.id != req.session.rc_user.id ) ){
			res.redirect("/");
			return;
		}

		Pad.findOne( {_id : req.params.id } )
			.populate('users')
			.exec( function(err,pad){
			if( err || !pad ){
				res.redirect("/pads");
				return;
			}

			var form = pad;

			res.view.render('pads/edit' , {
				messages : [],
				path : ["pads"],
				form : form,
				pad : pad,
				statuses : Pad.statuses,
				op : req.params.op
			} );
		});
	});


	reading.app.post('/pads/edit/:id/:op', function( req, res ){

		if( !req.session.rc_user 
			|| ( req.session.rc_user.role != "root" 
			&& req.params.id != req.session.rc_user.id ) ){
			res.redirect("/");
			return;
		}

		Pad.findOne( {_id : req.params.id } )
			.populate('users')
			.exec( function(err,pad){
			if( err || !pad ){
				res.redirect("/pads");
				return;
			}

			var messages = [];
			var form = req.body;

			pad.name = form.name;
			pad.options_colors = form.options_colors;
			pad.options_fonts = form.options_fonts;
			pad.options_streams = form.options_streams;
			pad.size_min = form.size_min;
			pad.size_max = form.size_max;
			pad.duration = form.duration;

			pad.initialText = form.initialText;
			
			pad.status = pad.status || 'disabled';

			pad.save(function(err){
				if(err){
					messages.push( {
						type : "error",
						text : err
					} );
				}else{
					messages.push( {
						type : "success",
						text : "Pad updated !"
					} );
				}

				var form = pad;

				console.log(pad);

				res.view.render('pads/edit' , {
					messages : messages,
					path : ["pads"],
					pad : pad,
					form : form,
					statuses : Pad.statuses,
					op : req.params.op
				} );
			});

		});
	});

	reading.app.get('/pads/remove/:id', function( req, res ){
		if( !req.session.rc_user || req.session.rc_user.role != "root" ){
			res.redirect('/');
			return;
		}
		Pad.remove( {_id : req.params.id } , function(err){
			res.redirect("/pads");
			return;
		});
	});

	reading.app.get('/pads/edit/:id/users/add', function( req, res ){
		Pad.findOne( {_id : req.params.id }, function(err,pad){
			//console.log(pad);
			if( req.query.name ){
				User.findOne( { name : req.query.name } , function(err,user){
					
					var end = function(){
						res.redirect("/pads/edit/" + pad._id + '/users');
					}

					if( err || !user ){
						end();
						return;
					}
					
					pad.users.push( user._id );
					pad.save( function(){
						if( pad.status == "started" ){
							Pad.createSession( pad , user , end );
						}else{
							end();
						}	
					} );
					
					//
				});
			}else{
				res.redirect("/pads/edit/" + pad._id + '/users');
			}
			return;
		});
	});	

	reading.app.get('/pads/edit/:id/users/remove', function( req, res ){
		Pad.findOne( {_id : req.params.id }, function(err,pad){
			if( req.query.id ){
				User.findOne( { _id : req.query.id } , function(err,user){
					pad.users.remove( user._id );
					pad.save(function(err){
						console.log(err);
						res.redirect("/pads/edit/" + pad._id + '/users');
					});
				});
			}else{
				res.redirect("/pads/edit/" + pad._id + '/users');
			}
			return;
		});
	});	

	reading.app.get('/pads', function( req , res ){
		if( !req.session.rc_user ){
			res.redirect('/');
			return;
		}

		var q = Pad.find({});

		if( req.session.rc_user.role == "author" ){
			q.where( 'users', req.session.rc_user._id );
		}

		q.exec( function(err,pads){
			res.view.render( 'pads/index' , { 
				messages : [],
				items : pads,
				path : ['pads']
			} );
		});

	});

	reading.app.get('/pads/suggest', function( req , res ){
		if( !req.session.rc_user || req.session.rc_user.role != "root" ){
			res.redirect('/');
			return;
		}

		Pad.find( {} , function(err,pads){
			var outp = [];
			pads.forEach(function(u){
				outp.push( u.name );
			});
			res.send( outp );
		});

	});
}

module.exports = exports = attach;