
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
		    url: '/get_comments?comment=' + comment + '&curr_comment=' + did,
		    dataType: 'json',
		    success: function (data) { 
		    	node = data;
		    	text = '<div class="insert_comment" id="' + comment_str + '">';
		    	left = 0;
		    	count = 0;
		    	parent_text = '';
		    	while (node.parent_node) {
		    		if (node.d_id != did) {
		    			left += 10;
		    			new_comment = '<div class="insert_comment" style="display: none; position: relative; left:' + left + 'px;" id="' + node.d_id + '">' + node.name + '</div>';
		    			parent_text += new_comment;
		    			count += 1;
		    		}
		    		
		    		node = node.children[0];
		    	}
		    	
		    	if (count > 0) {
		    		if (count == 1) {
		    			text += '<a>Show ' + count + ' parent comment</a>';
		    		} else {
		    			text += '<a>Show ' + count + ' parent comments</a>';
		    		}
		    	}
		    	
		    	text += parent_text;
		    	
		    	if (node.replace_node) {
		    		new_comment = '<div class="summary_comment" style="left:' + left + 'px;" id="' + node.d_id + '">';
		    	} else {
		    		new_comment = '<div class="raw_comment" style="left:' + left + 'px;" id="' + node.d_id + '">';
		    	}
		    	
		    	if (para != null) {
		    		if (node.replace_node) {
		    			if (node.extra_summary != '') {
		    				t = node.summary + '\n\n' + node.extra_summary;
		    				strs = t.split('\n\n');
		    			} else {
		    				strs = node.summary.split('\n\n');
		    			}
		    		} else {
		    			strs = node.name.split('</p><p>');
		    		}
		    		
		    		t = strs[para].replace(/<[\/]{0,1}(p|P)[^><]*>/g, "");
		    		new_comment = split_text(t, new_comment, node.d_id);
		    	
		    		
		    		new_comment += '<BR><a class="see_full_comment">See full comment</a>';
		    	} else {
		    		if (node.replace_node) {
		    			if (node.extra_summary != '') {
		    				t = node.summary + '<BR><a>...</a><BR>' + node.extra_summary;
		    				new_comment = split_text(t, new_comment, node.d_id);
		    			} else {
		    				new_comment = split_text(node.summary, new_comment, node.d_id);
		    			}
		    		} else {
		    			new_comment += node.name;
		    		}
		    		
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

function split_text(text, summary_text, d_id) {
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
			summary_text += part;
		} else {
			if (part == '') {
				summary_text += '</P><P>';
			} else {
				summary_text += part + ' ';
			}
		}
	}
	return summary_text;
}

function show_div(d_id) {
	$('#hidden_' + d_id).toggle();
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
	        	extra_text = element.extra_text;
	        	d_id = element.d_id;
	        	
	        	summary_text = '<P>';
	        	
	        	summary_text = split_text(text, summary_text, d_id);
	        	
	        	if (extra_text != '') {
	        		summary_text += '</P><a onclick="show_div(' + d_id + ');">...</a>';
	        		summary_text += '<div style="display: none;" id="hidden_' + d_id + '"><P>';
	        		summary_text = split_text(extra_text, summary_text, d_id);
	        		summary_text += '</P></div>';
	        	} else {
	        		summary_text += '</P>';
	        	}
	        	
	        	$('#summary').html(summary_text);
	        	
	        });
	    }
	    
	    
	});
	
	
});