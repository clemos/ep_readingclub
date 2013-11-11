
var socket = io.connect('http://' + document.location.host + "/chat" );
/*socket.on('connect', function (data) {
    console.log("connect");
} );*/
socket.on('reconnect',function(data){
    //console.log("reconnect");
    setName();
});

var $mainContent = $(".main-content");

var currentUrl = document.location.href;

document.cookie = 'prefs=; expires=Thu, 01 Jan 1970 00:00:01 GMT;';

var loadPage = function(url){

    var _url = url;
    if( url == currentUrl ){
        _url += ( url.indexOf("?") > -1 ) ? "&" : "?";
        _url += "r="+Math.random();
    }
    $.ajax({
        url : _url,
        method : "get",
        dataType : "json"
    }).done(function(data){

        currentUrl = url;

        $mainContent.html(data.content);
        $(".path").removeClass("active");
        if( data.path ){
            for(i=0;i<data.path.length;i++){
                $( ".path-"+data.path[i] ).addClass("active");
            }
        } 

        updatePage();

    });

}

$("body").on("click" , "a" , function(e){
    var $this = $(this);
    var href = $this.attr('href');
    if( !e.ctrlKey 
        && !e.shiftKey 
        && !$this.hasClass('no-ajax') 
        && $this.attr('target') != '_blank' 
        && href.indexOf('javascript:') != 0 
        && href.indexOf('http:') != 0 ){
        
        e.stopPropagation();
        e.preventDefault();
        History.pushState({} , href , href );
    }

});

History.Adapter.bind(window,'statechange',function(){ // Note: We are using statechange instead of popstate
    var State = History.getState(); // Note: We are using History.getState() instead of event.state
//    console.log(State);
    loadPage(State.url);

    
});

var $chat = $(".chat");
var $chatForm = $(".chat-form");
var $chatBox = $(".chat-box");
var $chatContent = $(".chat-content");

var chatAppend = function(arr){
    if( !arr ) return;
    for(i=0;i<arr.length;i++){
        var data = arr[i];
        var $item = $("<div class='chat-item'></div>");
        $item.append( $("<span class='chat-user'></span>").text( data.name ) );
        $item.append( $("<span class='chat-text'></span>").text( data.text ) ); 
        $chatContent.append( $item );
    }
    chatUpdate();
}

var chatUpdate = function(dontAnimate){
    var $offset = $chatBox.height() - $chatContent.height();
    if( $offset < 0 ){
        if( dontAnimate ){
            $chatContent.css( {"top" : $offset} );
        }else{
             $chatContent.animate( {"top" : $offset} );
        }
    }else{
        $chatContent.css( {"top" : 0} );
    }
}

var padStatus = function(data){
    var $item = $("<div class='broadcast'></div>");
    var $link = $("<a>Accéder au texte</a>").attr( "href" , data.url );
    var $txt = $("<div></div>");

    $item.append( $txt );

    var txt = "Le texte " + data.name + " ";
    switch( data.status ){
        case "started" : 
            txt += "est ouvert.";
            $item.append( $link );
            break;
        case "stopped" :
            txt += "est fermé.";
            break;
    }

    $txt.append( txt );
    $chatContent.append( $item );
    chatUpdate();
}

var $chatInput = $chatForm.find(".chat-input");

var $changeName = $(".change-name");
var $changeNameForm = $(".change-name-form");
var $nameInput = $(".name-input");

$changeName.click(function(e){
    e.preventDefault();
    e.stopPropagation();
    $changeNameForm.removeClass("hidden");
    $nameInput.select();
})

var setName = function(){
    var name = $nameInput.val();
    if( name ){
        socket.emit("set name" , {
            name : name
        });
    }
    $changeNameForm.addClass("hidden");
}

$nameInput.change( setName );
$changeNameForm.submit( setName );
setName();

$chatForm.on("submit" , function(){
    var msg = {
        text : $chatInput.val()
    }
    if( msg.text.replace( /\s*/i , "" ) ){
        socket.emit("chat", msg);
        $chatInput.val("");
    }
});


var resize = function(){
    $(".etherpad").each( function( i, e ){
        //console.log(e);
        var $e = $(e);
        var offset = $e.offset();
        $e.height(1);
        var $eh = $(window).height() - offset.top - 5;
        if( $eh > 0 ){
            $e.height( $eh );
        }else{
            $e.height($(window).height() );
        }
    });
    
    var $ch = $(window).height() - $chat.offset().top;
    if( $ch > 0 ){
        $chat.height( $(window).height() - $chat.offset().top );
    }else{
        $chat.height( $(window).height() );
    }

    $('.wysiwyg').height($(window).height());
    $('.wysihtml5-sandbox').height( 0.8 * $(window).height() );


    $chatBox.height( $chatForm.offset().top - $chatBox.offset().top - 5 );
    chatUpdate(true);

}
resize();
$(window).resize( resize );

