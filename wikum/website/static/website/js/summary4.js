


function display_comments(discuss_info_list, level, total_summary_text, auto_hide) {
	
	for (var i=0; i< discuss_info_list.length; i++) {
		info = discuss_info_list[i];
		
		extra_text = info.extra_summary;
		d_id = info.d_id;
		
		var levelClass = level > 1? "level2" : `level${level}`;
		
		var summaryClass = info.replace_node? "summary_node" : "original_node";
		
		if (auto_hide) {
			if (info.replace_node) {
				summary_text = '<div class="node ' + levelClass + '"><div style="display: none;" id="node_' + d_id +'" class="' + summaryClass + '">';
			} else {
				summary_text = '<div class="node ' + levelClass + '"><div style="display: none;" id="node_' + d_id +'" class="' + summaryClass + ' collapsed">';
			}
		} else {
			summary_text = '<div class="node ' + levelClass + '">';
			if (levelClass == "level2") {
				summary_text += '<div class="arrow" id="arrow_' + d_id + '"><img class="arrow_img" src="/static/website/img/arrow-left.png" width=35 height=40></div>';
			} else {
				summary_text += '<div class="arrow" id="arrow_' + d_id + '"><img class="arrow_img" style="display: none;" src="/static/website/img/arrow-left.png" width=35 height=40></div>';
			}
			
			summary_text += '<div id="node_' + d_id +'" class="' + summaryClass + '">';
			
		}
		
		summary_text += display_comment(info, d_id);
		
		summary_text += '</div></div>';
		
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
	article_url = article_url.replace('#','%23');
	var next = parseInt(getParameterByName('next'));
	if (!next) {
		next = 0;
	}
	var num = parseInt(getParameterByName('num'));
	if (!num) {
		num = 0;
	}
	var owner = getParameterByName('owner');
	
	$.ajax({ 
	    type: 'GET', 
	    url: '/summary_data?article=' + article_url + '&next=' + next + '&num=' + num + '&owner=' + owner, 
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
			
			click_arrows();	
	    } 
	});
});

function click_arrows() {
	$('.arrow').click(function(evt) {
		var id = $(evt.target.parentNode).attr('id').substring(6);
		$('#node_' + id).parent().removeClass('level2');
		$('#node_' + id).parent().addClass('level1');
		
		$('#node_' + id).prev().first().toggle();
		
		var parent_id = discuss_dict[id].parent;
		var curr_id = id;
		while (parent_id != null) {
			$('#node_' + parent_id).parent().removeClass('level1');
			$('#node_' + parent_id).parent().removeClass('level2');
			
			$('#node_' + parent_id).prev().first().toggle();

			for (var i=0; i<discuss_dict[parent_id].children.length; i++) {
				var child_id = discuss_dict[parent_id].children[i].d_id;
				if (child_id == curr_id) {
					break;
				}
				collapse_text(child_id);
				$('#node_' + child_id).prev().first().toggle();
				$('#node_' + child_id).removeClass('level1');
				$('#node_' + child_id).removeClass('level2');
			}
			curr_id = parent_id;
			parent_id = discuss_dict[parent_id].parent;
			
		}
		
		
		for (var i=0; i<discuss_dict[id].children.length; i++) {
			var child_id = discuss_dict[id].children[i].d_id;
			$('#node_' + child_id).parent().addClass('level2');
		}
		

	})
}
