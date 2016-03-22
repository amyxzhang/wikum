
function getParameterByName(name, url) {
    if (!url) url = window.location.href;
    name = name.replace(/[\[\]]/g, "\\$&");
    var regex = new RegExp("[?&]" + name + "(=([^&#]*)|&|#|$)"),
        results = regex.exec(url);
    if (!results) return null;
    if (!results[2]) return '';
    return decodeURIComponent(results[2].replace(/\+/g, " "));
}

function get_comment(comment_str, did) {
	link = event.target;
	
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
		    	
		    	count = 0;
		    	
		    	
		    	parent_text = '';
		    	while (children.length == 1 && children[0].parent_node) {
		    		if (children[0].d_id != did) {
		    			left += 10;
		    			new_comment = '<div class="insert_comment" style="display: none; position: relative; left:' + left + 'px;" id="' + children[0].d_id + '">' + children[0].name + '</div>';
		    			parent_text += new_comment;
		    			count += 1;
		    		}
		    		
		    		children = children[0].children;
		    		
		    	}
		    	
		    	if (count > 0) {
		    		if (count == 1) {
		    			text += '<a>Show ' + count + ' parent comment</a>';
		    		} else {
		    			text += '<a>Show ' + count + ' parent comments</a>';
		    		}
		    	}
		    	
		    	text += parent_text;
		    	
		    	new_comment = '<div class="raw_comment" style="left:' + left + 'px;" id="' + children[0].d_id + '">';
		    	
		    	if (para) {
		    		strs = children[0].name.split('</p><p>');
		    		console.log(strs[para]);
		    		
		    		
		    		new_comment += strs[para].replace(/<[\/]{0,1}(p|P)[^><]*>/g, "");
		    			
		    		new_comment += '<BR><a>See full comment</a>';
		    	} else {
		    		new_comment += children[0].name;
		    	}
		    	
		    	new_comment += '</div>';
		    	
				text += new_comment;
				
				text += '<a style="cursor: pointer;" onclick="$(\'#' + comment_str + '\').toggle();">Hide</a>';
		    	
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
	        	d_id = element.d_id;
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
						part = '<a onclick="get_comment(\'' + link + '\', ' + d_id + ');">' + part + '</a>';
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