var updatePage = function(){

    document.cookie = 'prefs=; expires=Thu, 01 Jan 1970 00:00:01 GMT;';
    
    $('.user-typeahead').typeahead({
        source : function( query , process ){
            $.getJSON(  '/users/suggest' , {
                query : query
            },
            function( data, txt, jqhxr ){
                process(data);
            });
        }
    });

    $('.pad-typeahead').typeahead({
        source : function( query , process ){
            //console.log("HERE");
            $.getJSON(  '/pads/suggest' , {
                query : query
            },
            function( data, txt, jqhxr ){
                process(data);
            });
        }
    });

    $('.colorpicker-input').colorpicker();
    $('.datepicker').datepicker({
        format: "dd-mm-yyyy"
    });
    $('.datetimepicker').datetimepicker({
        format: "dd-MM-yyyy hh:mm:ss"
    });

    $('.wysiwyg').each(function(i,e){
        $('#'+$(e).attr('id')).wysihtml5({
            stylesheets : ["/styles/main.css"],
            style : false
        });
    });

    setLang(currentLang);

    resize();


}

$(updatePage);

var $activePads = $('.active_pads');

socket.on('active pads', function(pads){
    //console.log("got active pads",pads);
    if( pads.length ){
        $activePads.removeClass("hidden");
    }else{
        $activePads.addClass("hidden");
    }

    var $list = $activePads.find(".pads");
    $list.html('');
    for( i=0; i<pads.length; i++ ){
        var pad = pads[i];
        var $pad = $('<li class="pad"></li>');
        var $a = $('<a></a>').attr('href',pad.url).text(pad.name).addClass("pad-name");
        var $timer = $('<span class="pad-timer"></span>').attr('data-pad',pad.id);
        $pad.append($a).append($timer);

        $list.append($pad);
    }

    resize();
});

socket.on('user_count', function(n){
    $('.user_count').text(n + " personne" + ( (n>1) ? "s" : ""));
});

socket.on('chat', function(data){
    chatAppend([data]);
});

socket.on('history' , function(data){
    var reverse = [];
    for(i=data.chats.length-1;i>=0;i--){
        reverse.push(data.chats[i]);
    }
    chatAppend( reverse );
});

socket.emit("get history");
socket.emit("get active pads");

socket.on('pad status' , function(msg){
    if( msg.showInChat ){
        padStatus( msg );
    }

    var $pads = $("*[data-pad='" + msg.id + "']");
    //console.log($pads);
    $pads.each( function(i,pad){
        var $pad = $(pad);
        if( $pad.data("pad") == msg.id 
            && ( $pad.hasClass("editor") || $pad.hasClass("soon") ) 
            && !$pad.hasClass("pad-timer")
        ){
            loadPage( currentUrl );
        }
    } );
});

socket.on('pad time' , function(msg){
    var $timers = $(".pad-timer[data-pad='" + msg.id + "']");

    var t = Math.round(msg.left/1000);
    var time = {}

    var sec = t % 60;
    while( (""+sec).length < 2 ){
        sec = "0"+sec;
    }
    time.seconds = sec;

    var min = Math.round( (t-time.seconds) / 60 );
    while( (""+min).length < 2 ){
        min = "0"+min;
    }
    time.minutes = min;

   // console.log("received");
   // console.log(msg);

    //console.log($pads);
    $timers.each( function(i,timer){
        var $timer = $(timer);
        if( $timer.data("pad") == msg.id  ){
            $timer.text(time.minutes+":"+time.seconds);
        }
    } ); 
});

$(".toggle-chat").on( "click" , function(e){

    e.preventDefault();
    e.stopPropagation();

    var fullscreen = $(".etherpad.fullscreen");
    if( fullscreen.length > 0 ){
        if( !$chat.hasClass("fullscreen") ){
            $chat.addClass("hidden");
            $chat.addClass("fullscreen");
        }
    }
    var open = $chat.hasClass("hidden");

    if( open ){
        fullscreen.width( $(window).width() - $chat.width() - 15 );
        $mainContent.removeClass("span10").addClass("span7");
        $chat.removeClass("hidden");
    }else{
        fullscreen.css("width","100%");
        $mainContent.removeClass("span7").addClass("span10");
        $chat.addClass("hidden");
    }
    
});

var currentLang = "fr";

var setLang = function(lang){
    //console.log("setting lang ", lang);
    currentLang = lang;
    $("a.set-lang").each(function(i,e){
        var $e = $(e);
        var $li = $e.closest('li');
        if( $e.data('lang') == lang ){
            $li.addClass('active');
        }else{
            $li.removeClass('active');
        }
    });
    $(".translated").each(function(i,e){
        var $e = $(e);
        if( $e.data('lang') == lang ){
            $e.show();
        }else{
            $e.hide();
        }
    });
}

$("body").on("click" , "a.set-lang" , function(e){
    e.preventDefault();
    var $this = $(this);
    var lang = $this.data('lang');
    setLang(lang);
});