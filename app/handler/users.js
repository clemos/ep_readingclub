
var attach = function( reading ){

	var User = reading.model.User;

	reading.app.get('/login', function( req, res ){
		var form = {};

		if( req.query.redir ){
			form.redir = req.query.redir;
		}

		res.view.render( 'login' , { 
			form : form ,
			path : ['login']
		} );
	});

	reading.app.post('/login', function( req , res ){
		var form = {};
		form.email = req.body.email;
		form.redir = req.query.redir || req.body.redir;

		if( !req.body.email || !req.body.password ){
			form.message = {
				type : 'error',
				text : 'Veuillez remplir tous les champs'
			};
			res.view.render( 'login' , { form : form } );
		}else{
			User.findOne({
				email : req.body.email,
				password : req.body.password
			}, function(err, user){
				if( user ){
					req.session.rc_user_id = ""+user._id;
					req.session.rc_user = user;
					if( form.redir ){
						return res.redirect( form.redir );
					}else{
						return res.redirect( "/" );
					}
				}else{
					form.message = {
						type : 'error',
						text : 'Email ou mot de passe incorrect'
					};
					res.view.render( 'login'  , { form : form } );
				}
			} );
		}
	
	});

	reading.app.get('/logout', function( req , res ){
		req.session.rc_user = req.session.rc_user_id = null;
		res.redirect("/");
	});

	reading.app.get('/users/new', function( req, res ){
		if( !req.session.rc_user 
			|| req.session.rc_user.role != "root" ){
			res.redirect("/");
			return;
		}

		var form = {
			name : "",
			email : ""
		};
		var user = null;

		res.view.render( 'users/edit' , {
			form : form,
			user : user,
			roles : User.roles,
			path : ['users']
		} );
		
	});

	reading.app.post('/users/new', function( req, res ){
		if( !req.session.rc_user 
			|| req.session.rc_user.role != "root" ){
			res.redirect("/");
			return;
		}

		var err = false;
		var form = req.body;
		var messages = [];
		form.messages = messages;

		if( form.password && form.password != form.password2 ){
			messages.push({
				type : "error",
				message : "Password and confirmation mismatch"
			});
			err = true;
		}

		if( !form.password ){
			messages.push({
				type : "error",
				message : "Please enter a password"
			});
		}

		if( !form.name ){
			messages.push({
				type : "error",
				message : "Please enter a name"
			});
		}

		if( !form.email ){
			messages.push({
				type : "error",
				message : "Please enter an email address"
			});
		}

		if( !err ){
			User.create({
				name : form.name,
				email : form.email,
				password : form.password,
				role : form.role,
				color : form.color
			}, 
			function(err){
				res.redirect("/users");
			});

		}else{
			res.view.render( 'users/edit' , {
				form : form,
				user : user,
				roles : User.roles,
				path : ['users']
			} );
		}
		
	});

	reading.app.get('/users/edit/:id', function( req, res ){

		if( !req.session.rc_user 
			|| ( req.session.rc_user.role != "root" 
			&& req.params.id != req.session.rc_user.id ) ){
			res.redirect("/");
			return;
		}

		User.findOne( {_id : req.params.id } , function(err,user){
			if( err || !user ){
				res.redirect("/users");
				return;
			}

			var form = {
				name : user.name,
				email : user.email,
				role : user.role,
				color : user.color
			};

			res.view.render('users/edit' , {
				messages : [],
				form : form,
				user : user,
				roles : User.roles,
				path : ['users']
			} );
		});
	});

	reading.app.post('/users/edit/:id', function( req, res ){

		if( !req.session.rc_user 
			|| ( req.session.rc_user.role != "root" 
			&& req.params.id != req.session.rc_user.id ) ){
			res.redirect("/");
			return;
		}

		User.findOne( {_id : req.params.id } , function(err,user){
			if( err || !user ){
				res.redirect("/users");
				return;
			}

			var messages = [];

			user.name = req.body.name || user.name;
			user.email = req.body.email || user.email;
			user.color = req.body.color || user.color;
			user.role = req.body.role || user.role;

			if( req.body.password ){
				if( req.body.password != req.body.password2 ){
					messages.push( {
						type : "warning",
						message : "Password and confirmation mismatch"
					} );
				}else{
					user.password = req.body.password;
				}
			} 

			user.save(function(err){
				if(err){
					messages.push( {
						type : "error",
						text : err
					} );
				}else{
					messages.push( {
						type : "success",
						text : "User updated !"
					} );
				}

				var form = {
					name : user.name,
					email : user.email,
					role : user.role,
					messages : messages,
					color: user.color
				};

				console.log(form.messages);

				res.view.render('users/edit' , {
					//message : message,
					user : user,
					form : form,
					roles : User.roles,
					path : ['users']
				} );
			});

		});
	});

	reading.app.get('/users/remove/:id', function( req, res ){
		if( !req.session.rc_user || req.session.rc_user.role != "root" ){
			res.redirect('/');
			return;
		}
		User.remove( {_id : req.params.id } , function(err){
			res.redirect("/users");
			return;
		});
	});

	reading.app.get('/users', function( req , res ){
		if( !req.session.rc_user || req.session.rc_user.role != "root" ){
			res.redirect('/');
			return;
		}

		User.find({} , function(err,users){
			res.view.render( 'users/index' , { 
				items : users,
				path : ['users']
			} );
		});

	});

	reading.app.get('/users/suggest', function( req , res ){
		if( !req.session.rc_user || req.session.rc_user.role != "root" ){
			res.redirect('/');
			return;
		}

		/*User.textSearch( req.params.query , function(err,users){
			console.log(err);
			console.log(users);
			var outp = [];
			for( u in users ){
				outp.push( u.name );
			}
			res.send( outp );
		});*/
		User.find( {} , function(err,users){
			//console.log(err);
			//console.log(users);
			var outp = [];
			users.forEach(function(u){
				outp.push( u.name );
			});
			res.send( outp );
		});

	});

}

module.exports = exports = attach;