

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
	      		$stickies = stickies.each(function(i, item) {
	        		var $thisSticky = $(this);
	        		if (i == 0) {
	        			$thisSticky.addClass("bright");
	        		}
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
					
					var prev_scroll_pos = $(document).scrollLeft();
					var scroll_pos = horizontal_scrolling($thisSticky.offset().left, $('#first_summary').css('left'), $thisSticky.height());

					if (scroll_pos > prev_scroll_pos) {
						stuck_list.push($thisSticky[0]);
					}
					if (scroll_pos < prev_scroll_pos) {
						var count = (prev_scroll_pos - scroll_pos)/50;
						stuck_list.splice(stuck_list.length - count, count);
					}

					$('.hint_text').width($thisSticky.width());				
					
					if ($('#node_' + did).children().eq(0).text() == '[+]') {
						flip_header(did);
					} else {
						add_to_header(did);
					}

		        	$thisSticky.addClass("fixed");
		        	
		        	$nextSticky = $stickies.eq(i + 1);
		        	
		        	$('.bright').removeClass('bright');
		        	
		        	$nextSticky.addClass("bright");
		        	
		        	//$('#first_summary').show();
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
	      			
	      			$('.bright').removeClass('bright');
	      			$thisSticky.addClass("bright");
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
						//$('#first_summary').show();
			      		
			      		remove_from_sticky($thisSticky[0]);
			      		$thisSticky.removeClass("fixed");
			      		
						$('.bright').removeClass('bright');
		        		$thisSticky.addClass("bright");
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



