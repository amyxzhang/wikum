
var discuss_dict = {};

function getParameterByName(name, url) {
    if (!url) url = window.location.href;
    name = name.replace(/[\[\]]/g, "\\$&");
    var regex = new RegExp("[?&]" + name + "(=([^&#]*)|&|#|$)"),
        results = regex.exec(url);
    if (!results) return null;
    if (!results[2]) return '';
    return decodeURIComponent(results[2].replace(/\+/g, " "));
}

function strip_html(text) {
	var str = text.replace(/<(?:.|\n)*?>/gm, ' ');
	return str;
}

function show_hidden_before() {
	$(event.target).prev().toggle();
}

function show_hidden_after() {
	$(event.target).next().toggle();
}

function expand_summary(d_id) {
	expand_info = discuss_dict[d_id];
	$('#node_' + d_id).children().first().remove();
	text = '<a style="float: right;" onclick="collapse_summary(' + d_id + ');">[-]</a>';
	
	$('#node_' + d_id).prepend(text);
	
	if (expand_info.replace) {
		for (var i=0; i<expand_info.replace.length; i++) {
			show_node(expand_info.replace[i]);
		}
	}
}

function collapse_summary(d_id) {
	info = discuss_dict[d_id];
	
	expand_info = discuss_dict[d_id];
	$('#node_' + d_id).children().first().remove();
	text = '<a style="float: right;" onclick="expand_summary(' + d_id + ');">[+]</a>';
	
	$('#node_' + d_id).prepend(text);
	
	if (info.replace) {
		for (var i=0; i<info.replace.length; i++) {
			hide_node(info.replace[i]);
		}
	}
	
}

