function customStart()
{
  //define your javascript here
  //jquery is available - except index.js
  //you can load extra scripts with $.getScript http://api.jquery.com/jQuery.getScript/


  function getParameterByName(name) {
    var match = RegExp('[?&]' + name + '=([^&]*)').exec(window.location.search);
    return match && decodeURIComponent(match[1].replace(/\+/g, ' '));
  }

  if( getParameterByName( "noColors" ) == "true" ){
  	$("body").addClass("no-colors");
  }

  if( getParameterByName( "fullscreen" ) == "true" ){
    $("body").addClass("fullscreen");
  }

  if( getParameterByName( "autostart" ) == "true" ){
    $("body").addClass("autostart");
  }

  $('body').on("click","a", function(e){
    e.stopPropagation();
    e.preventDefault();
    return false;
  });
}
