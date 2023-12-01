var conf = require('./conf');

var express = require('express');
//var app = express();
var ejs = require('ejs');
var fs = require('fs');
var mongoose = require('mongoose');
var connect = require('connect');
var serveStatic = require('serve-static');
var etherpad_client = require('etherpad-lite-client');
var webaccess = require('../../ep_etherpad-lite/node/hooks/express/webaccess');
//var server = require('http').createServer(app);
//var io = require('socket.io').listen(server);
var moment = require('moment');

var datetime_template = "DD-MM-YYYY HH:mm:ss";
var date_template = "DD-MM-YYYY";
var format_datetime = function( date ){
	var m =  moment(date);
	if( m ){
		return m.format( datetime_template );	
	}
}
var format_date = function( date ){
	var m =  moment(date);
	if( m ){
		return m.format( date_template );	
	}
	//return moment(date).format( date_template );
}
var reading = {
	etherpad : etherpad_client.connect( conf.etherpad ),
	//io : io,
	model : {},
	context : {
		path : [],
		conf : conf,
		format_datetime : format_datetime,
		datetime_template : datetime_template,
		format_date : format_date,
		date_template : date_template
	},
	//app : app
};

mongoose.connect( conf.mongo );

function socketio( hook, args , cb ){
	console.log("SOCKET IO HOOK");
	var app = args.app;
	var io = args.io;

	reading.io = io;
	//console.log("HERE");
	//console.log(app);
	
	//io.set("transports", ["xhr-polling", "jsonp-polling"]);
	// io.set("log level",3);
	//io.set("close timeout", 10);
	//io.set("heartbeat timeout", 10);

	console.log("SOCKET IO HOOK: registering models...");
	reading.model.Page = require('./model/Page')( reading );
	reading.model.User = require('./model/User')( reading );
	reading.model.Pad = require('./model/Pad')( reading );
	reading.model.Chat = require('./model/Chat')( reading );
	reading.model.Event = require('./model/Event')( reading );
	
	console.log("SOCKET IO HOOK: registering pages...");
	//app.configure( function(){
	require('./handler/chat.js')( reading );
	require('./handler/users.js')( reading );
	require('./handler/pads.js')( reading );
	require('./handler/pages.js')( reading );
	require('./handler/events.js')( reading );
	
	console.log("SOCKET IO HOOK: complete");
	return cb();
	//});
}

function expressConfigure(hook, args , cb ){

	console.log("EXPRESS HOOK");

	var app = args.app;
	reading.app = app;

	// webaccess.expressConfigure(hook,args,cb);

	// app.use(webaccess.checkAccess);

	/*app.use( connect.cookieParser( conf.session.secret ) );
	app.use( express.session( {
		key : 'express_sid',
		secret : conf.session.secret,
		store : new connect_mongo({
			url : conf.mongo,
			auto_reconnect : true
		})
	} ) );*/

	// app.use( connect.static( __dirname ) );
	// app.use( connect.static( __dirname + "/../dist" ) );

	app.use( serveStatic( __dirname ) );
	app.use( serveStatic( __dirname + "/../dist" ) );
	
	//app.use( connect.bodyParser() );
	app.use( function(req,res,next){
		//update user
		//console.log("update user");
		console.log(req.session);
		if( req.session && req.session.rc_user_id ){
			reading.model.User.findOne( { _id : req.session.rc_user_id } , function(err,user){
				
				req.session.rc_user = user;
				
				//console.log("done");
				next();
			} );
		}else{
			next();
		}
	} );

	app.use( function( req , res , next ){
		console.log("here !");
		var view = {
			data : {
				session : req.session
			},
			render : function( tpl , user_data ){
				var fn = __dirname + "/tpl/" + tpl + ".ejs";
				var data = view.data;
				
				for( i in reading.context ){
					data[i] = reading.context[i];
				}

				user_data = user_data || {};
				for( i in user_data ){
					data[i] = user_data[i];
				}

				var renderFile = function( filename , ctx , cb ){
					console.log("rendering ",filename);
					ctx.filename = filename;
					fs.exists(filename,function(ex){
						if( ex ){
							fs.readFile( 
								filename, 
								{ encoding : "utf-8" },
								function( err, body ){
									cb( null, ejs.render( body , ctx ) );
								}
							);
						}else{
							cb( "not found" );
						}
					});

				}

				renderFile( fn , data , function( err,content ){
					//console.log(content);
					if( err ){
						res.status(404).send(err);
						return;
					}
					if( req.get('X-Requested-With') == 'XMLHttpRequest' ){
						res.send( { content : content , path : data.path } );
						return;
					}else{	
						renderFile( __dirname + '/tpl/layout/head.ejs' , data , function(err,head){
							renderFile( __dirname + '/tpl/layout/foot.ejs' , data , function(err,foot){
								res.send( head + content + foot );
								return;
							});
						} );
					}

				} );

				
				

			}
		}

		res.view = view;
		next();

	} );

	console.log("EXPRESS HOOK complete");

	/*app.get('/', function(req, res){
		res.view.render( "index" , { pad : "test" } );
	});*/

}

exports.socketio = socketio;
exports.expressConfigure = expressConfigure;

//module.exports = exports = server;

//exports.app = app;

/*exports.use = function() {
	//console.log("USE");
	app.use.apply(app, arguments);
};*/