
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
	
	console.log(link);
	
	if ($('#' + comment_str).length > 0) {
		$('#' + comment_str).toggle();	
	} else {
		p = comment_str.indexOf('p');
		if (p > -1) {
			comment = parseInt(comment_str.substring(8, p-1));
			para = parseInt(comment_str.substring(p+1));
		} else {
			comment = parseInt(comment_str.substring(8));
			para = null;
		}
		
		
		$.ajax({ 
		    type: 'GET', 
		    url: '/get_comments?comment=' + comment,
		    dataType: 'json',
		    success: function (data) { 
		    	
		    	children = data.children;
		    	
		    	text = '<div class="insert_comment" id="' + comment_str + '">';
		    	
		    	left = 0;
		    	
		    	if (children.length == 1 && children[0].parent_node) {
		    		text += '<a>Show more comments</a>';
		    	}
		    	
		    	while (children.length == 1 && children[0].parent_node) {
		    		left += 10;
		    		new_comment = '<div class="insert_comment" style="display: none; position: relative; left:' + left + 'px;" id="' + children[0].d_id + '">' + children[0].name + '</div>';
		    		text += new_comment;
		    		children = children[0].children;
		    	}
		    	
		    	if (children[0].summary != '') {
		    		new_comment = '<div class="raw_comment" style="position: relative; left:' + left + 'px;" id="' + children[0].d_id + '">' + children[0].summary + '</div>';
		    	} else {
		    		new_comment = '<div class="raw_comment" style="position: relative; left:' + left + 'px;" id="' + children[0].d_id + '">' + children[0].name + '</div>';
		    	}
		    	
				text += new_comment;
				text += '</div>';
		    	
				$(link).after(text);
		    }
		 });
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