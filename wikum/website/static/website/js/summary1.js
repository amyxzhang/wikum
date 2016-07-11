

function display_comments(discuss_info_list, level, total_summary_text, auto_hide) {
	
	for (var i=0; i< discuss_info_list.length; i++) {
		info = discuss_info_list[i];
		
		extra_text = info.extra_summary;
		d_id = info.d_id;
		
		var levelClass = level > 20? "level20" : `level${level}`;
		
		var summaryClass = info.replace_node? "summary_node" : "original_node";
		
		if (auto_hide) {
			if (info.replace_node) {
				summary_text = '<div style="display: none;" id="node_' + d_id +'" class="node ' + summaryClass + ' ' + levelClass + '">';
			} else {
				summary_text = '<div style="display: none;" id="node_' + d_id +'" class="node ' + summaryClass + ' ' + levelClass + ' collapsed">';
			}
		} else {
			summary_text = '<div id="node_' + d_id +'" class="node ' + summaryClass + ' ' + levelClass + '">';
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
var first_left = 0;

var viewportHeight = $(window).height();

function horizontal_scrolling(prev_scroll_pos, left, abs_left) {
	if (scroll_pos != NaN) {	
		var scroll_pos = parseInt(left) - parseInt(abs_left);
	    
	    $('html, body').animate({scrollLeft: scroll_pos}, 500);
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
	      		$stickies = stickies.each(function(i, item) {
	        		var $thisSticky = $(this);
	        		if (i == 0) {
						$('#width_setter').css('width', $(window).width() + $thisSticky.offset().left*2);
						first_left = $thisSticky.offset().left;
						$thisSticky.addClass("bright");
					}
	      		});
	      		$window.off("scroll.stickies").on("scroll.stickies", function() {
			  		_whenScrolling();		
	      		});
	    	}
	  	};

	  var _whenScrolling = function() {
	  	
	  	clearTimeout($.data(this, 'scrollTimer'));
	  	
	  	var prev_bright = $('.bright');

	    $stickies.each(function(i) {			
	      var $thisSticky = $(this);
	      
	      var offset = $thisSticky.offset();
		  var posY = offset.top - $(window).scrollTop();
	          
	      var did = $thisSticky.attr('id').substring(5);
	      
	      var half = viewportHeight/2.0;
	      var half_half = half/2.0;
	      
	      if (posY > half_half && posY < half+half_half) {
			if (!$thisSticky.hasClass("bright")) {
				if ($thisSticky.css('display') != 'none') {
		        	$thisSticky.addClass("bright");
		        }
			}
	      } else {
	      	if ($thisSticky.hasClass("bright")) {
	      		if ($thisSticky.css('display') != 'none') {
	        		$thisSticky.removeClass("bright");
		      	}
	      	}
	      }
	      
	    });
	    
	    if ($('.bright').length == 0) {
	    	prev_bright.addClass("bright");
	    }
	    
	    
	    $.data(this, 'scrollTimer', setTimeout(function() {
	        var total_left = 0;
	        var count_bright = 0;
	        $('.bright').each(function(i, item) {
	      		var $thisSticky = $(this);
	      		var offset = $thisSticky.offset().left;
			    total_left += offset;
			    count_bright += 1;
	        });
	        var avg_left = total_left/count_bright;
	        
			var prev_scroll_pos = $(document).scrollLeft();
			var scroll_pos = horizontal_scrolling(prev_scroll_pos, avg_left, first_left);
 
	    }, 150));

	  };
	
	  return {
	    load: load
	  };
	})();
	
	$(function() {
		stickyHeaders.load($(".node"));
 	});
}



