


function display_comments(discuss_info_list, level, total_summary_text, auto_hide) {
	
	for (var i=0; i< discuss_info_list.length; i++) {
		info = discuss_info_list[i];
		
		extra_text = info.extra_summary;
		d_id = info.d_id;
		
		var levelClass = level > 2? "level3" : `level${level}`;
		
		var summaryClass = info.replace_node? "summary_node" : "original_node";
		
		if (auto_hide) {
			if (info.replace_node) {
				summary_text = '<div style="display: none;" id="node_' + d_id +'" class="' + summaryClass + ' ' + levelClass + '">';
			} else {
				summary_text = '<div style="display: none;" id="node_' + d_id +'" class="' + summaryClass + ' ' + levelClass + ' collapsed">';
			}
		} else {
			summary_text = '<div id="node_' + d_id +'" class="' + summaryClass + ' ' + levelClass + '">';
		}
		
		summary_text += display_comment(info, d_id);
		
		summary_text += '</div>';
		
		total_summary_text += summary_text;
		
		if (!info.replace_node) {
			total_summary_text = display_comments(info.children, level+1, total_summary_text, auto_hide || false)
		} else {
			total_summary_text = display_comments(info.replace, level+1, total_summary_text, true)
		}
		
	}
	
	return total_summary_text;
}

$(document).ready(function () {
	
	var article_url = getParameterByName('article');
	var next = parseInt(getParameterByName('next'));
	if (!next) {
		next = 0;
	}
	var num = parseInt(getParameterByName('num'));
	if (!num) {
		num = 0;
	}
	
	$.ajax({ 
	    type: 'GET', 
	    url: '/summary_data?article=' + article_url + '&next=' + next + '&num=' + num, 
	    dataType: 'json',
	    success: function (data) { 
	    	
	    	unpack_posts(data.posts.children);

			summary_text = display_comments(data.posts.children, 0, '');
			
        	$('#summary').html(summary_text);
        	
        	if (data.posts.children.length < 5) {
        		$('#link_next').html('<BR><P>End of discussion</P>');
        	} else {
        		$('#link_next').html('<BR><P><a style="font-size: 16px;" href="/summary?article=' + article_url + '&next=' + (next+1) + '">See Next Page of Discussions &gt;&gt;</a></P>');
			}
	    }
	    
	    
	});
	
	
});