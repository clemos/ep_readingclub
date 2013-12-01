
function getParameterByName(name) {
    var match = RegExp('[?&]' + name + '=([^&]*)').exec(window.location.search);
    return match && decodeURIComponent(match[1].replace(/\+/g, ' '));
}

var trace = function(stuff){
	if( window.console ){
		console.log(stuff);
	}
}

exports.documentReady = function(){
	document.cookie = 'prefs=; expires=Thu, 01 Jan 1970 00:00:01 GMT;';
	$(".menu_right li").hide();
	$("#usericon").show();

	$("#oderedlist").hide();
	$("#clearAuthorship").hide();
	$("#unoderedlist").hide();
	$("#indent").hide();
	$("#outdent").hide();
	$("#undo").hide();
	$("#redo").hide();
	$("#usericon").hide();

	if( getParameterByName("fullscreen") ){
		$("body").addClass("fullscreen");
	}

	$("#chattext").removeClass("authorColors");

	$("#myuser").hide();
	$("#myusernameform").hide();
	
	$("#myswatchbox").hide();

	$("#editbar .menu_left").append("<li class='edit-msg'></li>");

	var $zoomMenu = $("<ul class='zoom-menu'></ul>");

	var $zoomOut = $("<li><a class='zoom-in' href='#'>-</a></li>");
	var $zoomIn = $("<li><a class='zoom-in' href='#'>+</a></li>");
	var $content = $('#innerdocbody');

	$zoomOut.click(function(){
		var $content = getInnerDocBody();
		//console.log("content",$content,$content.css('font-size'));
		$content.css({'font-size' : ( parseInt( $content.css('font-size') ) - 1 ) + 'px' })
	});
	$zoomIn.click(function(){
		var $content = getInnerDocBody();
		//console.log("content",$content,$content.css('font-size'));
		$content.css({'font-size' : ( parseInt( $content.css('font-size') ) + 1 ) + 'px' })
	});

	$zoomMenu.append($zoomOut).append($zoomIn);
	$("body").append($zoomMenu);

}

var min = 5;
var max = 10;
var aceFrame = null;
var getInnerDocBody = function(){
	var outer = $("iframe",aceFrame.contentDocument)[0];
	//console.log("outer frame",outer);
	var inner = outer.contentDocument;
	//console.log("inner frame",inner);
	return $("#innerdocbody", inner);
	
}

exports.aceInitialized = function(hookName,args){
	min = getParameterByName("size_min");
	max = getParameterByName("size_max");
	/*console.log("setting min/max",min,max);
	console.log("init");
	console.log(args);*/
}

exports.postAceInit = function(name,ace){
	$(".edit-msg").fadeOut(0);
	aceFrame = ace.ace.getFrame();
	var inner = getInnerDocBody();
	inner.on("click","a", function(e){
		//console.log("link click");
		e.stopPropagation();
		e.preventDefault();
		return false;
	});
	ace.ace.setProperty("textface", "Georgia, \"Times New Roman\", Times, serif" );
}

exports.aceCreateDomLine = function(name, context){
	//console.log(context);
}

var displayTimeout = 0;
var displayMessage = function(str){
	$(".edit-msg").text(str).fadeIn();
	clearInterval(displayTimeout);
	setTimeout( function(){ $(".edit-msg").fadeOut() }, 5000 );
}

exports.aceKeyEvent = function(hookName, args , cb){

	var text = args.rep.alltext;
	var editorInfo = args.editorInfo;
	var callstack = args.callstack;
	var len = editorInfo.ace_exportText().length;
	var evt = args.evt;
	
	var editEvent = callstack.editEvent;

	if( callstack.type == "idleWorkTimer" ) return;
	
	var sel = editorInfo.ace_getSelection();
	var selLen = Math.abs( sel.endPoint.maxIndex -sel.startPoint.maxIndex );

	var move = ( ( evt.keyCode <= 40 && evt.keyCode >= 37 ) 
			|| ( evt.keyCode == 65 && evt.ctrlKey ) );

	if( move ) return false;

	/*if( evt.keyCode == 86 && evt.ctrlKey ){
		console.log("copy paste");
		evt.preventDefault();
		evt.stopPropagation();
		return true;
	}*/

	//console.log(sel);
	
	var del = ( evt.keyCode == 8 || evt.keyCode == 46 ) || selLen > 1;
	var add = !del && !move;

	//console.log(del?'del':'add',selLen,len);

	if( selLen && len - selLen < min ){
		//console.log("selection too long");
		displayMessage("Selection is too long, resulting text might be too short.");
		evt.stopPropagation();
		evt.preventDefault();
		return true;
	}

	if( del && len < min ){
		displayMessage("Text is too short.");
		evt.stopPropagation();
		evt.preventDefault();
		return true;
	}

	if( add && selLen == 0 && len > max ){
		displayMessage("Text is too long.");
		evt.stopPropagation();
		evt.preventDefault();
		return true;
	}

	//return false;

}
