
function getParameterByName(name, url) {
    if (!url) url = window.location.href;
    name = name.replace(/[\[\]]/g, "\\$&");
    var regex = new RegExp("[?&]" + name + "(=([^&#]*)|&|#|$)"),
        results = regex.exec(url);
    if (!results) return null;
    if (!results[2]) return '';
    return decodeURIComponent(results[2].replace(/\+/g, " "));
}

$(document).ready(function () {
	
	var article_url = getParameterByName('article');
	$.ajax({ 
	    type: 'GET', 
	    url: '/summary_data?article=' + article_url, 
	    dataType: 'json',
	    success: function (data) { 
	        $.each(data.posts, function(index, element) {
	        	
	        	text = element.text;
	        	
	        	var splitted = text.split("\n");
	        	
	        	for (var i=0; i<splitted.length; i++) {
	        		part = text[i];
	        		if (part.indexOf('[[') > -1) {
	        			
	        		}
	        	}
	        	
	        	text = text.replace(/\n\n/g, '</P><P>');
	        	
	        	text = text.replace(/\n/g, ' ');
	        	
	        	var pattern = /\[quote\]/g;
				text = text.replace(pattern, '<blockquote>');
				var pattern = /\[endquote\]/g;
				text = text.replace(pattern, '</blockquote>');
	
				text = '<P>' + text + '</P>';
	        	
	        	$('#summary').append(text);
	        });
	    }
	});
});