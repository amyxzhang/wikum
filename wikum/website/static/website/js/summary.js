
function getParameterByName(name, url) {
    if (!url) url = window.location.href;
    name = name.replace(/[\[\]]/g, "\\$&");
    var regex = new RegExp("[?&]" + name + "(=([^&#]*)|&|#|$)"),
        results = regex.exec(url);
    if (!results) return null;
    if (!results[2]) return '';
    return decodeURIComponent(results[2].replace(/\+/g, " "));
}

function get_comment(comment_str) {
	link = event.target;
	
	if ($('#' + comment_str).length > 0) {
		$('#' + comment_str).toggle();	
	} else {
		new_comment = '<div class="insert_comment" id="' + comment_str + '">HERE</div>';
		$(link).after(new_comment);
	}
	
	
}

$(document).ready(function () {
	
	var article_url = getParameterByName('article');
	var next = parseInt(getParameterByName('next'));
	if (!next) {
		next = 0;
	}
	
	$.ajax({ 
	    type: 'GET', 
	    url: '/summary_data?article=' + article_url + '&next=' + next, 
	    dataType: 'json',
	    success: function (data) { 
	        $.each(data.posts, function(index, element) {
	        	
	        	text = element.text;
	        	$('#summary').append('<P>');
	        	
	        	var splitted = text.split("\n");
	        	
	        	for (var i=0; i<splitted.length; i++) {
	        		part = splitted[i];
	        		
	        		var pattern = /\[quote\]/g;
	        		part = part.replace(pattern, '<blockquote>');
					var pattern = /\[endquote\]/g;
					part = part.replace(pattern, '</blockquote>');
	        		
					if (part.indexOf('[[') > -1) {
						var comment = part.match(/\[\[(.*)\]\]/);
						var link = comment[1];
						part = part.replace(/\[\[(.*)\]\]/g, "");
						part = '<a onclick="get_comment(\'' + link + '\');">' + part + '</a>';
						$('#summary').append(part);
					} else {
						if (part == '') {
							$('#summary').append('</P><P>');
						} else {
							$('#summary').append(part + ' ');
						}
					}
	        	}
	        	
	        	$('#summary').append('</P>');
	        	
	        });
	    }
	    
	    
	});
	
	
});