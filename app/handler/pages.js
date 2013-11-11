
var attach = function( reading ){

	var Page = reading.model.Page;

	reading.app.get('/info', function( req, res ){
		Page.findOne({name:"info"} , function(err, page){
			res.view.render('pages/view',{
				path:[page.name],
				page:page
			});
		});
	});

	reading.app.get('/pages' , function(req,res){
		if( !req.session.rc_user || req.session.rc_user.role != "root" ){
			res.redirect('/');
			return;
		}

		Page.find().exec(function(err,pages){
			res.view.render("pages/index", {
				items : pages,
				path : ['pages']
			});
		});

	});

	reading.app.get('/pages/edit/:id' , function(req,res){
		if( !req.session.rc_user || req.session.rc_user.role != "root" ){
			res.redirect('/');
			return;
		}



		Page.findOne({ _id : req.params.id },function(err,page){
			res.view.render("pages/edit", {
				page : page,
				form : {
					messages : []
				},
				path : ['pages']
			});
		});

	});

	reading.app.post('/pages/edit/:id' , function(req,res){
		if( !req.session.rc_user || req.session.rc_user.role != "root" ){
			res.redirect('/');
			return;
		}


		Page.findOne({ _id : req.params.id },function(err,page){
			page.set(req.body);
			page.save(function(err){
				var messages = [];
				if( err ){
					messages.push({
						type:'error',
						text : err
					});
				}else{
					messages.push({
						type: 'success',
						text : 'Page successfully saved !'
					});
				}

				res.view.render("pages/edit", {
					page : page,
					form : {
						messages : messages
					},
					path : ['pages']
				});

			});
		});

	});

	reading.app.get('/pages/init' , function(req,res){
		var q = {
			name:'info',
			title : 'Info'
		};
		var end = function(msg){
			res.send(msg);
		}
		Page.findOne(q,function(err,page){
			console.log("PAGE",page);
			if( !page ){
				Page.create(q,function(err,page){
					end("Page 'info' created !");
				});
			}else{
				end("Nothing to do");
			}
		});
	});

}

module.exports = exports = attach;