function get_comment(comment_str, did) {
	
	comment_strs = comment_str.split(/\]\] \[\[/g);
	link = event.target;

	if ($(link).next().is('#' + comment_strs[0])) {
		next_com = $(link).next();
		for (var i=0; i<comment_strs.length; i++) {
			next_com.toggle();
			next_com = next_com.next();	
		}
		if (!($(link).next().is(":visible"))) {
			$(event.target).css({'background-color': ''});
		} else {
			$(event.target).css({'background-color': '#ffdb99'});
		}
	} else {
		$(event.target).css({'background-color': '#ffdb99'});
		
		paras = [];
		comments = '';
		
		for (var i=0; i<comment_strs.length; i++) {
			p = comment_strs[i].indexOf('p');
			if (p > -1) {
				comment = parseInt(comment_strs[i].substring(8, p-1));
				comments += comment + ',';
				paras.push(parseInt(comment_strs[i].substring(p+1)));
			} else {
				comment = parseInt(comment_strs[i].substring(8));
				comments += comment + ',';
				paras.push(-1);
			}
		}
		
		comments_list = comments.substring(0,comments.length-1).split(',');
		
		data = [];
		for (var i=0; i<comments_list.length; i++) {
			data.push(discuss_dict[comments_list[i]]);
		}

    	var total_text = '';
    	
    	length = data.length;
    	
    	for (var j=0; j<length; j++) {
    		text = '';
    		node = data[j];
    		if (j < length -1) {
    			text += '<div style="margin-bottom: 20px;" class="insert_comment" id="' + comment_strs[j] + '">';
			} else {
	    		text += '<div class="insert_comment" id="' + comment_strs[j] + '">';
	    	}
	    	left = 10;
	    	count = 0;
	    	new_comment = '';
	    	
	    	if (node.replace_node) {
	    		new_comment = '<div class="summary_comment" style="left:' + left + 'px;" id="' + node.d_id + '">';
	    	} else {
	    		new_comment = '<div class="raw_comment" style="left:' + left + 'px;" id="' + node.d_id + '">';
	    	}
	    	
	    	if (paras[j] > -1) {
	    		strs = [];
	    		
	    		if (node.replace_node) {
	    			if (node.extra_summary != '') {
	    				t = node.summary + '\n\n' + node.extra_summary;
	    				strs = t.split('\n\n');
	    			} else {
	    				strs = node.summary.split('\n\n');
	    			}
	    		} else {
	    			objs = node.name.replace(/(\r\n|\n|\r)/gm,"");
	    			objs = $.parseHTML('<div>' + objs + '</div>');
	    			objs = $(objs).find('p');
	    			for (var i=0; i<objs.length; i++) {
	    				if (objs[i].parentNode.tagName == "LI") {
	    					strs.push('<li>' + objs[i].innerHTML + '</li>');
	    				} else {
	    					strs.push(objs[i].innerHTML);
	    				}
	    			}
	    		}
	    		
	    		if (paras[j] > 0) {
	    			new_comment += '<div style="display: none;" id="hidden_comment_before_' + node.d_id + '_' + paras[j] + '">';
	    			for (var i=0; i<paras[j]; i++) {
	    				new_comment = split_text(strs[i], new_comment, node.d_id);
	    				if (i < paras[j]-1) {
	    					new_comment += '<BR><BR>';
	    				}
	    			}
	    			new_comment += '</div>';
	    			if (paras[j] == 1) {
	    				new_comment += '<a class="see_full_comment btn-xs" onclick="show_hidden_before()">. . . ( ' +paras[j]+ ' para before )</a><BR>';
	    			} else {
	    				new_comment += '<a class="see_full_comment btn-xs" onclick="show_hidden_before()">. . . ( ' +paras[j]+ ' paras before )</a><BR>';
	    			}
	    		}
	    		
	    		t = strs[paras[j]].replace(/<[\/]{0,1}(p|P)[^><]*>/g, "");
	    		new_comment = split_text(t, new_comment, node.d_id);
	    	
	    		if (paras[j] < strs.length -1) {
	    			if ((strs.length-paras[j]-1) == 1) {
	    				new_comment += '<BR><a class="see_full_comment btn-xs" onclick="show_hidden_after()">. . . ( ' +(strs.length-paras[j]-1)+ ' para after )</a>';
	    			} else {
	    				new_comment += '<BR><a class="see_full_comment btn-xs" onclick="show_hidden_after()">. . . ( ' +(strs.length-paras[j]-1)+ ' paras after )</a>';
	    			}
	    			
	    			new_comment += '<div style="display: none;" id="hidden_comment_after_' + node.d_id + '_' + paras[j] + '">';
	    			for (var i=paras[j]+1; i<strs.length; i++) {
	    				new_comment = split_text(strs[i], new_comment, node.d_id);
	    				if (i < strs.length-1) {
	    					new_comment += '<BR><BR>';
	    				}
	    				
	    			}
	    			new_comment += '</div>';
	    			
	    		}
	    		
	    	} else {
	    		if (node.replace_node) {
	    			if (node.extra_summary != '') {
	    				t = node.summary + '\n<BR><a>...</a><BR>\n' + node.extra_summary;
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
			
			if (j == length -1) {
				text += '<a class="see_full_comment btn-xs" onclick="toggle_hide(' + length + ');">Hide</a>';
	    	}
	    	
			text += '</div>';
	    	
			total_text += text;
		}
		
		$(link).after(total_text);

	}
}

function toggle_hide(comments) {
	pointer = $(event.target).parent();
	
	for (var i=0; i<comments; i++) {
		pointer.toggle();
		pointer = pointer.prev();
	}
	
	pointer.css({'background-color': ''});
	
}

function split_text(text, summary_text, d_id) {
	var splitted = text.split("\n");
	
	hidden_para_num = text.split("<BR><a>...</a><BR>");
	if (hidden_para_num.length > 1) {
		hidden_para_num = hidden_para_num[1].split('\n\n').length;
	} else {
		hidden_para_num = 0;
	}
	        	
	var hidden = false;
	for (var i=0; i<splitted.length; i++) {
		part = splitted[i];
		
		if (part == '<BR><a>...</a><BR>') {
			if (hidden_para_num == 1) {
				summary_text += '</P><a class="see_full_comment btn-xs" onclick="show_div();">. . . ( ' + hidden_para_num + ' summary point below the fold )</a>';
			} else {
				summary_text += '</P><a class="see_full_comment btn-xs" onclick="show_div();">. . . ( ' + hidden_para_num + ' summary points below the fold )</a>';
			}
			summary_text += '<div id="hidden_' + d_id + '" class="hidden_node" style="display: none; margin-top: 15px;"><P>';
			hidden = true;
		} else {
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
	}
	if (hidden) {
		summary_text += '</div>';
	}
	return summary_text;
}

function show_div() {
	$(event.target).next().toggle();
}

function unpack_posts(posts) {
	for (var i=0; i<posts.length; i++) {
		post = posts[i];
		discuss_dict[post.d_id] = post;
		
		if (post.children) {
			unpack_posts(post.children);
		}
		if (post.hid) {
			unpack_posts(post.hid);
		}
		if (post.replace) {
			unpack_posts(post.replace);
		}
	}
}

function uncollapse_text(d_id) {
	info = discuss_dict[d_id];
	summary_text = display_comment(info, d_id);
	$('#node_' + d_id).html(summary_text);
	if (info.children) {
		for (var i=0; i<info.children.length; i++) {
			show_node(info.children[i]);
		}
	}
}

function collapse_text(d_id) {
	info = discuss_dict[d_id];
	text = '<a style="float: right" onclick="uncollapse_text(' + d_id + ');">[+]</a>';
	text += generate_header(d_id, info, "collapse");
	
	$('#node_' + d_id).html(text);
	
	if (info.children) {
		for (var i=0; i<info.children.length; i++) {
			hide_node(info.children[i]);
		}
	}	
}

function collapse_to_header(d_id) {
	info = discuss_dict[d_id];
	text = '<a style="float: right" onclick="uncollapse_text(' + d_id + ');">[+]</a>';
	text += generate_header(d_id, info, "collapse");
	
	$('#node_' + d_id).html(text);
}

function expand_from_header(d_id) {
	info = discuss_dict[d_id];
	summary_text = display_comment(info, d_id);
	$('#node_' + d_id).html(summary_text);
}

function show_node(node_info) {
	$('#node_' + node_info.d_id).show();
	if (node_info.children) {
		for (var i=0; i<node_info.children.length; i++) {
			show_node(node_info.children[i]);
		}
	}
}

function hide_node(node_info) {
	$('#node_' + node_info.d_id).hide();
	if (node_info.children) {
		for (var i=0; i<node_info.children.length; i++) {
			hide_node(node_info.children[i]);
		}
	}
}

function generate_header(d_id, info, action) {
	ttext = '';

	ttext += `<strong><span title="ID: ${info.d_id}">${info.size} `;

	if (info.size == 1) {
		ttext += `like`;
	} else {
		ttext += `likes`;
	}
	
	ttext += ` | ${info.children.length} `;

	if (info.size == 1) {
		ttext += `reply`;
	} else {
		ttext += `replies`;
	}
	
	ttext += ' | ';
		
	highlight_authors = $('#highlight_authors').text().split(',');

	if (highlight_authors.indexOf(info.author) > -1) {
		ttext  += `<span style="background-color: pink;">${info.author}</span>`;
	} else {
		ttext += `${info.author}`;
	}

	ttext += `</span></strong>`;
	if (action == "collapse") {
		ttext += ' <div class="hint_text">' + strip_html(info.name).substring(0,200-info.author.length) + '</div>';
	}
	return ttext;
}

function display_comment(info, d_id) {
	
	summary_text = '';
	if (info.replace_node) {
		summary_text += '<a style="float: right;" onclick="expand_summary(' + d_id + ');">[+]</a>';
		summary_text += '<B>Summary:</B><BR>';
	} else {
		summary_text += '<a style="float: right;" onclick="collapse_text(' + d_id + ');">[-]</a>';
		summary_text += generate_header(d_id, info, "show");
	}
	
	summary_text += '<P>';
	
	if (info.replace_node) {
		text = info.summary;
	} else {
		text = info.name;
	}

	if (extra_text != '') {
		text += '\n<BR><a>...</a><BR>\n';
		text += extra_text;
	}
	
	summary_text = split_text(text, summary_text, d_id);

	summary_text += '</P>';

	return summary_text;
}

function display_comments(discuss_info_list, level, total_summary_text, auto_hide) {
	
	for (var i=0; i< discuss_info_list.length; i++) {
		info = discuss_info_list[i];
		
		extra_text = info.extra_summary;
		d_id = info.d_id;
		
		var levelClass = level > 9? "level10" : `level${level}`;
		
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
			
			load_sticky();
	    }
	    
	    
	});
	
});

var stuck_list = []; 

function horizontal_scrolling(left, abs_left, height) {
	var curPos = $(document).scrollLeft();
	var scroll_pos = parseInt(left) - parseInt(abs_left);
	
	if (scroll_pos != NaN) {
	    	$('html, body').animate({scrollLeft: scroll_pos}, 100);
	}
	return scroll_pos;
}

function remove_from_sticky(item) {
	$.each(stuck_list, function(i){
	    if(stuck_list[i] === item) {
	        stuck_list.splice(i,1);
	        return false;
	    }
	});
}

function add_to_header(d_id) {
	info = discuss_dict[d_id];
	text = '<a style="float: right" onclick="collapse_text(' + d_id + '); flip_header(' + d_id + ');">[-]</a>';
	text += generate_header(d_id, info, "collapse");
	$('#first_summary').html(text);
}

function flip_header(d_id) {
	info = discuss_dict[d_id];
	text = '<a style="float: right" onclick="uncollapse_text(' + d_id + '); add_to_header(' + d_id + ');">[+]</a>';
	text += generate_header(d_id, info, "collapse");
	$('#first_summary').html(text);
}

function load_sticky() {
	var stickyHeaders = (function() {
		var $window = $(window),
	    	$stickies;
	    		      
	  	var load = function(stickies) {
	    	if (typeof stickies === "object" && stickies instanceof jQuery && stickies.length > 0) {
	      		$stickies = stickies.each(function() {
	        		var $thisSticky = $(this);
	      			});
	      		$window.off("scroll.stickies").on("scroll.stickies", function() {
			  		_whenScrolling();		
	      		});
	    	}
	  	};

	  var _whenScrolling = function() {
	    $stickies.each(function(i) {			
	      var $thisSticky = $(this),
	      	  $stickyPosition = $thisSticky.offset().top;
	          
	      var did = $thisSticky.attr('id').substring(5);
	      
	      if ($stickyPosition <= $window.scrollTop() + 60) {
			if (!$thisSticky.hasClass("fixed")) {
				if ($thisSticky.css('display') != 'none') {
					
					$('#first_summary').width($thisSticky.width());
					if (i == 0) {
						$('#first_summary').css('left', $thisSticky.offset().left);
						$('#width_setter').css('width', $(window).width() + $thisSticky.offset().left*2);
					}
					
					var scroll_pos = horizontal_scrolling($thisSticky.offset().left, $('#first_summary').css('left'), $thisSticky.height());

					if (scroll_pos > 0) {
						stuck_list.push($thisSticky);
					}

					$('.hint_text').width($thisSticky.width());				
					
					if ($('#node_' + did).children().eq(0).text() == '[+]') {
						flip_header(did);
					} else {
						add_to_header(did);
					}

		        	$thisSticky.addClass("fixed");
		        	$('#first_summary').show();
		        }
			}

	        
	        // if ($thisSticky.hasClass("fixed") && !$thisSticky.hasClass("absolute")) {
		        // var $nextSticky = $stickies.eq(i + 1),
	            // $nextStickyPosition = $nextSticky.data('originalPosition') - 50;
	            // if ($nextSticky.length > 0 && $thisSticky.offset().top >= $nextStickyPosition) {
		          // $thisSticky.addClass("absolute").css("top", $nextStickyPosition - 250);
		      	// }
		    // }

	      } else {
	      	if ($thisSticky.hasClass("fixed")) {
	      		if (i == 0) {
	      			$('#first_summary').hide();
	      			$thisSticky.removeClass("fixed");
	      		} else {
	      			
	      			$prevSticky = $stickies.eq(i - 1);
		      		
		      		if ($prevSticky.css('display') != 'none') {
	      			
	      				var scroll_pos = horizontal_scrolling($prevSticky.offset().left, $('#first_summary').css('left'), $prevSticky.height());
	      			
		      		
			      		var prev_did = $prevSticky.attr('id').substring(5);
			      		
			      		if ($('#node_' + prev_did).children().eq(0).text() == '[+]') {
							flip_header(prev_did);
						} else {
							add_to_header(prev_did);
						}
			      		
			      		$('#first_summary').width($prevSticky.width());
						$('#first_summary').show();
			      		
			      		remove_from_sticky($thisSticky);
			      		$thisSticky.removeClass("fixed");
			      	}
	      		}
	      	}
	 
	        
	        
	       	// var $prevSticky = $stickies.eq(i - 1);
	        // if ($prevSticky.length > 0 && $window.scrollTop() <= $thisSticky.data('originalPosition') - $thisSticky.data('originalHeight')) {
	          // $prevSticky.removeClass("absolute").removeAttr("style");
	        // }
	       	
	      }
	    });
	  };
	
	  return {
	    load: load
	  };
	})();
	
	$(function() {
		stickyHeaders.load($(".original_node"));
 	});
}



