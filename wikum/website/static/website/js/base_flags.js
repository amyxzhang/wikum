activeBox = null;

delete_summary_nodes = [];
delete_summary_node_ids = [];

current_summarize_d_id = [];

var article_url = $('#article_url').text();
var owner = getParameterByName('owner');
var unique_user_id = Math.floor(Math.random() * 1000000000);
var article_id = $('#article_id').text();
var lastClicked = null;
var isSortable = true;
var read_list = [];
var subscribe_edit_comments = [];
var subscribe_replies_comments = [];

$(function () {
	$('[data-toggle="tooltip"]').tooltip()
});

var idleTime = 0;
var dids_in_use = [];
$(document).ready(function () {
    //Increment the idle time counter every minute.
    var idleInterval = setInterval(timerIncrement, 60000); // 1 minute

    //Zero the idle timer on mouse movement.
    $(this).mousemove(function (e) {
        idleTime = 0;
    });
    $(this).keypress(function (e) {
        idleTime = 0;
    });
});

function timerIncrement() {
    idleTime = idleTime + 1;
    if (idleTime > 14) { // 15 minutes
    	send_update_locks(dids_in_use, false);
    }
}

function isElementInViewport(el) {
    // Special bonus for those using jQuery
    if (typeof jQuery === "function" && el instanceof jQuery) {
        el = el[0];
    }
    var rect = el.getBoundingClientRect();
    return (
        rect.top >= 0 &&
        rect.left >= 0 &&
        rect.bottom <= (window.innerHeight || document.documentElement.clientHeight) && /* or $(window).height() */
        rect.right <= (window.innerWidth || document.documentElement.clientWidth) /* or $(window).width() */
    );
}

function getCommentsInViewport() {
	var comments = $('.comment_box').filter(function() {
	    return isElementInViewport(this);
	});
	return comments.map(function() {
		return $(this).data('did');
	}).get();
}

var old_visible;
var readDelay=5000, setReadConst;
function onVisibilityChange() {
	clearTimeout(setReadConst);
	setReadConst = setTimeout(function() {
		var visible = getCommentsInViewport();
	    if (visible != old_visible) {
	        old_visible = visible;
	        mark_comments_read(visible);
	    }
	}, readDelay);
}

function mark_comments_read(dids) {
	var csrf = $('#csrf').text();
	var logged_in = $("#owner").length > 0;
	var dids_send = [];
	if (read_list.length == 0) {
		dids_send = dids;
	} else {
		for (const did of dids) {
			var unread = $('#outline-text-' + did).hasClass('comment-unread');
			if (unread && read_list) dids_send.push(did);
			$('#outline-text-' + did).removeClass('comment-unread');
		}
	}
	var dids_strings = dids_send.map(did => did.toString());
	read_list = read_list.concat(dids_strings);
	var data = {csrfmiddlewaretoken: csrf,
				ids: dids_send};
	if (logged_in && dids_send.length > 0) {
		$.ajax({
			type: 'POST',
			url: '/mark_comments_read',
			data: data,
			success: function(res) {}
		});
	}
}

$(window).on('DOMContentLoaded load resize scroll', onVisibilityChange);
$('#box').on('scroll', onVisibilityChange);

function highlight_sents() {
	d_ids = current_summarize_d_id;
	var csrf = $('#csrf').text();
	var data = {csrfmiddlewaretoken: csrf,
				d_ids: d_ids};

	$.ajax({
		type: 'POST',
		url: '/auto_summarize_comment',
		data: data,
		success: function(res) {
			for (var i=0; i<res.sents.length; i++) {
				if (res.sents[i].length > 8) {
					if (d_ids.length == 1) {
						$('#summarize_comment_box').highlight(res.sents[i]);
					} else {
						$('#summarize_multiple_comment_box').highlight(res.sents[i]);
					}
				}
			}
		}
	});

}

function unhighlight_sents() {
	$('#summarize_comment_box').unhighlight();
	$('#summarize_multiple_comment_box').unhighlight();
}

function check_button_checkbox() {
    $('.button-checkbox').each(function () {

        // Settings
        var $widget = $(this),
            $button = $widget.find('button'),
            $checkbox = $widget.find('input:checkbox'),
            color = $button.data('color'),
            settings = {
                on: {
                    icon: 'glyphicon glyphicon-check'
                },
                off: {
                    icon: 'glyphicon glyphicon-unchecked'
                }
            };

        // Event Handlers
        $button.on('click', function () {
            $checkbox.prop('checked', !$checkbox.is(':checked'));
            $checkbox.triggerHandler('change');
            updateDisplay();

        });
        $checkbox.on('change', function () {
            updateDisplay();
        });

        // Actions
        function updateDisplay() {
            var isChecked = $checkbox.is(':checked');

            if (isChecked) {
            	highlight_sents();
            } else {
            	unhighlight_sents();
            }

            localStorage.setItem('highlight_check', isChecked);

            // Set the button's state
            $button.data('state', (isChecked) ? "on" : "off");

            // Set the button's icon
            $button.find('.state-icon')
                .removeClass()
                .addClass('state-icon ' + settings[$button.data('state')].icon);

            // Update the button's color
            if (isChecked) {
                $button
                    .removeClass('btn-highlight')
                    .addClass('btn-' + color + ' active');
            }
            else {
                $button
                    .removeClass('btn-' + color + ' active')
                    .addClass('btn-highlight');
            }
        }

        // Initialization
        function init() {

            updateDisplay();

            // Inject the icon if applicable
            if ($button.find('.state-icon').length == 0) {
                $button.prepend('<i class="state-icon ' + settings[$button.data('state')].icon + '"></i> ');
            }
        }
        init();
    });
};

function make_key() {

  // var key_data = [
 	// { "cx": 450, "cy": 80, "r": 7, "color" : "#885ead", "text": "summary"},
 	// ];
//
  // var svg = d3.select("svg");
//
  // var circles = svg.selectAll(".dataCircle")
                           // .data(key_data)
                           // .enter()
                           // .append("circle");
//
  // var circleAttributes = circles
                       // .attr("cx", function (d) { return d.cx; })
                       // .attr("cy", function (d) { return d.cy; })
                       // .attr("r", function (d) { return d.r; })
                       // .style("fill", function (d) { return d.color; });
//
  // var text = svg.selectAll("text")
                        // .data(key_data)
                        // .enter()
                        // .append("text");
//
  // var textLabels = text
                 // .attr("x", function(d) { return d.cx + 10; })
                 // .attr("y", function(d) { return d.cy + 4; })
                 // .text( function (d) { return d.text; })
                 // .attr("font-family", "sans-serif")
                 // .attr("font-size", "10px")
                 // .style('cursor', "default")
                 // .attr("fill", "black");
}

$("#hide_modal_box").draggable({
    handle: ".modal-title"
});

$("#reply_modal_box").draggable({
    handle: ".modal-title"
});

$("#new_node_modal_box").draggable({
    handle: ".modal-title"
});

$("#summarize_modal_box").draggable({
    handle: ".modal-title"
});

$("#summarize_multiple_modal_box").draggable({
    handle: ".modal-title"
});

$("#tag_modal_box").draggable({
    handle: ".modal-title"
});

$("#evaluate_summary_modal_box").draggable({
    handle: ".modal-title"
});

$("#permission_modal_box").draggable({
    handle: ".modal-title"
});

$("#confirm_delete_modal_box").draggable({
    handle: ".modal-title"
});


$('#evaluate_summary_modal_box').on('hidden.bs.modal', function () {
				$.ajax({type: 'GET',
						url: '/log_data?data=close_evaluate_summary_modal',
						success: function(res) {
						}
				});
});


$('#tag_modal_box').on('hidden.bs.modal', function () {
				$.ajax({type: 'GET',
						url: '/log_data?data=close_tag_modal',
						success: function(res) {
						}
				});
});

$('#reply_modal_box').on('hidden.bs.modal', function () {
	$('#reply_comment_box').attr('style', '');
	$('#reply_comment_box').text('');
				$.ajax({type: 'GET',
						url: '/log_data?data=close_reply_modal',
						success: function(res) {
						}
				});
});

$('#new_node_modal_box').on('hidden.bs.modal', function () {
				$.ajax({type: 'GET',
						url: '/log_data?data=close_new_node_modal',
						success: function(res) {
						}
				});
});

$('#hide_modal_box').on('hidden.bs.modal', function () {
    var cnt = $(".ui-resizable").contents();
	$(".ui-resizable").replaceWith(cnt);
	$(".ui-resizable-handle").remove();
	$('#hide_comment_box').attr('style', '');
	$('#hide_comment_box').text('');
	
				$.ajax({type: 'GET',
						url: '/log_data?data=close_hide_comment_modal',
						success: function(res) {
						}
				});
});

$('#summarize_modal_box').on('hide.bs.modal', function (e) {
	var id = $('#summarize_modal_box').attr('summarize_modal_box_id');
	var did = $('#summarize_modal_box').attr('summarize_modal_box_did');
	dids_in_use = [];
	send_update_locks([parseInt(did)], false);
});

$('#summarize_modal_box').on('hidden.bs.modal', function (e) {
    var cnt = $(".ui-resizable").contents();
	$(".ui-resizable").replaceWith(cnt);
	$(".ui-resizable-handle").remove();
	$('#summarize_comment_box').attr('style', '');
	$('#summarize_comment_box').text('');
	current_summarize_d_id = [];
	unhighlight_sents();
	
				$.ajax({type: 'GET',
						url: '/log_data?data=close_summarize_one_modal',
						success: function(res) {
						}
				});
});

$('#summarize_multiple_modal_box').on('hide.bs.modal', function (e) {
	var str_ids = $('#summarize_multiple_modal_box').attr('summarize_multiple_modal_box_ids').split(",");
	var ids = str_ids.map(str_id => parseInt(str_id));
	var str_dids = $('#summarize_multiple_modal_box').attr('summarize_multiple_modal_box_dids').split(",");
	var dids = str_dids.map(str_did => parseInt(str_did));
	dids_in_use = [];
	send_update_locks(dids, false);
});

$('#summarize_multiple_modal_box').on('hidden.bs.modal', function () {
	 var cnt = $(".ui-resizable").contents();
	$(".ui-resizable").replaceWith(cnt);
	$(".ui-resizable-handle").remove();
	$('#summarize_multiple_comment_box').attr('style','');
	$('#summarize_multiple_comment_box').text('');
	delete_summary_nodes = [];
	delete_summary_node_ids = [];
	current_summarize_d_id = [];
	unhighlight_sents();
	
				$.ajax({type: 'GET',
						url: '/log_data?data=close_summarize_multiple_modal',
						success: function(res) {
						}
				});
});




function luminance(color) {
	// Formula: http://www.w3.org/TR/2008/REC-WCAG20-20081211/#relativeluminancedef
	var rgb = color.match(/.{2}/g).map(function(c){
		c = parseInt(c, 16);
		c /= 255;
		return c < .03928 ? c / 12.92 : Math.pow((c + .055) / 1.055, 2.4);
	});

	var luminance = .2126 * rgb[0] + .7152 * rgb[1] + 0.0722 * rgb[2];

	return luminance * 100;
}

function is_dark(color) {
	return luminance(color) < 50;
}

// $('#permission_modal_box').on('show.bs.modal', function(e) {
// 	if ($("#global-perm-dropdown").text().trim() != "Publicly Editable or Commentable") {
// 		$('.public-edit-perms').hide();
// 	}
// });

var ws_scheme = window.location.protocol == "https:" ? "wss" : "ws";
// TODO: change WebSocket to ReconnectingWebSocket
var chatsock = new ReconnectingWebSocket(ws_scheme + '://' + window.location.host + "/ws/article/" + $('#article_id').text() + window.location.pathname);

$('#new_node_modal_box').on('show.bs.modal', function(e) {
	$("#new_node_textarea").val("");
	$.ajax({
        url: "/users",
        type: 'GET',
        dataType: 'json',
        success: function(res) {
            $('#new_node_textarea').textcomplete([{
			    match: /(^|\s)@([a-z0-9+\-\_]*)$/,
			    search: function (term, callback) {
			        callback($.map(res, function (name) {
			            return name.indexOf(term) === 0 ? name : null;
			        }));
			    },
			    replace: function (name) {
			        return ' @' + name + ' ';
			    }
			}]);
        }
    });
	$.ajax({type: 'GET',
			url: '/log_data?data=open_new_node_modal',
			success: function(res) {
			}
	});

	$("#new_node_modal_box").css({
	    'margin-top': function () {
	        return ($(this).height() / 4);
	    }
	});

	$('#new_node_modal_box form').off("submit");

	$('#new_node_modal_box form').submit({}, function(evt) {
		evt.preventDefault();
		$('#new_node_modal_box').modal('toggle');
		var comment = $('#new_node_textarea').val().trim();
		var article_id = $('#article_id').text();
		var csrf = $('#csrf').text();
		var data = {csrfmiddlewaretoken: csrf,
			comment: comment,
			owner: owner,
			article: article_id,
			type: 'new_node'};

		data.id = evt.data.data_id;

		chatsock.send(JSON.stringify(data));
	});
});


$('#reply_modal_box').on('show.bs.modal', function(e) {
	var id = $(e.relatedTarget).data('id');
	$("#reply_comment_textarea").val('');

	$.ajax({
        url: "/users",
        type: 'GET',
        dataType: 'json',
        success: function(res) {
            $('#reply_comment_textarea').textcomplete([{
			    match: /(^|\s)@([a-z0-9+\-\_]*)$/,
			    search: function (term, callback) {
			        callback($.map(res, function (name) {
			            return name.indexOf(term) === 0 ? name : null;
			        }));
			    },
			    replace: function (name) {
			        return ' @' + name + ' ';
			    }
			}]);
        }
    });

	d = nodes_all[id-1];
	var ids = [];
	var dids = [];
	var did_str = '';

	highlight_box(id);
	did_str += d.d_id;

	$.ajax({type: 'GET',	
			url: '/log_data?data=open_reply_modal&did=' + did_str,	
			success: function(res) {	
			}	
	});

	var class_sum = "";	
	if (d.replace_node) {	
		var node_text = '<strong>Summary Node:</strong><BR>' + render_summary_node(d, false);	
		var class_sum = "summary_box";	
	} else if (d.summary != '') {	
		var node_text = '<strong>Summary:</strong> ' + render_summary_node(d, false);	
	} else {	
		var node_text = d.name;	
	}	

	var text = '<div class="reply_comment_comment' + ' ' + class_sum + '">' + node_text+ '</div>';	

	$('#reply_comment_box').html(text);

	// id of node to reply to
	var did = $(e.relatedTarget).data('did');
	$('#reply_modal_box form').off("submit");

	$('#reply_modal_box form').submit({data_id: did, id: id, ids: ids, dids: dids}, function(evt) {
		evt.preventDefault();
		$(this).submit(function() {
			return false;
		});
		$('#reply_modal_box').modal('toggle');
		var comment = $('#reply_comment_textarea').val().trim();
		var article_id = $('#article_id').text();
		var csrf = $('#csrf').text();
		var data = {csrfmiddlewaretoken: csrf,
			comment: comment,
			owner: owner,
			article: article_id,
			type: 'reply_comment'};
		data.id = evt.data.data_id;
		data.node_id = evt.data.id;
		chatsock.send(JSON.stringify(data));
		return true;
	});

});

$('#evaluate_summary_modal_box').on('show.bs.modal', function(e) {
	$("#evaluate_summary_modal_box").css({
	    'margin-top': function () {
	        return ($(this).height() / 4);
	    },
	    'margin-left': function () {
	        return ($(this).width() / 4);
	    }
	});

	var id = $(e.relatedTarget).data('id');
	
	d = nodes_all[id-1];
	
	$.ajax({type: 'GET',
			url: '/log_data?data=open_evaluate_summary_modal&did=' + d.d_id,
			success: function(res) {
			}
	});
	
	// Need to expand to see children and add them to nodes_all
    expand_all(d.id);
    show_text(nodes_all[0]);
	
	var text = 'Flag this summary as being problematic or exemplary in the below characteristics:';
	$('#evaluate_text').html(text);
	
	var is_summary_box = '';
	if (d.replace_node) {
		var node_text = '<strong>Summary Node:</strong><BR>' + render_summary_node(d, false);
		is_summary_box = 'summary_box';
	} else if (d.summary != '') {
		var node_text = '<strong>Summary:</strong> ' + render_summary_node(d, false);
		node_text += '<P>---</P>';
		node_text += d.name;
	} else {
		var node_text = d.name;
	}

	var text = '<div class="' + is_summary_box + ' tag_comment_comment" style="border-width:2px;">' + node_text+ '</div>';
	var children_text = '';
	if (d.replace_node) {
		if (d.replace.length > 0) {
			for (var i=0; i<d.replace.length; i++) {
				var summarized = d.replace[i].summarized || d.replace[i].summarized==undefined? "summarized" : "";
				if (d.replace[i].summary != '') {
					children_text += `<div id="sum_box_` + d.replace[i].id + `" class="summarize_comment_comment ${summarized} "><P>ID: ` + d.replace[i].d_id + `</P><strong>Summary: </strong> ` + render_summary_node_edit(d.replace[i]) + `</div>`;
				} else {
					current_summarize_d_id.push(d.replace[i].d_id);

					children_text += `<div id="sum_box_` + d.replace[i].id + `" class="summarize_comment_comment ${summarized} "><P>ID: ` + d.replace[i].d_id + '</P>' + show_comment_text(d.replace[i].name, d.replace[i].id)  + '<P>-- ' + d.replace[i].author + '</P></div>';
				}
				children_text = get_subtree_summarize(children_text, d.replace[i], 1, true);
			}

		} else if (d.children.length > 0) {
			var children_text = '';
			for (var i=0; i<d.children.length; i++) {
				var summarized = d.children[i].summarized || d.children[i].summarized==undefined? "summarized" : "";
				if (d.children[i].summary != '') {
					children_text += '<div id="sum_box_' + d.children[i].id + `" class="summarize_comment_comment ${summarized} "><P>ID: ` + d.children[i].d_id + '</P><strong>Summary: </strong> ' + render_summary_node_edit(d.children[i]) + '</div>';
				} else {

					current_summarize_d_id.push(d.children[i].d_id);

					children_text += '<div id="sum_box_' + d.children[i].id + `" class="summarize_comment_comment ${summarized} "><P>ID: ` + d.children[i].d_id + '</P>' + show_comment_text(d.children[i].name, d.children[i].id) + '<P>-- ' + d.children[i].author + '</P></div>';
				}
				children_text = get_subtree_summarize(children_text, d.children[i], 1, true);
			}
		}
	}

	$('#evaluate_summary_box').html(text+children_text);
	
	var neutral = 3;
	var coverage = 3;
	var quality = 3;
	
	if (d.rating_flag) {
		
		if (!d.rating_flag.neutral) {
			neutral = 3;
		} else {
			neutral = d.rating_flag.neutral;
		}
		if (neutral == 1) {
      		$('#neutral_score').html('<img src="/static/website/img/alarm.png" width=15> Inserted Bias (major)');
      	} else if (neutral == 2) {
      		$('#neutral_score').html('<img src="/static/website/img/warning.png" width=15> Inserted Bias (minor)');
      	} else if (neutral == 3) {
      		$('#neutral_score').html('None');
      	} else if (neutral == 4) {
      		$('#neutral_score').html('<img src="/static/website/img/silver.png" width=18> Neutral POV (good)');
      	} else if (neutral == 5) {
      		$('#neutral_score').html('<img src="/static/website/img/gold.png" width=11> Neutral POV (great)');
      	}
		if (!d.rating_flag.coverage) {
			coverage = 3;
		} else {
			coverage = d.rating_flag.coverage;
		}
		if (coverage == 1) {
      		$('#coverage_score').html('<img src="/static/website/img/alarm.png" width=15> Incomplete or misrepresentative (major)');
      	} else if (coverage == 2) {
      		$('#coverage_score').html('<img src="/static/website/img/warning.png" width=15> Incomplete or misrepresentative (minor)');
      	} else if (coverage == 3) {
      		$('#coverage_score').html('None');
      	} else if (coverage == 4) {
      		$('#coverage_score').html('<img src="/static/website/img/silver.png" width=18> Coverage (good)');
      	} else if (coverage == 5) {
      		$('#coverage_score').html('<img src="/static/website/img/gold.png" width=11> Complete coverage (great)');
      	}
		if (!d.rating_flag.quality) {
			quality = 3;
		} else {
			quality = d.rating_flag.quality;
		}
		if (quality == 1) {
      		$('#quality_score').html('<img src="/static/website/img/alarm.png" width=15> Writing quality (poor)');
      	} else if (quality == 2) {
      		$('#quality_score').html('<img src="/static/website/img/warning.png" width=15> Writing quality (needs touchup)');
      	} else if (quality == 3) {
      		$('#quality_score').html('None');
      	} else if (quality == 4) {
      		$('#quality_score').html('<img src="/static/website/img/silver.png" width=18> Writing quality (good)');
      	} else if (quality == 5) {
      		$('#quality_score').html('<img src="/static/website/img/gold.png" width=11> Writing quality (great)');
      	}
	}

	$( "#neutral_rating" ).slider({
      value:neutral,
      min: 1,
      max: 5,
      step: 1,
      slide: function( event, ui ) {
        if (ui.value == 1) {
      		$('#neutral_score').html('<img src="/static/website/img/alarm.png" width=15> Inserted Bias (major)');
      	} else if (ui.value == 2) {
      		$('#neutral_score').html('<img src="/static/website/img/warning.png" width=15> Inserted Bias (minor)');
      	} else if (ui.value == 3) {
      		$('#neutral_score').html('None');
      	} else if (ui.value == 4) {
      		$('#neutral_score').html('<img src="/static/website/img/silver.png" width=18> Neutral POV (good)');
      	} else if (ui.value == 5) {
      		$('#neutral_score').html('<img src="/static/website/img/gold.png" width=11> Neutral POV (great)');
      	}
      }
    });
    
    $('#neutral_rating').css('background','linear-gradient(to right, red 25%, white 50%, green 100%)');

    
    $( "#coverage_rating" ).slider({
      value:coverage,
      min: 1,
      max: 5,
      step: 1,
      slide: function( event, ui ) {
      	if (ui.value == 1) {
      		$('#coverage_score').html('<img src="/static/website/img/alarm.png" width=15> Incomplete (major)');
      	} else if (ui.value == 2) {
      		$('#coverage_score').html('<img src="/static/website/img/warning.png" width=15> Incomplete (minor)');
      	} else if (ui.value == 3) {
      		$('#coverage_score').html('None');
      	} else if (ui.value == 4) {
      		$('#coverage_score').html('<img src="/static/website/img/silver.png" width=18> Coverage (good)');
      	} else if (ui.value == 5) {
      		$('#coverage_score').html('<img src="/static/website/img/gold.png" width=11> Complete coverage (great)');
      	}
      }
    });
    
    $('#coverage_rating').css('background','linear-gradient(to right, red 25%, white 50%, green 100%)');

    
    $( "#quality_rating" ).slider({
      value:quality,
      min: 1,
      max: 5,
      step: 1,
      slide: function( event, ui ) {
        if (ui.value == 1) {
      		$('#quality_score').html('<img src="/static/website/img/alarm.png" width=15> Writing quality (poor)');
      	} else if (ui.value == 2) {
      		$('#quality_score').html('<img src="/static/website/img/warning.png" width=15> Writing quality (needs touchup)');
      	} else if (ui.value == 3) {
      		$('#quality_score').html('None');
      	} else if (ui.value == 4) {
      		$('#quality_score').html('<img src="/static/website/img/silver.png" width=18> Writing quality (good)');
      	} else if (ui.value == 5) {
      		$('#quality_score').html('<img src="/static/website/img/gold.png" width=11> Writing quality (great)');
      	}
      }
    });
    
    $('#quality_rating').css('background','linear-gradient(to right, red 25%, white 50%, green 100%)');

    if (d.replace_node) {
	    var summarized_list_text = 'Summarized list (check to mark as summarized):';
	    summarized_list_text += '<div id="summarized_id_list">';
	    var d_all_children = recurse_get_children(d);
	    for (var i = 0; i < d_all_children.length; i++) {
			var child = d_all_children[i];
			if (!child.replace_node) {
				if (child.summarized == false) {
					summarized_list_text +='<input type="checkbox" id="check_'+child.d_id+'" name="'+child.d_id+'">';
				} else {
					summarized_list_text +='<input type="checkbox" id="check_'+child.d_id+'" name="'+child.d_id+'" checked>';
				}
				summarized_list_text += '<label for="'+child.d_id+'">'+child.d_id+'</label><br>';
			}
		}
	    summarized_list_text += '</div>';
	    $('#summarized_children').html(summarized_list_text);
	}
	var did = $(e.relatedTarget).data('did');

	$('#evaluate_summary_modal_box form').off("submit");

	$('#evaluate_summary_modal_box form').submit({data_id: did, id: id}, function(evt) {
		evt.preventDefault();
		
		var neu = $( "#neutral_rating" ).slider('value');
		var cov = $( "#coverage_rating" ).slider('value');
		var qual = $( "#quality_rating" ).slider('value');

		var to_summarize = [];
		var to_summarize_dids = [];
		var to_unsummarize = [];
		var to_unsummarize_dids = [];
		if (d_all_children) {
			for (var i=0; i < d_all_children.length; i++) {
				if (!d_all_children[i].replace_node) {
					// checked as summarized and currently unsummarized
					if ($('#check_' + d_all_children[i].d_id).is(":checked") && d_all_children[i].summarized==false) {
						to_summarize.push(d_all_children[i]);
						to_summarize_dids.push(d_all_children[i].d_id);
					}
					// unchecked and currently summarized
					if (!$('#check_' + d_all_children[i].d_id).is(":checked") && !d_all_children[i].summarized==false) {
						to_unsummarize.push(d_all_children[i]);
						to_unsummarize_dids.push(d_all_children[i].d_id);
					}
				}
			}
		}

		var csrf = $('#csrf').text();
		var data = {csrfmiddlewaretoken: csrf,
			neu: neu,
			cov: cov,
			qual: qual,
			to_summarize_dids: to_summarize_dids,
			to_unsummarize_dids: to_unsummarize_dids
			};
		data.id = evt.data.data_id;
		$.ajax({
			type: 'POST',
			url: '/rate_summary',
			data: data,
			success: function(res) {
				success_noty();
				$('#evaluate_summary_modal_box').modal('toggle');
				
				if (res.success) {
					if (!d.rating_flag) {
						d.rating_flag = {};
					}
					d.rating_flag.neutral = neu;
					d.rating_flag.coverage = cov;
					d.rating_flag.quality = qual;

					for (var i=0; i < to_summarize.length; i++) {
						to_summarize[i].summarized = true;
						to_summarize[i].collapsed = true;
						$('#comment_' + to_summarize[i].id).removeClass('unsummarized');
						// d3.select('#node_' + to_summarize[i].id).style('fill', color);
					}

					for (var i=0; i < to_unsummarize.length; i++) {
						to_unsummarize[i].summarized = false;
						$('#comment_' + to_unsummarize[i].id).addClass('unsummarized');
						// d3.select('#node_' + to_unsummarize[i].id).style('fill', color);
					}

					// d3.select('#node_' + d.id).style('fill', color);
					make_progress_bar();
					update(d);
					show_text(d);
				}
			},
			error: function() {
				error_noty();
			}
		});
	});
	
});


$('#tag_modal_box').on('show.bs.modal', function(e) {
	var id = $(e.relatedTarget).data('id');
	var type = $(e.relatedTarget).data('type');
	
	d = nodes_all[id-1];
	var ids = [];
	var dids = [];
	var overlapping_tags = [];
	var did_str = '';

	highlight_box(id);
	if (type == "tag_one") {
		did_str += d.d_id;
		$.ajax({type: 'GET',
				url: '/log_data?data=open_tag_modal&did=' + did_str + '&type=' + type,
				success: function(res) {
				}
		});
		
		if (d.replace_node) {
			var text = '<div class="summary_box tag_comment_comment"><P>' + render_summary_node(d, true); + '</P></div>';
			$('#tag_comment_text').text('Tag this summary.');
		} else {
			var text = '<div class="tag_comment_comment tag_comment">' + d.name + '</div>';
			$('#tag_comment_text').text('Tag this comment.');
		}

		overlapping_tags = d.tags;

	} else if (type == "tag_selected") {
		var text = '';
		var datas = [];
		var min_level = 50;

		$('#outline .rb-red').each(function(index) {
			var data = nodes_all.filter(o => o.d_id == this.id)[0];
			if (data) {
				var id_clicked = data.id;
				ids.push(id_clicked);
				for (var i=overlapping_tags.length; i>=0; i--) {
					if (data.tags.indexOf(overlapping_tags[i]) == -1) {
						overlapping_tags.splice(i, 1);
					}
				}

				datas.push(data);
				dids.push(data.d_id);
				did_str += data.d_id + ',';
				if (data.depth < min_level) {
					min_level = data.depth;
				}
			}
		});
		
		$.ajax({type: 'GET',
				url: '/log_data?data=open_tag_modal&did=' + did_str + '&type=' + type,
				success: function(res) {
				}
		});

		datas.sort(compare_nodes);
		for (var i in datas) {

			var class_sum = "";
			if (datas[i].replace_node) {
				var node_text = '<strong>Summary Node:</strong><BR>' + render_summary_node(datas[i], false);
				var class_sum = "summary_box";
			} else if (datas[i].summary != '') {
				var node_text = '<strong>Summary:</strong> ' + render_summary_node(datas[i], false);
			} else {
				var node_text = datas[i].name;
			}

			if (datas[i].depth - min_level <= 3) {
				var lvl = datas[i].depth - min_level;
			} else {
				var lvl = 3;
			}

			text += '<div class="tag_comment_comment level' + lvl + ' ' + class_sum + '"><P>ID: ' + datas[i].d_id + '</p>' + node_text+ '</div>';

		}

		$('#tag_comment_text').text('Tag all these comments.');
	}

	$('#tag_comment_box').html(text);

	d_text = '';

	if (overlapping_tags.length > 0) {
		d_text += '<BR><div id="current_tags">Current tags: ';
		for (var i=0; i<overlapping_tags.length; i++) {
			if (is_dark(overlapping_tags[i][1])) {
				d_text += '<button class="btn btn-xs" onclick="delete_tags(event,\'' + did_str + '\',\'' +overlapping_tags[i][0] + '\')" style="color: #FFFFFF; background-color: #' + overlapping_tags[i][1] + '">' + overlapping_tags[i][0] + ' &nbsp;x </button> ';
			} else {
				d_text += '<button class="btn btn-xs" onclick="delete_tags(event,\'' + did_str + '\',\'' +overlapping_tags[i][0] + '\')" style="background-color: #' + overlapping_tags[i][1] + '">' + overlapping_tags[i][0] + ' &nbsp;x </button> ';
			}
		}
		d_text += '</div><BR>';
	} else {
		d_text += '<BR><div id="current_tags"></div><BR>';
	}
	d_text += 'Add tag:';
	d_text += '<BR><div id="suggested_tags"></div><BR>';
	d_text += '<div id="remote"><input required class="typeahead form-control input-sm" id="tag-form" placeholder="New tag"></div>';

	$('#tag_comment_dropdown').html(d_text);
	var article_id = $('#article_id').text();
	var tag_suggestions = new Bloodhound({
	  datumTokenizer: Bloodhound.tokenizers.whitespace,
	  queryTokenizer: Bloodhound.tokenizers.whitespace,
	  prefetch: {
	  	url:'/tags?id=' + article_id + '&owner=' + owner,
	  	cache: false,
	  }
	});


	$('#remote .typeahead').typeahead({
		hint: true,
		highlight: true,
		minLength: 1
	}, {
	  name: 'tags',
	  source: tag_suggestions
	});

	var did = $(e.relatedTarget).data('did');

	$('#tag_modal_box form').off("submit");

	$('#tag_modal_box form').submit({data_id: did, id: id, type: type, ids: ids, dids: dids}, function(evt) {
		evt.preventDefault();
		$('#tag_modal_box').modal('toggle');
		var tag = $('#tag-form').val();
		var article_id = $('#article_id').text();
		var csrf = $('#csrf').text();
		var data = {csrfmiddlewaretoken: csrf,
			tag: tag,
			article: article_id,
			type: evt.data.type,
			did_str: did_str
		};

		if (evt.data.type == "tag_one") {
			data.id = evt.data.data_id;
			data.node_id = evt.data.id;
			chatsock.send(JSON.stringify(data));
		} else if (evt.data.type == "tag_selected") {
			data.ids = evt.data.dids;
			data.node_ids = evt.data.ids;
			chatsock.send(JSON.stringify(data));
		}
	});
	
	var article_id = $('#article_id').text();
	var csrf = $('#csrf').text();
	var data = {csrfmiddlewaretoken: csrf,
		article: article_id};

	if (type == "tag_one") {
		data.id = did;
	} else {
		data.ids = dids;
	}

	$.ajax({
		type: 'POST',
		url: '/suggested_tags',
		data: data,
		success: function(res) {
			console.log(res);
			if (res.suggested_tags.length > 0) {
				var text = 'Suggested tags: ';
				for (var i=0; i<res.suggested_tags.length; i++) {
					if (is_dark(res.suggested_tags[i].color)) {
						text += '<button class="btn btn-xs suggest_tag" style="color: #FFFFFF; background-color: #' + res.suggested_tags[i].color + '">' + res.suggested_tags[i].tag + '</button> ';
					} else {
						text += '<button class="btn btn-xs suggest_tag" style="background-color: #' + res.suggested_tags[i].color + '">' + res.suggested_tags[i].tag + '</button> ';
					}			
				}
				$('#suggested_tags').html(text);
				// $('.suggest_tag').click(function() {
					// var text = $(this).text();
					// $('#tag-form').val(text);
				// });
			}
		}
	});
});


$('#hide_modal_box').on('show.bs.modal', function(e) {
	var id = $(e.relatedTarget).data('id');
	var type = $(e.relatedTarget).data('type');

	$('#hide_comment_textarea').val("");

	d = nodes_all[id-1];
	var ids = [];
	var dids = [];

	highlight_box(id);
	if (type == "hide_comment") {
		var text = '<div class="hide_comment_comment">' + d.name + '</div>';
		$('#hide_comment_text').text('Hide this comment from view.');
			$.ajax({type: 'GET',
					url: '/log_data?data=open_hide_comment_modal&did=' + d.d_id + '&type=' + type,
					success: function(res) {
					}
			});
	} else if (type == "hide_replies") {
		var text = '<strong>Original Comment: </strong><div class="hide_comment_comment">' + d.name + '</div><BR><strong>Replies:</strong><BR>';
		text = get_subtree(text, d, 0);
		$('#hide_comment_text').text('Hide the replies to this original comment from view.');
			$.ajax({type: 'GET',
						url: '/log_data?data=open_hide_comment_modal&did=' + d.d_id + '&type=' + type,
						success: function(res) {
						}
				});
	} else if (type == "hide_all_selected") {
		var text = '';
		var datas = [];
		var min_level = 50;
		var did_str = '';
		$('.marker.outline-selected').each(function() {
			var data = nodes_all.filter(o => o.d_id == this.id.substring(7))[0];
			if (!data.article) {
				ids.push(data.id);
				datas.push(data);
				dids.push(data.d_id);
				did_str += data.d_id + ',';
				if (data.depth < min_level) {
					min_level = data.depth;
				}
			}
		});
		
			$.ajax({type: 'GET',
						url: '/log_data?data=open_hide_comment_modal&did=' + did_str + '&type=' + type,
						success: function(res) {
						}
				});

		datas.sort(compare_nodes);
		for (var i in datas) {

			var class_sum = "";
			if (datas[i].replace_node) {
				var node_text = '<strong>Summary Node:</strong><BR>' + render_summary_node(datas[i], false);
				var class_sum = "summary_box";
			} else if (datas[i].summary != '') {
				var node_text = '<strong>Summary:</strong> ' + render_summary_node(datas[i], false);
			} else {
				var node_text = datas[i].name;
			}

			if (datas[i].depth - min_level <= 3) {
				var lvl = datas[i].depth - min_level;
			} else {
				var lvl = 3;
			}

			text += '<div class="hide_comment_comment level' + lvl + ' ' + class_sum + '"><P>ID: ' + datas[i].d_id + '</p>' + node_text+ '</div>';

		}

		$('#hide_comment_text').text('Hide all these comments from view.');
	}

	$('#hide_comment_box').html(text);
	$('#hide_comment_box').wrap('<div/>')
        .css({'overflow':'hidden'})
          .parent()
            .css({'display':'inline-block',
                  'overflow':'hidden',
                  'height':function(){return $('.resizable',this).height();},
                  'width':  function(){return $('.resizable',this).width();},
                  'paddingBottom':'12px',
                  'paddingRight':'12px',
                  'border': '1px solid #000000',
                 }).resizable()
                    .find('.resizable')
                      .css({overflow:'auto',
                            width:'100%',
                            height:'100%'});

	var did = $(e.relatedTarget).data('did');

	$("#hide_comment_submit").off("click");

	$('#hide_comment_submit').click({data_id: did, id: id, type: type, ids: ids, dids: dids}, function(evt) {

		var comment = $('#hide_comment_textarea').val();
		var article_id = $('#article_id').text();
		var csrf = $('#csrf').text();
		var data = {csrfmiddlewaretoken: csrf,
			comment: comment,
			article: article_id};
		$('#hide_modal_box').modal('toggle');

		if (evt.data.type == "hide_comment") {
			data.id = evt.data.data_id;
			var d = nodes_all[evt.data.id-1];
			d3.select('#node_' + d.parent.id).style('fill', color);
			data.node_id = id;
			data.type = 'hide_comment';
			chatsock.send(JSON.stringify(data));
		} else if (evt.data.type == "hide_all_selected") {
			data.ids = evt.data.dids;
			data.node_ids = evt.data.ids;

			var min_level = 50;
			var objs = [];
			$('.marker.outline-selected').each(function() {
				var data = nodes_all.filter(o => o.d_id == this.id.substring(7))[0];
				if (!data.article) {
					objs.push(data);
					if (data.depth < min_level) {
						min_level = data.depth;
					}
				}
			});

			var children = []
			lowest_id = 50000;
			lowest_d = null;
			highest_id = -1;
			highest_d = null;
			for (var i=0; i<objs.length; i++) {
				if (objs[i].depth == min_level) {
					children.push(objs[i].d_id);
					if (objs[i].id < lowest_id) {
						lowest_id = objs[i].id;
						lowest_d = objs[i];
					}
					if (objs[i].id > highest_id) {
						highest_id = objs[i].id;
						highest_d = objs[i];
					}
				}
			}
			console.log(children);
			console.log(data.ids);
			data.children = children;
			data.first_selected = lowest_d.d_id;
			data.last_selected = highest_d.d_id;
			data.type = 'hide_comments';
			chatsock.send(JSON.stringify(data));
		} else {
			data.id = evt.data.data_id;
			data.node_id = evt.data.id;
			data.type = 'hide_replies';
			chatsock.send(JSON.stringify(data));
		}

	});
});

function cite_para(did, para_num) {
	var box = $('#' + activeBox + '_comment_textarea');
	var cursorPos = box.prop('selectionStart');
    var v = box.val();
    var textBefore = v.substring(0,  cursorPos );
    var textAfter  = v.substring( cursorPos, v.length );
    box.val( textBefore + '[[comment_' + did + '_p' +  para_num + ']]\n' + textAfter );
    copy_to_tinyMCE('[[comment_' + did + '_p' +  para_num + ']]\n');
}

function delete_tags(evt, dids, tag) {
	var csrf = $('#csrf').text();
	var data = {csrfmiddlewaretoken: csrf,
		ids: dids,
		tag: tag,
		type: 'delete_tags'};
	chatsock.send(JSON.stringify(data));

	evt.preventDefault();
}


function show_comment_text(text, did) {

	var regex = /<\/P>/gi, result, indices = [];
	while ((result = regex.exec(text))) {
	     indices.push(result.index);
	}

	if (indices.length > 1) {
		for (var i=indices.length-1; i>=0; i--) {
			if (text.substring(indices[i]-4, indices[i]-1) != '<p>') {
				cite_text = '<BR><a class="btn-xs btn-edit" onclick="cite_para(' + did + ',' + i + ')">Cite Paragraph</a>';
				text = text.slice(0, indices[i]) + cite_text + text.slice(indices[i]);
			}
		}
	}

	text = text.replace(/<br>/g, ' ');

	return text;
}

$('#confirm_delete_modal_box').on('click', '.btn-ok', function(e) {
		var $modalDiv = $(e.delegateTarget);
  		var did = $(this).data('did');
  		d = nodes_all.filter(o => o.d_id == did)[0];
		if (d.replace_node) {
			var article_id = $('#article_id').text();
			var csrf = $('#csrf').text();
			var data = {csrfmiddlewaretoken: csrf,
				comment: '',
				article: article_id,
				id: d.d_id};
			data.type = 'hide_comment';
			chatsock.send(JSON.stringify(data));
		} else {
			var article_id = $('#article_id').text();
			var csrf = $('#csrf').text();
			var data = {csrfmiddlewaretoken: csrf,
				comment: '',
				article: article_id,
				id: d.d_id};
			data.type = 'delete_comment_summary';
			chatsock.send(JSON.stringify(data));
		}
		$('#confirm_delete_modal_box').modal('toggle');
	});

$('#confirm_delete_modal_box').on('show.bs.modal', function(e) {
	var did = $(e.relatedTarget).data('did');
  	$('.btn-ok', this).data('did', did);
});


function insert_quote(highlighted_text, did) {
	var box = $('#' + activeBox + '_comment_textarea');
	var cursorPos = box.prop('selectionStart');
    var v = box.val();
    var textBefore = v.substring(0,  cursorPos );
    var textAfter  = v.substring( cursorPos, v.length );
    box.val( textBefore + '\n[quote]"' + highlighted_text + '" [[comment_' + did +']] [endquote]\n' + textAfter );
    copy_to_tinyMCE('\n[quote]"' + highlighted_text + '" [[comment_' + did +']] [endquote]\n');
}

function send_update_drag_locks(to_lock, new_parent_did) {
	var article_id = $('#article_id').text();
	var csrf = $('#csrf').text();
	var lock_data = {csrfmiddlewaretoken: csrf,
		article: article_id,
		to_lock: to_lock,
		new_parent_did: new_parent_did,
		type: 'update_drag_locks',
		unique_user_id: unique_user_id};
	chatsock.send(JSON.stringify(lock_data));
}

function send_update_locks(dids, to_lock) {
	var article_id = $('#article_id').text();
	var csrf = $('#csrf').text();
	var lock_data = {csrfmiddlewaretoken: csrf,
		article: article_id,
		ids: dids,
		to_lock: to_lock,
		type: 'update_locks'};
	chatsock.send(JSON.stringify(lock_data));
}

$('#summarize_modal_box').on('show.bs.modal', function(e) {

	activeBox = 'summarize';

	var type = $(e.relatedTarget).data('type');
	$('#empty_warning_single').text('');

	var ids = [];
	var dids = [];

	var id = $(e.relatedTarget).data('id');
	var did = $(e.relatedTarget).data('did');
	$('#summarize_modal_box').attr('summarize_modal_box_id', id);
	$('#summarize_modal_box').attr('summarize_modal_box_did', did);

	d = nodes_all[id-1];
	
				$.ajax({type: 'GET',
						url: '/log_data?data=open_summarize_one_modal&did=' + did + '&type=' + type,
						success: function() {
						}
				});
	current_summarize_d_id.push(d.d_id);

	highlight_box(id);

	highlight_check = localStorage.getItem('highlight_check');

	if (highlight_check == "true") {
		$('#summarize_highlight_button').html('<span class="button-checkbox"><button type="button" class="btn btn-xs" data-color="yellow">Highlight top sentences</button><input type="checkbox" class="hidden" checked /></span>');
	} else {
		$('#summarize_highlight_button').html('<span class="button-checkbox"><button type="button" class="btn btn-xs" data-color="yellow">Highlight top sentences</button><input type="checkbox" class="hidden" /></span>');
	}
	check_button_checkbox();

	if (type == "summarize_one") {
		var text = '<div id="sum_box_' + d.id + '" class="summarize_comment_comment"><P>ID: ' + d.d_id + '</P>' + show_comment_text(d.name, d.d_id) + '<P>-- ' + d.author + '</P></div>';

		$('#summarize_comment_text').text('Summarize this comment.');
		$('#summarize_comment_textarea').val(""); 

	} else if (type == "edit_summarize_one") {
		var text = '<div id="sum_box_' + d.id + '" class="summarize_comment_comment"><P>ID: ' + d.d_id + '</P>' + show_comment_text(d.name, d.d_id) + '<P>-- ' + d.author + '</P></div>';
		
		if (d.extra_summary != '') {
			if (article_url.indexOf('wikipedia.org') !== -1) {
				$('#summarize_comment_textarea').val(d.sumwiki + '\n----------\n' + d.extrasumwiki);
			} else {
				$('#summarize_comment_textarea').val(d.summary + '\n----------\n' + d.extra_summary);
			}
		} else {
			if (article_url.indexOf('wikipedia.org') !== -1) {
				$('#summarize_comment_textarea').val(d.sumwiki);
			}
			else {
				$('#summarize_comment_textarea').val(d.summary);
			}
		}
		
		$('#summarize_comment_text').text('Edit the summary for this comment.');
	}

	text = '<div class="img-rounded" id="tooltip_sum">Quote</div>' + text;

	$('#summarize_comment_box').html(text);
	$('#summarize_comment_box').wrap('<div/>')
        .css({'overflow':'hidden'})
          .parent()
            .css({'display':'inline-block',
                  'overflow':'hidden',
                  'height':function(){return $('.resizable',this).height();},
                  'width':  function(){return $('.resizable',this).width();},
                  'paddingBottom':'12px',
                  'paddingRight':'12px',
                  'border': '1px solid #000000',
                 }).resizable()
                    .find('.resizable')
                      .css({overflow:'auto',
                            width:'100%',
                            height:'100%'});

	$("#summarize_comment_box").off("mouseup");
	$("#summarize_comment_box").off("mousedown");


	$("#tooltip_sum").off("click");

	$('#tooltip_sum').mousedown(function(evt) {
		evt.stopPropagation();
	}).mouseup(function(evt) {
		evt.stopPropagation();
		insert_quote(highlighted_text, nodes_all[highlighted_comm - 1].d_id);
	});

	$('#summarize_comment_box').mouseup(function(evt) {
		clearTimeout(cancelClick);
		if (!isClick) {
			highlighted_text = window.getSelection().toString();
	   		if (highlighted_text.length > 10) {
	   			
	   			if (evt.target.parentNode.id.indexOf('sum_box') != -1) {
	   				highlighted_comm = parseInt(evt.target.parentNode.id.substring(8));
	   			} else {
	   				highlighted_comm = parseInt(evt.target.parentNode.parentNode.id.substring(8));
	   			}
	   			var offset = $("#summarize_comment_box").offset();
	   			var scroll = $("#summarize_comment_box").scrollTop();
	   			$('#tooltip_sum').css({'top': evt.pageY - offset.top + scroll + 'px', 'left': evt.pageX - offset.left + 'px'});
	   			$('#tooltip_sum').show();
	   		}
	 } else {
	  	$('#tooltip_sum').hide();
	  }
	  isClick = true;
	})
	.mousedown(function(evt) {
		cancelClick = setTimeout(is_click, 250);
	});

	dids_in_use = [did];
	send_update_locks([did], true);

	$('#summarize_modal_box form').off("submit");

	$('#summarize_modal_box form').submit({data_id: did, id: id, type: type, ids: ids, dids: dids}, function(evt) {
		evt.preventDefault();
		dids_in_use = [];
		send_update_locks([did], false);
		var comment = $('#summarize_comment_textarea').val().trim();
		if (comment === '') {
			$('#empty_warning_single').text('Summary cannot be empty');
			return false;
		}
		$('#summarize_modal_box').modal('toggle');
		var article_id = $('#article_id').text();
		var csrf = $('#csrf').text();
		var data = {csrfmiddlewaretoken: csrf,
			comment: comment,
			article: article_id};

		data.id = evt.data.data_id;
		data.node_id = evt.data.id;
		data.type = 'summarize_comment';
		chatsock.send(JSON.stringify(data));
	});
});


$('#summarize_multiple_modal_box').on('show.bs.modal', function(e) {

	activeBox = 'summarize_multiple';
	$('#empty_warning_multiple').text('');

	$("#summarize_multiple_modal_box").css({
	    'margin-top': function () {
	        return ($(this).height() / 4);
	    },
	    'margin-left': function () {
	        return ($(this).width() / 4);
	    }
	});


	var type = $(e.relatedTarget).data('type');

	var ids = [];
	var dids = [];

	if (type == "summarize_selected") {
		var objs = [];
		var min_level = 50;
		var did_str = '';
		$('.marker.outline-selected').each(function() {
			var data = nodes_all.filter(o => o.d_id == this.id.substring(7))[0];
			if (!data.article) {
				objs.push(data);
				if (data.depth < min_level) {
					min_level = data.depth;
				}
				did_str += data.d_id + ',';
			}
		});
		
				$.ajax({type: 'GET',
						url: '/log_data?data=open_summarize_multiple_modal&did=' + did_str + '&type=' + type,
						success: function() {
						}
				});

		objs.sort(compare_nodes);
		var text = '';

		for (var i in objs) {
			ids.push(objs[i].id);
			dids.push(objs[i].d_id);

			current_summarize_d_id.push(objs[i].d_id);

			var depth = Math.min(objs[i].depth - min_level, 3);
			var summaryClass = objs[i].replace_node? "summary_box" : "";
			var summarized = objs[i].summarized? "summarized" : "";


			text += `<div id="sum_box_${objs[i].id}" class="summarize_comment_comment ${summaryClass} ${summarized} level${depth}">
			<p>ID: ${objs[i].d_id} |`;

			if (objs[i].replace_node) {
				text += `
					<a class="btn-xs btn-edit" onclick="copy_summary_node(${objs[i].id});">Promote Summary</a> |
					<a class="btn-xs btn-edit" onclick="copy_summary(${objs[i].id});">Copy Summary</a> |
					<a class="btn-xs btn-edit" onclick="cite_comment(${objs[i].d_id});">Cite Summary</a>
				</P>
				<strong>Summary Node:</strong><BR>
				${render_summary_node_edit(objs[i])}`;
			} else {
				if (objs[i].summary) {
					text += `
					<a class="btn-xs btn-edit" onclick="copy_summary(${objs[i].id});">Copy Entire Summary</a> |
					<a class="btn-xs btn-edit" onclick="cite_comment(${objs[i].d_id});">Cite Comment</a>
					</P>
					<strong>Summary:</strong>
					${render_summary_node_edit(objs[i])}`;
				} else {
					text += ` | <a class="btn-xs btn-edit" onclick="cite_comment(${objs[i].d_id});">Cite Comment</a>
					</P>
					${show_comment_text(objs[i].name, objs[i].d_id)}
					<P>-- ${objs[i].author}</P>`;
				}
			}

			text += `</div>`
		}

		$('#summarize_multiple_comment_text').text('Summarize these selected comments.');
		tinymce.get('summarize_multiple_comment_textarea').setContent("");

		$('#summarize_multiple_modal_box').attr('summarize_multiple_modal_box_ids', ids);
		$('#summarize_multiple_modal_box').attr('summarize_multiple_modal_box_dids', dids);
		dids_in_use = dids;
		send_update_locks(dids, true);
	} else {	
		var id = $(e.relatedTarget).data('id');
		var did = $(e.relatedTarget).data('did');
		
				$.ajax({type: 'GET',
						url: '/log_data?data=open_summarize_multiple_modal&did=' + did + '&type=' + type,
						success: function() {
						}
				});

		d = nodes_all[id-1];

		highlight_box(id);
		$('#summarize_multiple_modal_box').attr('summarize_multiple_modal_box_ids', [id]);
		$('#summarize_multiple_modal_box').attr('summarize_multiple_modal_box_dids', [did]);
		dids_in_use = [did];
		send_update_locks([did], true);

		if (type == "summarize") {
			var summaryClass = d.replace_node? "summary_box" : "";
			var summarized = d.summarized? "summarized" : "";
			var text = '<div id="sum_box_' + d.id + '" class="summarize_comment_comment ' + summaryClass + ' ' + summarized + '">';

			if (d.summary != '') {
				text += ' | <a class="btn-xs btn-edit" onclick="copy_summary(' + d.id + ');">Copy Entire Summary</a> | <a class="btn-xs btn-edit" onclick="cite_comment(' + d.d_id +');">Cite Comment</a></P><strong>Summary: </strong> ' + render_summary_node_edit(d) + '</div>';
			} else {
				text += ' | <a class="btn-xs btn-edit" onclick="cite_comment(' + d.d_id +');">Cite Comment</a></P>' + show_comment_text(d.name, d.d_id) + '<P>-- ' + d.author + '</P></div>';

				current_summarize_d_id.push(d.d_id);
			}

			text = get_subtree_summarize(text, d, 1);
			$('#summarize_multiple_comment_text').text('Summarize this comment and all replies (replaces them all).');
			tinymce.get('summarize_multiple_comment_textarea').setContent("");
		} else if (type == "edit_summarize") {

			show_replace_nodes(d.id);

			if (d.replace_node) {
				if (d.replace.length > 0) {
					var text = '';
					for (var i=0; i<d.replace.length; i++) {
						var summaryClass = d.replace[i].replace_node? "summary_box" : "";
						var summarized = d.replace[i].summarized? "summarized" : "";
						if (d.replace[i].summary != '') {
							text += '<div id="sum_box_' + d.replace[i].id + '" class="summarize_comment_comment ' + summaryClass + ' ' + summarized + '"><P>ID: ' + d.replace[i].d_id + ' | <a class="btn-xs btn-edit" onclick="copy_summary(' + d.replace[i].id + ');">Copy Entire Summary</a> | <a class="btn-xs btn-edit" onclick="cite_comment(' + d.replace[i].d_id +');">Cite Comment</a></P><strong>Summary: </strong> ' + render_summary_node_edit(d.replace[i]) + '</div>';
						} else {

							current_summarize_d_id.push(d.replace[i].d_id);

							text += '<div id="sum_box_' + d.replace[i].id + '" class="summarize_comment_comment ' + summaryClass + ' ' + summarized + '"><P>ID: ' + d.replace[i].d_id + ' | <a class="btn-xs btn-edit" onclick="cite_comment(' + d.replace[i].d_id +');">Cite Comment</a></P>' + show_comment_text(d.replace[i].name, d.replace[i].d_id)  + '<P>-- ' + d.replace[i].author + '</P></div>';
						}
						text = get_subtree_summarize(text, d.replace[i], 1);
					}

				} else if (d.children.length > 0) {
					var text = '';
					for (var i=0; i<d.children.length; i++) {
						var summaryClass = d.children[i].replace_node? "summary_box" : "";
						var summarized = d.children[i].summarized? "summarized" : "";
						if (d.children[i].summary != '') {
							text += '<div id="sum_box_' + d.children[i].id + '" class="summarize_comment_comment ' + summaryClass + ' ' + summarized + '"><P>ID: ' + d.children[i].d_id + ' | <a class="btn-xs btn-edit" onclick="copy_summary(' + d.children[i].id + ');">Copy Entire Summary</a> | <a class="btn-xs btn-edit" onclick="cite_comment(' + d.children[i].d_id +');">Cite Comment</a></P><strong>Summary: </strong> ' + render_summary_node_edit(d.children[i]) + '</div>';
						} else {

							current_summarize_d_id.push(d.children[i].d_id);

							text += '<div id="sum_box_' + d.children[i].id + '" class="summarize_comment_comment ' + summaryClass + ' ' + summarized + '"><P>ID: ' + d.children[i].d_id + ' | <a class="btn-xs btn-edit" onclick="cite_comment(' + d.children[i].d_id +');">Cite Comment</a></P>' + show_comment_text(d.children[i].name, d.children[i].d_id) + '<P>-- ' + d.children[i].author + '</P></div>';
						}
						text = get_subtree_summarize(text, d.children[i], 1);
					}
				}
			} else {
				var summaryClass = d.children[0].replace_node? "summary_box" : "";
				var summarized = d.children[0].summarized? "summarized" : "";
				var text = '<div id="sum_box_' + d.children[0].id + '" class="summarize_comment_comment ' + summaryClass + ' ' + summarized + '"><P>ID: ' + d.children[0].d_id + ' | <a class="btn-xs btn-edit" onclick="cite_comment(' + d.children[0].d_id +');">Cite Comment</a></P>' + show_comment_text(d.children[0].name, d.children[0].d_id) + '<P>-- ' + d.children[0].author + '</P></div>';

				current_summarize_d_id.push(d.children[0].d_id);

				text = get_subtree_summarize(text, d.children[0], 1);
			}

			if (d.extra_summary != '') {
				tinyMCE.activeEditor.setContent(d.summary + '\n----------\n' + d.extra_summary);
			} else {
				tinyMCE.activeEditor.setContent(d.summary);
			}

			$('#summarize_multiple_comment_text').text('Edit the summary for this entire subtree of comments.');
		}
	}


	highlight_check = localStorage.getItem('highlight_check');

	if (highlight_check == "true") {
		$('#summarize_multiple_highlight_button').html('<span class="button-checkbox"><button type="button" class="btn btn-xs" data-color="yellow">Highlight top sentences</button><input type="checkbox" class="hidden" checked /></span>');
	} else {
		$('#summarize_multiple_highlight_button').html('<span class="button-checkbox"><button type="button" class="btn btn-xs" data-color="yellow">Highlight top sentences</button><input type="checkbox" class="hidden" /></span>');
	}
	check_button_checkbox();


	text = '<div class="img-rounded" id="tooltip_sum2">Quote</div>' + text;

	$('#summarize_multiple_comment_box').html(text);
	
	$('#summarize_multiple_comment_box').wrap('<div/>')
        .css({'overflow':'hidden'})
          .parent()
            .css({'display':'inline-block',
                  'overflow':'hidden',
                  'height':function(){return $('.resizable',this).height();},
                  'width':  function(){return $('.resizable',this).width();},
                  'paddingBottom':'12px',
                  'paddingRight':'12px',
                  'border': '1px solid #000000',
                 }).resizable()
                    .find('.resizable')
                      .css({overflow:'auto',
                            width:'100%',
                            height:'100%'});

	$("#summarize_multiple_comment_box").off("mouseup");
	$("#summarize_multiple_comment_box").off("mousedown");


	$("#tooltip_sum2").off("click");


	$('#tooltip_sum2').mousedown(function(evt) {
		evt.stopPropagation();
	}).mouseup(function(evt) {
		evt.stopPropagation();
		insert_quote(highlighted_text, nodes_all[highlighted_comm - 1].d_id);
	});

	$('#summarize_multiple_comment_box').mouseup(function(evt) {
		clearTimeout(cancelClick2);
		if (!isClick2) {
			highlighted_text = window.getSelection().toString();
	   		if (highlighted_text.length > 10) {
	   			if (evt.target.parentNode.id.indexOf('sum_box') != -1) {
	   				highlighted_comm = parseInt(evt.target.parentNode.id.substring(8));
	   			} else {
	   				highlighted_comm = parseInt(evt.target.parentNode.parentNode.id.substring(8));
	   			}
	   			d = nodes_all[highlighted_comm-1];
	   			if (!d.replace_node && d.summary == '' && d.extra_summary == '') {
		   			var offset = $("#summarize_multiple_comment_box").offset();
		   			var scroll = $("#summarize_multiple_comment_box").scrollTop();
		   			$('#tooltip_sum2').css({'position': 'relative', 'top': (evt.pageY - offset.top + scroll) + 'px', 'left': evt.pageX - offset.left + 'px'});
		   			$('#tooltip_sum2').css('visibility','visible');
		   		}
	   		}
	 } else {
	  	$('#tooltip_sum2').css('visibility','hidden');
	  }
	  isClick2 = true;
	})
	.mousedown(function(evt) {
		cancelClick2 = setTimeout(is_click2, 250);
	});

	$('#summarize_multiple_modal_box form').off("submit")

	$('#summarize_multiple_modal_box form').submit({data_id: did, id: id, type: type, ids: ids, dids: dids}, function(evt) {
		evt.preventDefault();
		tinymce.triggerSave();

		var comment = tinyMCE.get('summarize_multiple_comment_textarea').getContent().trim();
		if (comment === '') {
			$('#empty_warning_multiple').text('Summary cannot be empty');
			return false;
		}
		$('#summarize_multiple_modal_box').modal('toggle');
		if (comment)
		var article_id = $('#article_id').text();
		var csrf = $('#csrf').text();
		var data = {csrfmiddlewaretoken: csrf,
			comment: comment,
			article: article_id,
			delete_nodes: delete_summary_nodes,
			delete_summary_node_dids: delete_summary_nodes,
		};

		if (evt.data.type == "summarize_selected") {
			document.body.style.cursor='wait';
			data.ids = evt.data.dids;
			var objs = [];
			$('.marker.outline-selected').each(function() {
				var data = nodes_all.filter(o => o.d_id == this.id.substring(7))[0];
				if (!data.article) {
					objs.push(data);
					if (data.depth < min_level) {
						min_level = data.depth;
					}
				}
			});

			children_dids = [];
			lowest_id = 50000;
			lowest_d = null;
			highest_id = -1;
			highest_d = null;
			size = 0;
			for (var i=0; i<objs.length; i++) {
				if (objs[i].depth == min_level) {
					children_dids.push(objs[i].d_id);
					if (objs[i].id < lowest_id) {
						lowest_id = objs[i].id;
						lowest_d = objs[i];
					}
					if (objs[i].id > highest_id) {
						highest_id = objs[i].id;
						highest_d = objs[i];
					}
					if (objs[i].size > size) {
						size = objs[i].size;
					}
				}
			}
			data.children = children_dids;
			data.first_selected = lowest_d.d_id;
			data.last_selected = highest_d.d_id;
			data.size = size;
			data.type = "summarize_selected"
			chatsock.send(JSON.stringify(data));
		} else if (evt.data.type == "summarize" || evt.data.type == "edit_summarize") {
			data.id = evt.data.data_id;
			data.node_id = evt.data.id;
			data.type = "summarize_comments";
			data.subtype = evt.data.type;
			chatsock.send(JSON.stringify(data));
		}

	});
});

function upvote_summary(did, id) {
	var csrf = $('#csrf').text();
	
	var data = {csrfmiddlewaretoken: csrf,
		id: did};
	$.ajax({
				type: 'POST',
				url: '/upvote_summary',
				data: data,
				success: function(res) {
					console.log(res);
					success_noty();
					if (res.success) {
						if (res.created) {
							var upvote = $('#' + id + '-up').text();
							upvote = parseInt(upvote);
							upvote += 1;
							$('#' + id + '-up').text(upvote);
						} else {
							if (res.change_vote) {
								var upvote = $('#' + id + '-up').text();
								upvote = parseInt(upvote);
								upvote += 1;
								$('#' + id + '-up').text(upvote);
								
								var downvote = $('#' + id + '-down').text();
								downvote = parseInt(downvote);
								downvote -= 1;
								$('#' + id + '-down').text(downvote);
							}
						}
						if (res.created || res.change_vote) {
							d = nodes_all[id -1];
							d.avg_rating = res.avg_rating;
                            d.rating = res.rating;
						}
					}
				},
				error: function() {
					error_noty();
				}
		});
}

function downvote_summary(did, id) {
	var csrf = $('#csrf').text();
	
	var data = {csrfmiddlewaretoken: csrf,
		id: did};
	$.ajax({
				type: 'POST',
				url: '/downvote_summary',
				data: data,
				success: function(res) {
					console.log(res);
					success_noty();
					if (res.success) {
						if (res.created) {
							var downvote = $('#' + id + '-down').text();
							downvote = parseInt(downvote);
							downvote += 1;
							$('#' + id + '-down').text(downvote);
						} else {
							if (res.change_vote) {
								var downvote = $('#' + id + '-down').text();
								downvote = parseInt(downvote);
								downvote += 1;
								$('#' + id + '-down').text(downvote);
								
								var upvote = $('#' + id + '-up').text();
								upvote = parseInt(upvote);
								upvote -= 1;
								$('#' + id + '-up').text(upvote);
							}
						}
						if (res.created || res.change_vote) {
							d = nodes_all[id -1];
							d.avg_rating = res.avg_rating;
                            d.rating = res.rating;
						}
					}
				},
				error: function() {
					success_noty();
					error_noty();
				}
		});
}

function show_viz_box_original(select_obj) {
	if (select_obj['normal'] != undefined) {
		var d_id = select_obj['normal'];
		var d = d_id === 'viewAll' ? nodes_all[0] : nodes_all.filter(o => o.d_id == d_id)[0];
		var outline_item = $('.outline-item#' + d_id);
		redOutlineBorder(outline_item);
		show_text(d);
	} else if (select_obj['ctrl'] != undefined) {
		// ctrl select
		var selected_dids = select_obj['ctrl'];
		if (selected_dids.length == 0) {
			var outline_item = $('.outline-item#viewAll');
			//redOutlineBorder(outline_item);
			show_text(nodes_all[0]);
		} else {
			// select outline view markers and text
			for (const d_id of selected_dids) {
	    		$('.outline-item#' + d_id).addClass('rb-red');	
				/* outline the circle */
				$('#marker-' + d_id).addClass('outline-selected');
		    }
		    // show corresponding comment boxes
			show_text('clicked');
		}
	} else {
		var outline_item = $('.outline-item#viewAll');
		//redOutlineBorder(outline_item);
		show_text(nodes_all[0]);
	}
}

// return either single d_id (normal select) or list of d_ids (ctrl select)
function currentOutlineBorder() {
	var selected = {'normal': undefined, 'ctrl': undefined};
	if ($('.outline-selected.list-group-line').length > 0) {
		var list_group_item = $('.outline-selected.list-group-line').first().closest('.list-group-item');
		if (list_group_item.length == 0) {
			selected['normal'] = 'viewAll';
			return selected;
		}
		var outline_item = $(list_group_item).find('.outline-item').first();
		selected['normal'] = outline_item.attr('id');
		return selected;
	} else {
		var selected_dids = [];
		$('.outline-selected.marker').each(function() {
    		selected_dids.push(this.id.substring(7));
		});
		selected['ctrl'] = selected_dids;
		return selected
	}
}

chatsock.onopen = function(message) {
	console.log("socket open");
	$('.freeze').removeClass('freeze');
};

chatsock.onmessage = function(message) {
    var res = JSON.parse(message.data);
	if (res.type === 'new_node' || res.type === 'reply_comment') {
		handle_channel_message(res);
	}
	else if (res.type === 'tag_one' || res.type === 'tag_selected') {
		handle_channel_tags(res);
	}
	else if (res.type === 'update_locks') {
		handle_channel_update_locks(res);
	}
	else if (res.type === 'update_drag_locks') {
		handle_channel_update_drag_locks(res);
	}
	else if (res.type === 'summarize_comment') {
		handle_channel_summarize_comment(res);
	}
	else if (res.type === 'summarize_selected') {
		handle_channel_summarize_selected(res);
	}
	else if (res.type === 'summarize_comments') {
		handle_channel_summarize_comments(res);
	}
	else if (res.type === 'move_comments') {
		handle_channel_move_comments(res);
	}
	else if (res.type == 'delete_tags') {
		handle_channel_delete_tags(res);
	}
	else if (res.type == 'hide_comment') {
		handle_channel_hide_comment(res);
	}
	else if (res.type === 'hide_comments') {
		handle_channel_hide_comments(res);
	}
	else if (res.type == 'hide_replies') {
		handle_channel_hide_replies(res);
	}
	else if (res.type == 'delete_comment_summary') {
		handle_channel_delete_comment_summary(res);
	}
};

chatsock.onerror = function(message) {
	console.log("Socket error");
	$('#viz').addClass('freeze');
	$('#box').addClass('freeze');
	if (message.data) {
		var res = JSON.parse(message.data);
		if ($("#owner").length && res.user === $("#owner")[0].innerHTML) error_noty();
	}
}


function handle_channel_message(res) {
	var currentHighlight = currentOutlineBorder();
	if (res.type === 'new_node') {
		if (res.comment === 'unauthorized') {
			unauthorized_noty();
		} else {
			new_d = {d_id: res.d_id,
				 name: res.comment,
				 summary: "",
				 last_updated: res.last_updated,
				 summarized: false,
				 extra_summary: "",
				 parent: nodes_all[0],
				 replace: [],
				 author: res.author,
				 tags: [],
				 collapsed: false,
				 replace_node: false,
				 hid: [],
				 depth: 1
				};
			insert_node_to_children(new_d, nodes_all[0]);
		}
	} else if (res.type === 'reply_comment') {
		if (res.comment === 'unauthorized') {
			unauthorized_noty();
		} else {
			d = nodes_all.filter(o => o.d_id == res.parent_did)[0];
			new_d = {d_id: res.d_id,
			          name: res.comment,
			          summary: "",
			          last_updated: res.last_updated,
			          summarized: false,
			          extra_summary: "",
			          parent: d,
			          replace: [],
			          author: res.author,
			          tags: [],
			          collapsed: false,
			          replace_node: false,
			          size: d.size,
			          hid: [],
			          depth: d.depth+1,
			          x: d.x,
			          x0: d.x0,
			          y: d.y,
			          y0: d.y0,
			         };
			expand(d);
			insert_node_to_children(new_d, d);
		}
	}
	if (res.type === 'reply_comment' || $('#next_page').length === 0) {
		update(new_d.parent);

		var text = construct_comment(new_d);
		$('#comment_' + new_d.d_id).html(text);
		$('#comment_' + new_d.id).attr('id', 'comment_' + new_d.id);
		//author_hover();

		if ($("#owner").length && res.user === $("#owner")[0].innerHTML) {
			show_text(nodes_all[0]);
			$("#box").scrollTo("#comment_" + new_d.id, 500);
			$('#comment_' + new_d.id)
			  .animate({borderColor:'red'}, 400)
			  .delay(400)
			  .animate({borderColor:'hsl(195, 59%, 85%)'}, 1000);
			highlight_box(new_d.d_id);
		} else {
			// show_text(nodes_all[0]);
			show_viz_box_original(currentHighlight);
		}

	}
	make_progress_bar();
	if ($("#owner").length && res.user === $("#owner")[0].innerHTML) success_noty();
}

function handle_channel_tags(res) {
	if (res.color) {
		var tag = res.tag;
		var did_str = res.did_str;
		if (res.type === 'tag_one') {
			d = nodes_all.filter(o => o.d_id == res.d_id)[0];
			d.tags.push([tag, res.color]);

			d_text = '';
			d_text2 = '';
			if (is_dark(res.color)) {
				d_text += '<button class="btn btn-xs" onclick="delete_tags(event,\'' + did_str + '\',\'' +tag + '\')" style="color: #FFFFFF; background-color: #' + res.color + '">' + tag + ' &nbsp;x </button> ';
				d_text2 += '<button class="btn btn-xs" style="color: #FFFFFF; background-color: #' + res.color + '">' + tag + '</button> ';
			} else {
				d_text += '<button class="btn btn-xs" onclick="delete_tags(event,\'' + did_str + '\',\'' +tag + '\')" style="background-color: #' + res.color + '">' + tag + ' &nbsp;x </button> ';
				d_text2 += '<button class="btn btn-xs" style="color: #FFFFFF; background-color: #' + res.color + '">' + tag + '</button> ';
			}

			text = $('#current_tags').html();
			if (text == "") {
				$('#current_tags').html('Current tags: ' + d_text);
			} else {
				$('#current_tags').append(d_text);
			}

			text = $('#tags_' + d.id).html();
			if (text == "") {
				$('#tags_' + d.id).html('Tags: ' + d_text2);
			} else {
				$('#tags_' + d.id).append(d_text2);
			}
		}
		else if (res.type === 'tag_selected') {
			var d_text = '';
			var d_text2 = '';
			if (is_dark(res.color)) {
				d_text += '<button class="btn btn-xs" onclick="delete_tags(event,\'' + did_str + '\',\'' + tag + '\')" style="color: #FFFFFF; background-color: #' + res.color + '">' + tag + ' &nbsp;x </button> ';
				d_text2 += '<button class="btn btn-xs" style="color: #FFFFFF; background-color: #' + res.color + '">' + tag + '</button> ';
			} else {
				d_text += '<button class="btn btn-xs" onclick="delete_tags(event,\'' + did_str + '\',\'' + tag + '\')" style="background-color: #' + res.color + '">' + tag + ' &nbsp;x </button> ';
				d_text2 += '<button class="btn btn-xs" style="color: #FFFFFF; background-color: #' + res.color + '">' + tag + '</button> ';
			}

			if ($('#current_tags').html() == "") {
				$('#current_tags').html('Current tags: ' + d_text);
			} else {
				$('#current_tags').append(d_text);
			}

			var list_dids = res.dids;
			var c;
			for (var i=0; i<list_dids.length; i++) {
				var tags2 = '' + d_text2;
				c = nodes_all.filter(o => o.d_id == list_dids[i])[0];
				c.tags.push([tag, res.color]);
				if ($('#tags_' + c.id).html() == "") {
					$('#tags_' + c.id).html('Tags: ' + tags2);
				} else {
					$('#tags_' + c.id).append(tags2);
				}
			}
		}
	}
	// Clear tag input
	$("input#tag-form").prop("value", "");
	if ($("#owner").length && res.user === $("#owner")[0].innerHTML) success_noty();
}

function handle_channel_update_locks(res) {
	let dids = res.ids;
	for (var i = 0; i < dids.length; i++) {
		// for each node to update, set it to the correct locking state
		let node = nodes_all.filter(o => o.d_id == dids[i])[0];
		if (node) {
			node.is_locked = res.to_lock;
		}
		let text = construct_comment(node);
		$('#comment_' + node.id).html(text);
	}
}

function handle_channel_summarize_comment(res) {
	var currentHighlight = currentOutlineBorder();
	if ($("#owner").length && res.user === $("#owner")[0].innerHTML) success_noty();

	d = nodes_all.filter(o => o.d_id == res.d_id)[0];
	let node_id = d.id;

	d.summary = res.top_summary;
	d.extra_summary = res.bottom_summary;
	
	if (article_url.indexOf('wikipedia.org') !== -1) {
		d.sumwiki = res.top_summary_wiki;
		d.extrasumwiki = res.bottom_summary_wiki;
	}

	var text = construct_comment(d);
	$('#comment_' + node_id).empty();
	$('#comment_' + node_id).html(text);
	//author_hover();
	
	d3.select("#node_" + d.id).style("fill",color);
	$('#comment_' + node_id).addClass("summary");

	if ($("#owner").length && res.user === $("#owner")[0].innerHTML) {
		show_text(nodes_all[0]);
		highlight_box(node_id);
	} else {
		// show_text(nodes_all[0]);
		show_viz_box_original(currentHighlight);
	}
	make_progress_bar();
}

function handle_channel_summarize_selected(res) {
	document.body.style.cursor='default';
	var currentHighlight = currentOutlineBorder();
	let children = [];
	let children_dids = res.children;
	for (var i = 0; i < children_dids.length; i++) {
		let child = nodes_all.filter(o => o.d_id == children_dids[i])[0];
		if (child) {
			children.push(child);
		}
	}
	let highest_d = nodes_all.filter(o => o.d_id == res.highest_d)[0];
	let position = highest_d.parent.children.indexOf(highest_d) - (children.length - 1);
	new_d = {d_id: res.d_id,
			 name: "",
			 summary: res.top_summary,
			 last_updated: res.last_updated,
			 summarized: true,
			 extra_summary: res.bottom_summary,
			 parent: highest_d.parent,
			 replace: children,
			 author: "",
			 tags: [],
			 collapsed: highest_d.parent.collapsed,
			 replace_node: true,
			 size: res.size,
			 depth: highest_d.depth,
			 x: highest_d.x,
			 x0: highest_d.x0,
			 y: highest_d.y,
			 y0: highest_d.y0,
			};
			
	if (article_url.indexOf('wikipedia.org') !== -1) {
		 new_d.sumwiki = res.top_summary_wiki;
		 new_d.extrasumwiki = res.bottom_summary_wiki;
	}

	mark_children_summarized(new_d);

	for (var d=0; d<children.length; d++) {
		for (var i=0; i<children[d].parent.children.length; i++) {
			if (children[d].parent.children[i] == children[d]) {
				children[d].parent.children.splice(i,1);
					break;
			}
		}
		children[d].parent = new_d;
	}

	delete_summary_nodes = res.delete_summary_node_dids;
	for (var i=0; i<delete_summary_nodes.length; i++) {
		let node = nodes_all.filter(o => o.d_id == delete_summary_nodes[i])[0];
		delete_summary_node(node.id);
	}

	delete_summary_nodes = [];
	delete_summary_node_ids = [];

	if (!new_d.collapsed) {
		if (new_d.children) {
			for (var i=0; i<new_d.children.length; i++) {
				cascade_collapses(new_d.children[i]);
			}
		}
		if (new_d.replace) {
			for (var i=0; i<new_d.replace.length; i++) {
				cascade_collapses(new_d.replace[i]);
			}
		}
	}
	insert_node_to_children(new_d, new_d.parent, position);
	update(new_d.parent);

	if ($("#owner").length && res.user === $("#owner")[0].innerHTML) {
		show_text(nodes_all[0]);
	} else {
		// show_text(nodes_all[0]);
		show_viz_box_original(currentHighlight);
	}

	var text = '<div class="comment_text" id="comment_text_' + new_d.id + '"><strong>Summary Node:</strong><BR>' + render_summary_node(new_d, false) + '</div>';
	text += `<footer align="right">`;
	if ($('#access_mode').attr('data-access') == "0") {
		text += `<a data-toggle="modal" data-backdrop="false" data-did="${new_d.id}" data-target="#reply_modal_box" data-id="${new_d.id}">Reply</a>
			<a `;
		if (new_d.is_locked) text += `class="disabled" `;
		text +=	`data-toggle="modal" data-backdrop="false" data-did="${new_d.id}" data-target="#summarize_multiple_modal_box" data-type="edit_summarize" data-id="${new_d.id}">Edit</a>
			<a data-toggle="modal" data-backdrop="false" data-target="#confirm_delete_modal_box" data-id="${new_d.id}" data-did="${new_d.d_id}">Delete</a>
			<a data-toggle="modal" data-backdrop="false" data-did="${new_d.d_id}" data-target="#evaluate_summary_modal_box" data-type="evaluate_summary" data-id="${new_d.id}">Evaluate</a>`;
	}

	else if ($('#access_mode').attr('data-access') == "1") {
		text += `<a data-toggle="modal" data-backdrop="false" data-did="${new_d.id}" data-target="#reply_modal_box" data-id="${new_d.id}">Reply</a>`;
	}

	else if ($('#access_mode').attr('data-access') == "2") {
		text += `<a `
		if (new_d.is_locked) text += `class="disabled" `;
		text +=	`data-toggle="modal" data-backdrop="false" data-did="${new_d.id}" data-target="#summarize_multiple_modal_box" data-type="edit_summarize" data-id="${new_d.id}">Edit</a>
			<a data-toggle="modal" data-backdrop="false" data-target="#confirm_delete_modal_box" data-id="${new_d.id}"  data-did="${new_d.d_id}">Delete</a>
			<a data-toggle="modal" data-backdrop="false" data-did="${new_d.d_id}" data-target="#evaluate_summary_modal_box" data-type="evaluate_summary" data-id="${new_d.id}">Evaluate</a>`;
	}
	text += render_subscribe_buttons(new_d.d_id, new_d.replace_node, !new_d.hiddennode);
	text += '</footer>';
	for (var i=0; i<children.length; i++) {
		if (children[i] == highest_d) {
			$('#comment_' + children[i].id).html(text);
			$('#comment_' + children[i].id).addClass('summary_box');
			$('#comment_' + children[i].id).attr('id', 'comment_' + new_d.id);
		} else {
			$('#comment_' + children[i].id).remove();
		}
	}
	clear_box_top();
	make_progress_bar();
}

function handle_channel_summarize_comments(res) {
	// need to make children 
	var currentHighlight = currentOutlineBorder();
	let d = nodes_all.filter(o => o.d_id == res.orig_did)[0];
	let position = d.parent.children.indexOf(d);

	if (res.subtype == "summarize") {

		new_d = {d_id: res.d_id,
			 name: "",
			 parent: d.parent,
			 summarized: true,
			 replace: [d],
			 tags: [],
			 last_updated: res.last_updated,
			 summary: res.top_summary,
			 extra_summary: res.bottom_summary,
			 author: "",
			 collapsed: d.parent.collapsed,
			 replace_node: true,
			 size: d.size,
			 depth: d.depth,
			 x: d.x,
			 x0: d.x0,
			 y: d.y,
			 y0: d.y0,
			};
		
		if (article_url.indexOf('wikipedia.org') !== -1) {
			 new_d.sumwiki = res.top_summary_wiki;
			 new_d.extrasumwiki = res.bottom_summary_wiki;
		}

		mark_children_summarized(new_d);

		for (var i=0; i<d.parent.children.length; i++) {
			if (d.parent.children[i] == d) {
				 d.parent.children.splice(i,1);
					break;
			}
		}

		d.parent = new_d;
		insert_node_to_children(new_d, new_d.parent, position);

		console.log(new_d.collapsed);
		if (!new_d.collapsed) {
			if (new_d.replace) {
				for (var i=0; i<new_d.replace.length; i++) {
					cascade_collapses(new_d.replace[i]);
				}
			}
			if (new_d.children) {
				for (var i=0; i<new_d.children.length; i++) {
					cascade_collapses(new_d.children[i]);
				}
			}
		}

		update(new_d.parent);

		d3.select("#node_" + new_d.id)
		.style("fill", color);

		$('#comment_' + d.id).addClass('summary_box');
		$('#comment_' + d.id).attr('id', 'comment_' + new_d.id);

		delete_children_boxes(new_d.replace[0]);

		d = new_d;
	}

	delete_summary_nodes = res.delete_summary_node_dids;
	for (var i=0; i<delete_summary_nodes.length; i++) {
		let node = nodes_all.filter(o => o.d_id == delete_summary_nodes[i])[0];
		delete_summary_node(node.id);
	}

	delete_summary_nodes = [];
	delete_summary_node_ids = [];

	d.summary = res.top_summary;
	d.extra_summary = res.bottom_summary;
	if (article_url.indexOf('wikipedia.org') !== -1) {
		 d.sumwiki = res.top_summary_wiki;
		 d.extrasumwiki = res.bottom_summary_wiki;
	}
	d.last_updated = res.last_updated;

	var text = '<div class="comment_text" id="comment_text_' + d.id + '"><strong>Summary Node:</strong><BR>' + render_summary_node(d, false) + '</div>';
	text += `<footer align="right">`;
	if ($('#access_mode').attr('data-access') == "0") {
		text += `<a data-toggle="modal" data-backdrop="false" data-did="${d.id}" data-target="#reply_modal_box" data-id="${d.id}">Reply</a>
			<a ` 
		if (d.is_locked) text += `class="disabled" `;
		text +=	`data-toggle="modal" data-backdrop="false" data-did="${d.d_id}" data-target="#summarize_multiple_modal_box" data-type="edit_summarize" data-id="${d.id}">Edit</a>
			<a data-toggle="modal" data-backdrop="false" data-target="#confirm_delete_modal_box" data-id="${d.id}" data-did="${d.d_id}">Delete</a>
			<a data-toggle="modal" data-backdrop="false" data-did="${d.d_id}" data-target="#evaluate_summary_modal_box" data-type="evaluate_summary" data-id="${d.id}">Evaluate</a>`;
	}

	else if ($('#access_mode').attr('data-access') == "1") {
		text += `<a data-toggle="modal" data-backdrop="false" data-did="${d.id}" data-target="#reply_modal_box" data-id="${d.id}">Reply</a>`;
	}

	else if ($('#access_mode').attr('data-access') == "2") {
		text += `<a ` 
		if (d.is_locked) text += `class="disabled" `;
		text +=	`data-toggle="modal" data-backdrop="false" data-did="${d.id}" data-target="#summarize_multiple_modal_box" data-type="edit_summarize" data-id="${d.id}">Edit</a>
			<a data-toggle="modal" data-backdrop="false" data-target="#confirm_delete_modal_box" data-id="${d.id}" data-did="${d.d_id}">Delete</a>
			<a data-toggle="modal" data-backdrop="false" data-did="${d.d_id}" data-target="#evaluate_summary_modal_box" data-type="evaluate_summary" data-id="${d.id}">Evaluate</a>`;
	}
	text += render_subscribe_buttons(d.d_id, d.replace_node, d.hiddennode);
	text += `</footer>`;

	$('#comment_' + d.id).html(text);

	nodes_all = update_nodes_all(nodes_all[0]);
	if (res.subtype == "edit_summarize") update(d.parent);

	if ($("#owner").length && res.user === $("#owner")[0].innerHTML) {
		highlight_box(d.id);
		show_text(nodes_all[0]);
		success_noty();
	} else {
		show_text(nodes_all[0]);
		show_viz_box_original(currentHighlight);
	}
	
	make_progress_bar();
	
}

function handle_channel_delete_tags(res) {
	var dids = res.dids;
	var tag = res.tag;
	console.log("delete tags");
	if (res.type === 'delete_tags') {
	    if ($("#owner").length && res.user === $("#owner")[0].innerHTML) success_noty();
		$('#current_tags').children().each(function(index, element) {
			var btn_text = $(this).text().trim().slice(0, -3);
			
			if (btn_text.trim() === tag) {
				$(this).remove();
			}
		});
		
		var list_dids = dids.split(',');
		var list_ids = list_dids.map(did => nodes_all.filter(o => o.d_id == did)[0].id.toString());
		
		for (var i=0; i<list_ids.length; i++) {
			if (list_ids[i].trim() != '') {
				var i_x = list_ids[i].trim();
				
				$('#tags_' + i_x).children().each(function(index, element) {
					var c = nodes_all[i_x -1];
					var index = -1;
					for (var i=0;i<c.tags.length;i++) {
						if (c.tags[i][0] === tag) {
							index = i;
						}
					}
					if (index > -1) {
						c.tags.splice(index, 1);
					}
					var btn_text = $(this).text().trim();
					if (btn_text === tag) {
						$(this).remove();
					}
				});
				if ($('#tags_' + i_x).text().trim() === "Tags:") {
					$('#tags_' + i_x).html('');
				}
			}
		}
	}
}

function find_nearest_summary(d) {
	if (d.article) {
		return null;
	}
	if (d.replace_node) {
		return d;
	}
	var current = d;
	var nearest_sum = null;
	while (current.parent && current.parent !== nodes_all[0]) {
		if (current.parent.replace_node) {
			nearest_sum = current.parent;
			break;
		}
		current = current.parent;
	}
	return nearest_sum;
}

function handle_channel_move_comments(res) {
	document.body.style.cursor='default';
	var currentHighlight = currentOutlineBorder();
	var dragItem, oldParent, newParent, prevSib;
	if (res.old_parent_id == 'article') {
		oldParent = nodes_all[0];
	}
	if (res.new_parent_id == 'article') {
		newParent = nodes_all[0];
	}
	for (var i=0; i < nodes_all.length; i++) {
		var did = nodes_all[i].d_id;
		if (did == res.node_id) {
			dragItem = nodes_all[i];
		}
		if (!oldParent && did == res.old_parent_id) {
			oldParent = nodes_all[i];
		}
		if (!newParent && did == res.new_parent_id) {
			newParent = nodes_all[i];
		}
		if (did == res.prev_sib_id) {
			prevSib = nodes_all[i];
		}
	}

	var index = -1;
	if (dragItem.parent.children && dragItem.parent.children.length){
		index = dragItem.parent.children.indexOf(dragItem);
		if (index > -1) {
	        dragItem.parent.children.splice(index, 1);
	    }
	} else if (dragItem.parent._children && dragItem.parent._children.length) {
		index = dragItem.parent._children.indexOf(dragItem);
		if (index > -1) {
	        dragItem.parent._children.splice(index, 1);
	    }
	} else if (dragItem.parent.replace && dragItem.parent.replace.length) {
		index = dragItem.parent.replace.indexOf(dragItem);
		if (index > -1) {
	        dragItem.parent.replace.splice(index, 1);
	    }
	}

    dragItem.parent = newParent;
	old_nearest_sum = find_nearest_summary(oldParent)
	new_nearest_sum = find_nearest_summary(newParent)
    if (!dragItem.replace_node && old_nearest_sum !== new_nearest_sum) {
    	mark_children_unsummarized(dragItem);
    }

    var notCollapsedSummary = !newParent.replace || (newParent.replace && !newParent.replace.length);
    var notCollapsedComment = !newParent._children || (newParent._children && !newParent._children.length);
    if (typeof newParent.children !== 'undefined' || typeof newParent._children !== 'undefined') {
        if (typeof newParent.children !== 'undefined' && notCollapsedComment && notCollapsedSummary) {
        	// check that the length of replace and _children are 0
        	insert_node_to_children(dragItem, newParent, res.position);
        } else if (newParent.replace_node) {
        	insert_node_to_replace(dragItem, newParent, res.position);
        } else {
        	insert_node_to_un_children(dragItem, newParent, res.position);
        }
    } else {
    	if (newParent.replace_node) {
    		insert_node_to_replace(dragItem, newParent, res.position);
    	} else {
    		newParent.children = [];
        	newParent.children.push(dragItem);
    	}
    }
    // Make sure that the node being added to is expanded so user can see added node is correctly moved
    //expand(newParent);

    dragItem.x0 = 0;
	dragItem.y0 = 0;
	update(oldParent);
	update(newParent);
	
	if ($("#owner").length && res.user === $("#owner")[0].innerHTML) {
		success_noty();
		show_text(newParent);
	} else {
		// show_text(nodes_all[0]);
		show_viz_box_original(currentHighlight);
	}
}

function handle_channel_update_drag_locks(res) {
	var currentHighlight = currentOutlineBorder();
	if (res.enable == 'enable' || parseInt(res.unique_user_id) == -1) {
		isSortable = true;
		update(nodes_all[0]);
		console.log("drag enabled");
		if (parseInt(res.unique_user_id) != unique_user_id) {
			show_viz_box_original(currentHighlight);
		} else {
			var new_parent_did = res.new_parent_did;
			var new_parent = nodes_all[0];
			if (new_parent_did != -1) {
				new_parent = nodes_all.filter(o => o.d_id == new_parent_did)[0];
			}
			show_text(new_parent);
		}
	} else {
		if (parseInt(res.unique_user_id) != unique_user_id) {
			isSortable = false;
			update(nodes_all[0]);
			console.log("drag disabled");
			show_viz_box_original(currentHighlight);
		}
	}
}

function handle_channel_delete_comment_summary(res) {
	let id = nodes_all.filter(o => o.d_id == res.d_id)[0].id;
	delete_comment_summary(id);
	if ($("#owner").length && res.user === $("#owner")[0].innerHTML) success_noty();
	make_progress_bar();
}

function handle_channel_hide_comment(res) {
	var currentHighlight = currentOutlineBorder();
	let d = nodes_all.filter(o => o.d_id == res.d_id)[0];
	let id = d.id;
	$('#comment_' + id).remove();
	delete_summary_node(id);
	if (!d.replace_node) hide_node(id);
	make_progress_bar();
	update(d.parent);
	if ($("#owner").length && res.user === $("#owner")[0].innerHTML) {
		success_noty();
		show_text(nodes_all[0]);
	} else {
		//show_text(nodes_all[0]);
		show_viz_box_original(currentHighlight);
	}
}

function handle_channel_hide_comments(res) {
	var currentHighlight = currentOutlineBorder();
	let dids = res.dids;
	for (var i = 0; i < dids.length; i++) {
		let id = nodes_all.filter(o => o.d_id == dids[i])[0].id;
		$('#comment_' + id).remove();
		hide_node(id);
	}
	make_progress_bar();
	update(nodes_all[0]);
	if ($("#owner").length && res.user === $("#owner")[0].innerHTML) {
		show_text(nodes_all[0]);
		success_noty();
	} else {
		// show_text(nodes_all[0]);
		show_viz_box_original(currentHighlight);
	}
}

function handle_channel_hide_replies(res) {
	var currentHighlight = currentOutlineBorder();

	let d = nodes_all.filter(o => o.d_id == res.d_id)[0];

	if (d.children) {
		ids = [];
		for (var i=0; i<d.children.length; i++) {
			ids.push(d.children[i].id);
		}
		for (var i=0; i<ids.length; i++) {
			$('#comment_' + ids[i]).remove();
			hide_node(ids[i]);
		}
	} else if (d._children) {
		ids = [];
		for (var i=0; i<d._children.length; i++) {
			ids.push(d._children[i].id);
		}
		for (var i=0; i<d._children.length; i++) {
			$('#comment_' + ids[i]).remove();
			hide_node(ids[i]);
		}
	}
	make_progress_bar();
	update(d);
	if ($("#owner").length && res.user === $("#owner")[0].innerHTML) {
		show_text(nodes_all[0]);
		success_noty();
	} else {
		// show_text(nodes_all[0]);
		show_viz_box_original(currentHighlight);
	}
}

function get_upvote_downvote(id) {
	d = nodes_all[id-1];
	var up = 0;
	var down = 0;
	
	console.log(d);
	
	if (d.rating) {
		for (var i=0; i<d.rating.length; i++) {
			if (d.rating[i] >= 3.0) {
				up += 1;
			} else {
				down += 1;
			}
		}
	}
	
	return {up: up, down: down};
	
}

function delete_comment_summary(id){
	d = nodes_all[id-1];
	d.summary = "";

	d3.select("#node_" + d.id).style("fill", color);
	$('#comment_'+id).removeClass("summary")
	$('#comment_'+id).empty();
	$('#comment_'+id).append(construct_comment(d));
	//author_hover();
}


function delete_summary_node(id) {

	$('#comment_' +id).remove();

	d = nodes_all[id-1];
	let position = d.parent.children.indexOf(d);

	if (d.replace_node) {
		parent = d.parent;

		console.log(d.collapsed);

		if (!d.collapsed) {
			if (d.children) {
				for (var i=0; i<d.children.length; i++) {
					cascade_undo_collapses(d.children[i]);
				}
			}
			if (d.replace) {
				for (var i=0; i<d.replace.length; i++) {
					cascade_undo_collapses(d.replace[i]);
				}
			}
		}

		//delete node from parent's children
		if (parent.children) {
			for (var i=0; i<parent.children.length; i++) {
				if (parent.children[i] == d) {
					parent.children.splice(i,1);
				}
			}

		} else {
			//delete node from parent's replace's
			if (parent.replace) {
				for (var i=0; i<parent.replace.length; i++) {
					if (parent.replace[i] == d) {
						parent.replace.splice(i,1);
					}
				}
			}
		}

		//change node's children's parent
		if (d.replace) {
			if (d.replace.length > 1) insert_nodelist_to_children(d.replace, parent, position);
			else if (d.replace.length == 1) insert_node_to_children(d.replace[0], parent, position);
		}
		if (d.children) {
			if (d.children.length > 1) insert_nodelist_to_children(d.children, parent, position);
			else if (d.children.length == 1) insert_node_to_children(d.children[0], parent, position);
		} else if (d._children) {
			if (d._children.length > 1) insert_nodelist_to_children(d._children, parent, position);
			else if (d._children.length == 1) insert_node_to_children(d._children[0], parent, position);
		}
	}

	update(d.parent);
}

function cascade_undo_collapses(d) {
	console.log(d.id);
	console.log('collapse false');
	d.collapsed = false;
	d.summarized = false;

	if (!d.replace_node) {
		d3.select("#node_" + d.id)
						.style("fill", color);
	}

	if (!d.replace_node) {
		if (d.children) {
			for (var i=0; i<d.children.length; i++) {
				cascade_undo_collapses(d.children[i]);
			}
		}
		if (d._children) {
			for (var i=0; i<d._children.length; i++) {
				cascade_undo_collapses(d._children[i]);
			}
		}
	}
}

function cascade_collapses(d) {
	console.log(d.id);
	console.log('collapse true');
	d.collapsed = true;
	d.summarized = true;

	if (!d.replace_node) {
		d3.select("#node_" + d.id)
						.style("fill", color);
	}

	if (!d.replace_node) {
		if (d.children) {
			for (var i=0; i<d.children.length; i++) {
				cascade_collapses(d.children[i]);
			}
		}
		if (d._children) {
			for (var i=0; i<d._children.length; i++) {
				cascade_collapses(d._children[i]);
			}
		}
	}
}

function insert_nodelist_to_children(node_list, node_parent, position = undefined) {
	added = false;
	if (!node_parent.children) {
		node_parent.children = [];
	}
	if (node_parent.children) {
		if (position !== undefined && position <= node_parent.children.length) {
			node_parent.children.splice(position, 0, ...node_list);
			added = true;
		}

		if (!added) {
			node_parent.children.concat(node_list);
		}

	}
}

function insert_node_to_children(node_insert, node_parent, position = undefined) {
	added = false;
	if (!node_parent.children) {
		node_parent.children = [];
	}
	if (node_parent.children) {
		if (position !== undefined && position <= node_parent.children.length) {
			node_parent.children.splice(position, 0, node_insert);
			added = true;
		}

		if (!added) {
			node_parent.children.push(node_insert);
		}

	} else if (node_parent.replace) {
		if (position !== undefined && position <= node_parent.replace.length) {
			node_parent.replace.splice(position, 0, node_insert);
			added = true;
		}

		if (!added) {
			node_parent.replace.push(node_insert);
		}
	}
}




function insert_node_to_un_children(node_insert, node_parent, position = undefined) {
	added = false;
	if (!node_parent._children) {
		node_parent._children = [];
	}
	if (node_parent._children) {
		if (position !== undefined && position <= node_parent._children.length) {
			node_parent._children.splice(position, 0, node_insert);
			added = true;
		}

		if (!added) {
			node_parent._children.push(node_insert);
		}

	}
}

function insert_node_to_replace(node_insert, node_parent, position = undefined) {
	added = false;
	if (!node_parent.replace) {
		node_parent.replace = [];
	}
	if (node_parent.replace) {
		if (position !== undefined && position <= node_parent.replace.length) {
			node_parent.replace.splice(position, 0, node_insert);
			added = true;
		}

		if (!added) {
			node_parent.replace.push(node_insert);
		}

	}
}

function get_subtree(text, d, level) {

	if (level <= 3) {
		var lvl = level;
	} else {
		var lvl = 3;
	}

	if (d.children) {
		for (var i=0; i<d.children.length; i++) {
			if (d.children[i].summary != '' || d.children[i].extra_summary != '') {
				if (d.children[i].replace_node) {
					text += '<div class="hide_comment_comment summary_box level' + lvl + '"><strong>Summary Node:</strong><BR>' + render_summary_node(d.children[i], false) + '</div>';
				} else {
					text += '<div class="hide_comment_comment level' + lvl + '"><strong>Summary:</strong> ' + render_summary_node(d.children[i], false) + '</div>';
				}
			} else {
				text += '<div class="hide_comment_comment level' + lvl + '">' + d.children[i].name + '</div>';
			}
			if (!d.children[i].replace_node) {
				text = get_subtree(text, d.children[i], level+1);
			}
		}
	} else if (d._children) {
		for (var i=0; i<d._children.length; i++) {
			if (d._children[i].summary != '' || d._children[i].extra_summary != '') {
				if (d._children[i].replace_node) {
					text += '<div class="hide_comment_comment summary_box level' + lvl + '"><strong>Summary Node:</strong><BR>' + render_summary_node(d._children[i], false) + '</div>';
				} else {
					text += '<div class="hide_comment_comment level' + lvl + '"><strong>Summary:</strong> ' + render_summary_node(d._children[i], false) + '</div>';
				}
			} else {
				text += '<div class="hide_comment_comment level' + lvl + '">' + d._children[i].name + '</div>';
			}
			if (!d._children[i].replace_node) {
				text = get_subtree(text, d._children[i], level+1);
			}
		}
	}

	return text;
}

function get_subtree_summarize(text, d, level, eval=false) {
	if (level <= 2) {
		var lvl = level;
	} else {
		var lvl = 2;
	}

	if (d.children) {
		for (var i=0; i<d.children.length; i++) {
			var summarized = d.children[i].summarized || d.children[i].summarized==undefined? "summarized" : "";
			if (d.children[i].summary != '' || d.children[i].extra_summary != '') {
				if (d.children[i].replace_node) {
					if (eval){
						console.log(d.children[i]);
						text += '<div id="sum_box_' + d.children[i].id + '" class="summary_box summarize_comment_comment level' + lvl + '"><P>ID: ' + d.children[i].d_id + '</P><strong>Summary Node:</strong><BR>' + render_summary_node_edit(d.children[i]) + '</div>';
					} else {
						text += '<div id="sum_box_' + d.children[i].id + '" class="summary_box summarize_comment_comment level' + lvl + '"><P>ID: ' + d.children[i].d_id + ' | <a class="btn-xs btn-edit" onclick="copy_summary_node(' + d.children[i].id + ');">Promote Summary</a> | <a class="btn-xs btn-edit" onclick="copy_summary(' + d.children[i].id + ');">Copy Summary</a> | <a class="btn-xs btn-edit" onclick="cite_comment(' + d.children[i].d_id +');">Cite Summary</a></P><strong>Summary Node:</strong><BR>' + render_summary_node_edit(d.children[i]) + '</div>';
					}
				} else {
					if (eval) {
						text += '<div id="sum_box_' + d.children[i].id + `" class="summarize_comment_comment ${summarized} level` + lvl + '"><P>ID: ' + d.children[i].d_id + '</P><strong>Summary: </strong> ' + render_summary_node_edit(d.children[i]) + '</div>';
					} else {
						text += '<div id="sum_box_' + d.children[i].id + `" class="summarize_comment_comment ${summarized} level` + lvl + '"><P>ID: ' + d.children[i].d_id + ' | <a class="btn-xs btn-edit" onclick="copy_summary(' + d.children[i].id + ');">Copy Entire Summary</a> | <a class="btn-xs btn-edit" onclick="cite_comment(' + d.children[i].d_id +');">Cite Comment</a></P><strong>Summary: </strong> ' + render_summary_node_edit(d.children[i]) + '</div>';
					}
				}
			} else {

				current_summarize_d_id.push(d.children[i].d_id);
				if (eval) {
					text += '<div id="sum_box_' + d.children[i].id + `" class="summarize_comment_comment ${summarized} level` + lvl + '"><P>ID: ' + d.children[i].d_id + '</P>' + show_comment_text(d.children[i].name, d.children[i].d_id) + '<P>-- ' + d.children[i].author + '</P></div>';
				} else {
					text += '<div id="sum_box_' + d.children[i].id + `" class="summarize_comment_comment ${summarized} level` + lvl + '"><P>ID: ' + d.children[i].d_id + ' | <a class="btn-xs btn-edit" onclick="cite_comment(' + d.children[i].d_id +');">Cite Comment</a></P>' + show_comment_text(d.children[i].name, d.children[i].d_id) + '<P>-- ' + d.children[i].author + '</P></div>';
				}
				
			}
			if (!d.children[i].replace_node) {
				text = get_subtree_summarize(text, d.children[i], level+1, eval);
			}
		}
	} else if (d._children) {
		var summarized = d._children[i].summarized || d._children[i].summarized==undefined? "summarized" : "";
		for (var i=0; i<d._children.length; i++) {
			if (d._children[i].summary != '' || d._children[i].summary != '') {
				if (d._children[i].replace_node) {
					if (eval) {
						text += '<div id="sum_box_' + d._children[i].id + '" class="summarize_comment_comment summary_box level' + lvl + '"><P>ID: ' + d._children[i].d_id + '</P><strong>Summary Node:</strong><BR>' + render_summary_node_edit(d._children[i]) + '</div>';
					} else {
						text += '<div id="sum_box_' + d._children[i].id + '" class="summarize_comment_comment summary_box level' + lvl + '"><P>ID: ' + d._children[i].d_id + ' | <a class="btn-xs" btn-edit onclick="copy_summary_node(' + d._children[i].id + ');">Promote Summary</a> | <a class="btn-xs" btn-edit onclick="copy_summary(' + d._children[i].id + ');">Copy Summary</a> | <a class="btn-xs btn-edit" onclick="cite_comment(' + d._children[i].d_id +');">Cite Summary</a></P><strong>Summary Node:</strong><BR>' + render_summary_node_edit(d._children[i]) + '</div>';
					}
					
				} else {
					if (eval) {
						text += '<div id="sum_box_' + d._children[i].id + `" class="summarize_comment_comment ${summarized} level` + lvl + '"><P>ID: ' + d._children[i].d_id + '</P><strong>Summary:</strong> ' + render_summary_node_edit(d._children[i]) + '</div>';
					} else {
						text += '<div id="sum_box_' + d._children[i].id + `" class="summarize_comment_comment ${summarized} level` + lvl + '"><P>ID: ' + d._children[i].d_id + ' | <a class="btn-xs btn-edit" onclick="copy_summary(' + d._children[i].id + ');">Copy Entire Summary</a> | <a class="btn-xs btn-edit" onclick="cite_comment(' + d._children[i].d_id +');">Cite Comment</a></P><strong>Summary:</strong> ' + render_summary_node_edit(d._children[i]) + '</div>';
					}
				}
			} else {

				current_summarize_d_id.push(d._children[i].d_id);
				if (eval) {
					text += '<div id="sum_box_' + d._children[i].id + `" class="summarize_comment_comment ${summarized} level` + lvl + '"><P>ID: ' + d._children[i].d_id + '<P>-- ' + d._children[i].author + '</P></div>';
				} else {
					text += '<div id="sum_box_' + d._children[i].id + `" class="summarize_comment_comment ${summarized} level` + lvl + '"><P>ID: ' + d._children[i].d_id + ' | <a class="btn-xs btn-edit" onclick="cite_comment(' + d._children[i].d_id +');">Cite Comment</a></P>' + show_comment_text(d._children[i].name, d._children[i].d_id) + '<P>-- ' + d._children[i].author + '</P></div>';
				}
				
			}
			text = get_subtree_summarize(text, d._children[i], level+1, eval);
		}
	}

	return text;
}

function find_child_did(d, d_id) {
	var was_hid = false;
	if (d._children) {
		d.children = d._children;
		d._children = null;
		was_hid = true;
	}
	var was_rep = false;
	if (d.replace.length != 0) {
		d.children = d.replace;
		d.replace = [];
		was_rep = true;
	}
	if (d.children) {
		for (var i=0; i<d.children.length; i++) {
			if (d.children[i].d_id == d_id) {
				return d.children[i];
			} else if (d.children[i].replace_node && d.children[i].summary.indexOf("[[comment_" + d_id + "]]") > -1) {
				return d.children[i];
			}
			val = find_child_did(d.children[i], d_id);
			if (val != null) return val;
		}
	}

	if (was_hid) {
		d._children = d.children;
		d.children = null;
	}
	if (was_rep) {
		d.replace = d.children;
		d.children = null;
	}

	return null;
}

$(document).on("click", "a.comment-reference", function(evt) {
	var d_id = this.dataset.refid;

	if (d_id) {
		evt.preventDefault();
		id = this.closest(".comment_box").id.slice(8); // assuming comment_\d+ id
		open_comment_hyperlink(id, d_id, this.dataset.refpara);
	}
})

function open_comment_hyperlink(id, d_id, para) {
	d3.selectAll('.clicked').classed("clicked", false);
  	unhighlight_all();

	show_replace_nodes(id);
	d = nodes_all[id-1];
	show_text(d);

	if (para && d.d_id == d_id) {
		toggle_original(d.id);

		$('#orig_' + d.id).find('p').eq(para).addClass('highlight');
		$("#box").scrollTo(".highlight", 500);

	} else {
		child = find_child_did(d, d_id);
		update(d);
		show_text(d);
		extra_highlight_node(child.id);
		highlight_box(child.id);

		if (para != 'undefined') {
			if ($('#comment_' + child.id).text().indexOf('Summary') > -1) {
				if (child.replace_node) {
					$('#comment_text_' + child.id).find('p').eq(para).addClass('highlight');
				} else {
					toggle_original(child.id);
					$('#orig_' + child.id).find('p').eq(para).addClass('highlight');
				}

			} else {
				$('#comment_text_' + child.id).find('p').eq(para).addClass('highlight');
			}
			$("#box").scrollTo(".highlight", 500);
		} else {
			$("#box").scrollTo("#comment_" + child.id, 500);
		}

		history.pushState(null, "", `#comment_${child.d_id}`)
	}
}

function load_permalink() {
	comment = location.hash;
	if (comment.length) {
		var did = comment.substring(9);
		if ($('.comment_box[data-did=' + did + ']').length) {
			$("#box").scrollTo('.comment_box[data-did=' + did + ']', 500);
		} else {
			if (nodes_all) {
				let d = nodes_all.filter(o => o.d_id == did)[0];
				show_text(nodes_all[0]);
				let parent = find_nearest_visible_parent(d);
				open_comment_hyperlink(parent.id, did);
			}
		}
	}
	else if (location.hash) {
		var d_id = (location.hash.match(/comment_(\d+)/) || [])[1];
	}
}

function find_nearest_visible_parent(d) {
	if ($('.comment_box[data-did=' + d.d_id + ']').is( ":visible" )) {
		return d;
	} else {
		if (d.parent !== undefined) {
			return find_nearest_visible_parent(d.parent);
		} else {
			return null;
		}
	}
}

$(window).bind("hashchange popstate", load_permalink);

// Make permalinks work when page is loaded
// if (location.hash) {
// 	$(load_permalink);
// }

// $(...).click() fails on d3 nodes
jQuery.fn.d3Click = function () {
	this.each(function () {
		this.dispatchEvent(new MouseEvent("click"));
	});
};

function copy_summary_quote() {
	node = $(event.target).parent()[0];
	var cite = $(event.target).parent().find(".comment-reference")[0];
	text = `[[comment_${cite.dataset.refid}` + (cite.dataset.para ? `_p${cite.dataset.para}` : "") + "]]";

	text = $(event.target).parent()[0].firstChild.textContent.replace(/\[\s*$/, "") + text;

	var regex = /Copy This/g;
	if (text.match(regex)) {
		subs = null;
		while (match = regex.exec(text)) {
			var index = match.index;
			subs = text.substring(index+10);
		}
		text = subs;
	}
//
	// var regex = / \| Cut & Paste This/g;
	// if (text.match(regex)) {
		// subs = null;
		// while (match = regex.exec(text)) {
			// var index = match.index;
			// subs = text.substring(0, index);
		// }
		// text = subs;
	// }

	text = text.trim();

	if (node.tagName == "BLOCKQUOTE") {
		text = '[quote]' + text + ' [endquote]';
	}

	var box = $('#' + activeBox + '_comment_textarea');
	var cursorPos = box.prop('selectionStart');
    var v = box.val();
    var textBefore = v.substring(0,  cursorPos );
    var textAfter  = v.substring( cursorPos, v.length );
    box.val( textBefore + text + '\n' + textAfter );
    copy_to_tinyMCE(text + '\n');
}

function render_summary_node_edit(d) {
	text = d.summary;

	if (d.extra_summary != '') {
		text += '\n\n----------\n';
		text += d.extra_summary;
	}

	if (d.replace_node) {
		var regex = /(?:\n\n)/g, result, indices = [];
		while ((result = regex.exec(text))) {
		     indices.push(result.index);
		}

		if (indices.length > 0) {
			for (var i=indices.length-1; i>=0; i--) {
				cite_text = '<BR><a class="btn-xs btn-edit" onclick="cite_para(' + d.d_id + ',' + i + ')">Cite Paragraph</a></span></P><P><span>';
				text = text.slice(0, indices[i]) + cite_text + text.slice(indices[i]);
			}
			text = text + '<BR><a class="btn-xs btn-edit" onclick="cite_para(' + d.d_id + ',' + indices.length + ')">Cite paragraph</a></span></P><P><span>';
		}
	} else {
		text = text.replace(/(?:\n\n)/g, '</P><P>');
	}


	text = '<P><span>' + text + '</span></P>';

	var matches = (text.match(/\]\]/g) || []).length;

	text = text.replace(/\[{2}comment_(\d+)(?:_p(\d+))?\]{2}/g, ($0, d_id, para) => {
		var id = get_id(d_id);
		var href = id? `href="#comment_${id}"` : "";
		var paraText = para === undefined? "" : ` §${para}`

		return `[<a ${href} class="comment-reference" data-refid="${d_id}" data-refpara="${para}">#${d_id}${paraText}</a>]` +
		(matches > 1? ' | <a class="btn-xs btn-edit" onclick="copy_summary_quote();">Copy This</a></span><span>' : "");
	});

	text = text.replace(/\[quote\]([\S\s]+?)\[endquote\]/gi, "<blockquote>$1</blockquote>");

	return text;
}

function copy_summary(id) {
	d = nodes_all[id - 1];
	text = d.summary;

	if (d.extra_summary != '') {
		text += '\n----------\n';
		text += d.extra_summary;
	}

	if (!d.replace_node) {
		if (text.indexOf('[[') == -1) {
			text += ' [[comment_' + d.d_id + ']]';
		}
	}

	var box = $('#' + activeBox + '_comment_textarea');
	var cursorPos = box.prop('selectionStart');
    var v = box.val();
    var textBefore = v.substring(0,  cursorPos );
    var textAfter  = v.substring( cursorPos, v.length );
    box.val( textBefore + text + '\n' + textAfter );

    copy_to_tinyMCE(text + '\n');

}

function undo_delete_summary(did, id) {
	for (var i = delete_summary_nodes.length - 1; i >= 0; i--) {
	    if(delete_summary_nodes[i] === did) {
	       delete_summary_nodes.splice(i, 1);
	       delete_summary_node_ids.splice(i, 1);
	    }
	}

	var html_str = $('#sum_box_' + id).html();
	var x = html_str.split('<br>');
	var str = html_str.substring(x[0].length + 4);
	$('#sum_box_' + id).html(str);
}

function copy_summary_node(id) {
	var d = nodes_all[id - 1];

	var html_str = $('#sum_box_' + id).html();

	if (html_str.indexOf("This summary will be removed at this location to be promoted.") == -1) {
		delete_summary_nodes.push(d.d_id);
		delete_summary_node_ids.push(d.id);
		html_str = '<strong style="color:red;">This summary will be removed at this location to be promoted.</strong> <a class="btn-xs btn-warning" onclick="undo_delete_summary(' + d.d_id + ',' + id + ');">Undo</a><BR>' + html_str;
	}

	$('#sum_box_' + id).html(html_str);

	if (d.extra_summary != '') {
		var text = d.summary + '\n----------\n' + d.extra_summary;
	} else {
		var text = d.summary;
	}


	var box = $('#' + activeBox + '_comment_textarea');
	var cursorPos = box.prop('selectionStart');
    var v = box.val();
    var textBefore = v.substring(0,  cursorPos );
    var textAfter  = v.substring( cursorPos, v.length );
    box.val( textBefore + text + '\n' + textAfter );

    copy_to_tinyMCE(text + '\n');

}

function get_d_id(id) {
	var haystack = nodes_all.filter(o => o.id == id)[0];
	return haystack? haystack.d_id : null;
}

function get_id(d_id) {
	var haystack = nodes_all.filter(o => o.d_id == d_id)[0];
	return haystack? haystack.id : null;
}

function render_summary_node(d, show_collapsible) {

	summary = d.summary.replace(/\n\n/g,'</p><p>');
	text = '<p>' + summary + '</p>';

	if (d.extra_summary != '') {
		if (!show_collapsible) {
			text += '<BR><a onclick="show_extra_summary(' + d.id + ');">Show summary below the fold</a>';
			text += '<BR><div class="extra_summary" id="extra_summary_' + d.id + '">' + d.extra_summary + '</div>';
		} else {
			text += '<BR>-------------------<BR>';
			text += '<BR>' + d.extra_summary + '</div>';
		}

	}

	text = text.replace(/\[{2}comment_(\d+)(?:_p(\d+))?\]{2}/g, ($0, d_id, para) => {
		var id = get_id(d_id);
		var href = id? `href="#comment_${id}"` : "";
		var paraText = para === undefined? "" : " §" + para.replace(/_p(\d+)/, "$1");
		return `[<a ${href} class="comment-reference" data-refid="${d_id}" data-refpara="${para}">#${d_id}${paraText}</a>]`
	});

	text = text.replace(/\[quote\]([\S\s]+?)\[endquote\]/gi, "<blockquote>$1</blockquote>");

	return text;

}

function show_extra_summary(id) {
	$('#extra_summary_' + id).toggle();
}

function copy_to_tinyMCE(new_content) {
	var tinyMCE_is_active = (typeof tinyMCE != "undefined") && tinyMCE.activeEditor && !tinyMCE.activeEditor.isHidden();
	if (tinyMCE_is_active) {
		var cursorPos = tinyMCE.activeEditor.selection.getBookmark();
		v = tinymce.get('summarize_multiple_comment_textarea').getContent();
	}
	if (tinyMCE_is_active) {
    	tinyMCE.activeEditor.selection.moveToBookmark(cursorPos);
    	tinyMCE.activeEditor.selection.setContent(new_content);
    }
}

function cite_comment(did) {
	var box = $('#' + activeBox + '_comment_textarea');
	var cursorPos = box.prop('selectionStart');
	var v = box.val();
    var textBefore = v.substring(0,  cursorPos );
    var textAfter  = v.substring( cursorPos, v.length );
    box.val( textBefore + '[[comment_' + did +']]\n' + textAfter );
    copy_to_tinyMCE('[[comment_' + did +']]\n');
}

function delete_children_boxes(node) {
	if (node.children) {
		for (var i=0; i<node.children.length; i++) {
			if (!node.summarized == false) {
				$('#comment_' + node.children[i].id).remove();
				delete_children_boxes(node.children[i]);
			}
		}
	}
}

function success_noty() {
	noty({
	    text: 'Your change is saved!',
	    layout: 'topCenter',
	    type: 'success',
	    timeout: 1500,
	    closeOnSelfClick: true,
        closeOnSelfOver: false,
	    animation: {
	        open: {height: 'toggle'},
	        close: {height: 'toggle'},
	        easing: 'swing',
	        speed: 500
	    }
	});
}

function error_noty() {
	noty({
	    text: 'Sorry, an error occurred.',
	    layout: 'topCenter',
	    type: 'error',
	    timeout: 1500,
	    closeOnSelfClick: true,
        closeOnSelfOver: false,
	    animation: {
	        open: {height: 'toggle'},
	        close: {height: 'toggle'},
	        easing: 'swing',
	        speed: 500
	    }
	});
}


function identical_noty() {
	noty({
	    text: 'Duplicate action occurred.',
	    layout: 'topCenter',
	    type: 'error',
	    timeout: 1500,
	    closeOnSelfClick: true,
        closeOnSelfOver: false,
	    animation: {
	        open: {height: 'toggle'},
	        close: {height: 'toggle'},
	        easing: 'swing',
	        speed: 500
	    }
	});
}

function unauthorized_noty() {
	noty({
	    text: 'You are unauthorized to perform that action.',
	    layout: 'topCenter',
	    type: 'error',
	    timeout: 1500,
	    closeOnSelfClick: true,
        closeOnSelfOver: false,
	    animation: {
	        open: {height: 'toggle'},
	        close: {height: 'toggle'},
	        easing: 'swing',
	        speed: 500
	    }
	});
}

function make_stats() {
	$.ajax({
			type: 'GET',
			url: '/get_stats?id=' + article_id + '&owner=' +owner,
			success: function(res) {
				var text = '<span style="background-color: rgb(66, 220, 163); display: block; color: #333; font-weight:bold;">Top Users:</span>';
				for (var i=0;i<res.authors.length;i++) {
					text += '<a href="/visualization_flags?id=' + article_id + '&owner=' + owner+ '&sort=' + sort + '&filter=User: ' + res.authors[i][0] +  '"><span style="padding-left: 5px; padding-right: 5px; color: #333;">' + res.authors[i][0] + ': ' + res.authors[i][1] + '</span></a>';
				}
				$('#user_stats').html(text);
				
				var text = '<span style="background-color: rgb(66, 220, 163); display: block; color: #333; font-weight:bold;">Top Tags:</span>';
				for (var i=0;i<res.tags.length;i++) {
					text += '<a href="/visualization_flags?id=' + article_id + '&owner=' + owner+ '&sort=' + sort + '&filter=Tag: ' + res.tags[i][0] +  '"><span style="padding-left: 5px; padding-right: 5px; color: #333;">' + res.tags[i][0] + ': ' + res.tags[i][1] + '</span></a>';
				}
				$('#tag_stats').html(text);
			}
	});
	
}

function make_filter() {
	text = '<div style="display: inline-block; width: 220px;" id="filter_typeahead"><input required class="typeahead form-control input-sm" id="inputFilter" placeholder="Filter by text, tag, or username"></div>';

	$('#filter').html(text);

	if (filter != '') {
		$('#inputFilter').val(filter);
		$('#inputFilter').css('background-color','yellow');
	}
	
	var tag_suggestions = new Bloodhound({
	  datumTokenizer: Bloodhound.tokenizers.whitespace,
	  queryTokenizer: Bloodhound.tokenizers.whitespace,
	  prefetch: {
	  	url:'/tags_and_authors?id=' + article_id + '&owner=' + owner,
	  	cache: false,
	  }
	});

	$('#filter_typeahead .typeahead').typeahead({
		hint: true,
		highlight: true,
		minLength: 1
	}, {
	  name: 'tags',
	  source: tag_suggestions
	});

	$('#inputFilter').keypress(function(e) {
	    if(e.which == 13) {
		    filter = $('#inputFilter').val();
	        window.location.href = '/visualization_flags?id=' + article_id + '&sort=' + sort + '&filter=' + filter + '&owner=' + owner;
	    }
	});
}

// function update_global_edit_perm() {
// 	var csrf = $('#csrf').text();
// 	var article_id = $('#article_id').text();
// 	// var perms = [];
//  //    $.each($("input[name='perms']:checked"), function(){            
//  //        perms.push($(this).val());
//  //    });
//     var edit_type = "";
//     if (perms.length == 2) {
//     	edit_type = "Publicly Editable and Commentable";
//     } else if (perms.length == 1) {
//     	if (perms[0] == "comment") {
//     		edit_type = "Publicly Commentable";
//     	} else {
//     		edit_type = "Publicly Editable";
//     	}
//     } else {
//     	// unchecking both defaults to Publicly Viewable
//     	edit_type = "Publicly Viewable";
//     	$("#global-perm-dropdown").html(edit_type + ' <span class="caret"></span>');
//     	// $('.public-edit-perms').hide();
//     }

// 	var data = {
// 		csrfmiddlewaretoken: csrf,
// 		access: edit_type,
// 		article: article_id,
// 		owner: owner,
// 		};
// 	$.ajax({
// 			type: 'POST',
// 			url: '/add_global_perm',
// 			data: data,
// 			success: function(res) {
// 				success_noty();
// 				$('#access_mode').text(edit_type + ' | Share');
// 				// no need to update access_level for the owner
// 				// only owner can change global perms
// 			},
// 			error: function() {
// 				error_noty();
// 			}
// 	});
// }

function add_global_perm(access) {
	var csrf = $('#csrf').text();
	var article_id = $('#article_id').text();
	
	var data = {
		csrfmiddlewaretoken: csrf,
		access: access,
		article: article_id,
		owner: owner,
		};

	$.ajax({
			type: 'POST',
			url: '/add_global_perm',
			data: data,
			success: function(res) {
				success_noty();
				// no need to update access_level for the owner
				// only owner can change global perms
				$('#access_mode').text(access + ' | Share');
			},
			error: function() {
				error_noty();
			}
	});
	
}

function add_user_perm(username, access, delete_perm, delete_row) {
	var csrf = $('#csrf').text();
	var article_id = $('#article_id').text();
	var data = {
		csrfmiddlewaretoken: csrf,
		username: username,
		access: access,
		article: article_id,
		owner: owner,
		delete_perm: delete_perm,
		};
	$.ajax({
			type: 'POST',
			url: '/add_user_perm',
			data: data,
			success: function(res) {
				success_noty();
				if (delete_perm) {
					delete_row.parent().parent().remove();
				}
				if (res.created) {
					var text = '<tr><td>' + username + '</td><td>';
					text += '<div class="btn-group"><button type="button" class="btn btn-default btn-xs dropdown-toggle" data-toggle="dropdown" aria-haspopup="true" aria-expanded="false">';
					text += access + '<span class="caret"></span></button>';
					text += '<ul class="dropdown-menu permission-menu"><li><a href="#">Full Edit and Comment Access</a></li>';
					text += '<li><a href="#">Comment Access</a></li>';
					text += '<li><a href="#">Edit Access</a></li>';
					text += '<li><a href="#">View Access</a></li></ul></div>';
					text += '<td><button type="button" class="btn btn-default btn-xs btn-success update_user_perm">Update</button>';
					text += '</td><td><button type="button" class="btn btn-default btn-xs btn-danger delete_user_perm">Delete</button></td></tr>';
					
					$('#user_perm_table > tbody:last-child').after(text);
					
					$(".permission-menu li a").click(function(){
						$(this).parent().parent().prev().html($(this).text() + ' <span class="caret"></span>');
				   });
				   
				   $('.update_user_perm').click(function(){
				   		var username = $(this).parent().prev().prev().first().html();
				   		var access = $("#access_mode").text().split("|")[0].trim();
				   		add_user_perm(username, access, false, null);
				   });
				   
				   $('.delete_user_perm').click(function(){
				   		var username = $(this).parent().prev().prev().prev().first().html();
				   		var access = $(this).parent().prev().prev().children().first().children().first().text();
				   		add_user_perm(username, access, true, $(this));
				   });
				   
				}
			},
			error: function() {
				error_noty();
			}
	});
}

function make_username_typeahead() {
	text = '<div style="display: inline-block; width: 200px;" id="user_typeahead"><input required class="typeahead form-control input-md" id="userFilter" placeholder="Type in a Wikum username"></div>';

	$('#username_typeahead').html(text);
	
	var user_suggestions = new Bloodhound({
	  datumTokenizer: Bloodhound.tokenizers.whitespace,
	  queryTokenizer: Bloodhound.tokenizers.whitespace,
	  prefetch: {
	  	url:'/users',
	  	cache: false,
	  }
	});


	$('#user_typeahead .typeahead').typeahead({
		hint: true,
		highlight: true,
		minLength: 1
	}, {
	  name: 'users',
	  source: user_suggestions
	});

	$('#userFilter').keypress(function(e) {
	    if(e.which == 13) {
		    filter = $('#userFilter').val();
	    }
	});
	
	  $("#global_perm li a").click(function(){
			$(this).parent().parent().prev().html($(this).text() + ' <span class="caret"></span>');
			add_global_perm($(this).text());
	   });
	
		$(".permission-menu li a").click(function(){
			$(this).parent().parent().prev().html($(this).text() + ' <span class="caret"></span>');
	   });

		// $(".public-edit-perms input").click(function(){
		// 	update_global_edit_perm();
		// });
	   
	   $('.update_user_perm').click(function(){
	   		var username = $(this).parent().prev().prev().first().html();
	   		var access = $(this).parent().prev().children().first().children().first().text();
	   		add_user_perm(username, access, false, null);
	   });
	   
	   $('.delete_user_perm').click(function(){
	   		var username = $(this).parent().prev().prev().prev().first().html();
	   		var access = $(this).parent().prev().prev().children().first().children().first().text();
	   		add_user_perm(username, access, true, $(this));
	   });
	   
	   $('#add_user_perm').click(function() {
	   		var username = $('#userFilter').val();
	   		var access = $('#add_user_perm').prev().children().first().text();
	   		add_user_perm(username, access, false, null);
	   		var find_username = $("#user_perm_table").find("td:contains('" + username + "')");
	   		if (find_username.length > 0) {
	   			var update_text = access;
		   		update_text += "<span class='caret'></span>";
				find_username.parent().children('td').eq(1).children().first().children().first().html(update_text);
	   		}
	   });
}

function make_highlight() {
	text = '<input type="text" class="form-control input-sm" id="inputHighlight" placeholder="Highlight text" style="display: inline; width: 125px; margin-right: 10px;">';
	text += '<span id="count_result"></span>';
	$('#node_highlight').html(text);

	$('#inputHighlight').keyup(function (e) {
	 	$('#box').unhighlight();
	  	for (var i=1; i<nodes_all.length; i++) {
	  		let did = nodes_all[i].d_id;
	  		$('#marker-' + did).removeClass('highlight');
		}

		$('#count_result').text('0');


	  	highlight_text = $('#inputHighlight').val();
	  	count = 0;
	  	if (highlight_text.length > 0) {
	  		var pattern = new RegExp('\\b' + highlight_text.toLowerCase() + '\\b');
		  	for (var i=1; i<nodes_all.length; i++) {
		  		text = nodes_all[i].name;
		  		if (pattern.test(text.toLowerCase())) {
		  			let did = nodes_all[i].d_id;
	  				$('#marker-' + did).addClass('highlight');
					count += 1;
		  		}
		  	}
		  	$('#box').highlight(highlight_text, { wordsOnly: true });

			$('#count_result').text(count);
			$('#inputHighlight').css('background-color','yellow');

		} else {
			$('#count_result').text('');
			$('#inputHighlight').css('background-color','transparent');
		}
	});
}

function getParameterByName(name, url) {
    if (!url) url = window.location.href;
    name = name.replace(/[\[\]]/g, "\\$&");
    var regex = new RegExp("[?&]" + name + "(=([^&#]*)|&|#|$)"),
        results = regex.exec(url);
    if (!results) return null;
    if (!results[2]) return '';
    return decodeURIComponent(results[2].replace(/\+/g, " "));
}

function dragstart(d) {
    if (d.article || d.parent_node) {
        return;
    }
    dragStarted = true;
    d3.event.sourceEvent.stopPropagation();
}


function collapse(d) {
	if (d.replace_node) {
		hide_replace_nodes(d.id);
	} else {
		collapse_node(d.id);
	}
}

function expand(d) {
	if (d.replace_node) {
		show_replace_nodes(d.id);
	} else {
		expand_node(d.id);
	}
}

function recurse_expand_all(d) {
	if (d.replace_node) {
		if (!d.children) {
			d.children = [];
		}
		for (var i=0; i<d.replace.length; i++) {
			d.children.push(d.replace[i]);
		}
		d.replace = [];
	}

	if (d._children) {
	    d.children = d._children;
	    d._children = null;
	 }

	if (d.children) {
		for (var i=0; i<d.children.length; i++) {
			recurse_expand_all(d.children[i]);
		}
	}
}

function expand_all(id) {
	d = nodes_all[id-1];
	recurse_expand_all(d);
	update(d);
	$('.outline-item#' + d.d_id).find("#down-arrow").remove();
	redOutlineBorder($('.outline-item#' + d.d_id));
	show_text(d);
}

function setSortables(disabled = false) {
	var edit_mode = $('#access_mode').attr('data-access') == "0" || $('#access_mode').attr('data-access') == "2";
	if (sort == 'default' && edit_mode && filter == '') {
		sortableList = [];
		var nestedSortables = document.getElementsByClassName("nested-sortable");
		// Loop through each nested sortable element
		for (var i = 0; i < nestedSortables.length; i++) {
			var markerlist = $(nestedSortables[i]).find('.marker');
			var is_hidden = false;
			if (markerlist.length) {
				is_hidden = $($(nestedSortables[i]).find('.marker')[0]).hasClass('m-hidden');
			}
			
			if (nestedSortables[i].id !== 'nestedOutline' && is_hidden == false) {
				var sortableItem = new Sortable(nestedSortables[i], {
					group: 'nested',
					direction: 'vertical',
					animation: 150,
					disabled: disabled,
					fallbackOnBody: true,
					swapThreshold: 0.65,
					onStart: function (evt) {
						$('#expand').hide();
						send_update_drag_locks(true, -1);
					},
					// onMove: function (evt) {
					// 	$('.outline-item').hover(
					// 		  function() {
					// 		    var did = this.id;
					// 		    extra_highlight_node(did, id);
					// 		    setTimeoutConst = setTimeout(function() {
					// 				$('#viz').scrollTo('#outline-text-' + did, 500, {axis: 'y'});
					// 			}, delay);
					// 		  }, function() {
					// 		    var did = parseInt(this.dataset.did);
					// 		    var id = parseInt(this.id.substring(8));
					// 		    unextra_highlight_node(did, id);
					// 		    clearTimeout(setTimeoutConst);
					// 		  }
					// 	);
					// },
					onEnd: function (evt) {
				        var dragItem, newParent;
				        let outlineItem = $(evt.item).find('.outline-item').get(0);
				        var siblingBefore = $(outlineItem).closest('.list-countainer').prev('.list-countainer').find('.outline-item').get(0);
				        var siblingAfter = $(outlineItem).closest('.list-countainer').next('.list-countainer').find('.outline-item').get(0);
				        if (outlineItem) dragItem = nodes_all.filter(o => o.d_id == outlineItem.id)[0];
				        let ns = $(evt.to).closest('.nested-sortable');
				        let outlineParent = ns.parent().find('.outline-item').get(0);
				        if (outlineParent) {
				        	if (outlineParent.id === 'viewAll') {
				        		newParent = nodes_all[0];
				        	} else {
				        		newParent = nodes_all.filter(o => o.d_id == outlineParent.id)[0];
				        	}
				        }
				        var itemMoved = !(evt.to === evt.from && evt.oldIndex === evt.newIndex);
				        if (dragItem && newParent && itemMoved) {
				        	save_node_position(dragItem, newParent, siblingBefore, siblingAfter, evt.newIndex);
				        }
				        // update(draggingNode.parent);
				        let newParentId = newParent == nodes_all[0]? -1 : newParent.d_id;
				        send_update_drag_locks(false, newParentId);
				    }
				});
				sortableList.push(sortableItem);
			}
		}
	}
}

function save_node_position(dragItem, newParent, siblingBefore, siblingAfter, position) {

	var csrf = $('#csrf').text();
	data = {csrfmiddlewaretoken: csrf,
			node: dragItem.d_id,
			type: 'move_comments',
			position: position};
	if (newParent.article) {
		data.new_parent = 'article';
	} else {
		data.new_parent = newParent.d_id;
	}
	if (siblingBefore) {
		data.sibling_before = siblingBefore.id;
	} else {
		data.sibling_before = 'None';
	}

	if (siblingAfter) {
		data.sibling_after = siblingAfter.id;
	} else {
		data.sibling_after = 'None';
	}

	if ([data.new_parent.toString(), data.sibling_before.toString(), data.sibling_after.toString()].includes(dragItem.d_id.toString())) {
		console.log("problematic drag");
		return;
	}

	document.body.style.cursor='wait';

	chatsock.send(JSON.stringify(data));
}

function count_children(d) {
	if (d.children) {
		total = 1;
		for (var i=0; i<d.children.length; i++) {
			total += count_children(d.children[i]);
		}
		return total;
	} else {
		return 1;
	}
}

function check_clicked_node(d, clicked_ids) {
	if (clicked_ids.indexOf(d.id) == -1) {
		return false;
	}

	if (d.children) {
		children_clicked = true;
		for (var i=0; i<d.children.length; i++) {
			children_clicked = children_clicked && check_clicked_node(d.children[i], clicked_ids);
		}
		return children_clicked;
	}
	return true;
}

function getState(d) {
	if (filter == '') {
		var state = 'unsum_comment';
		if (d.replace_node) {
			if (has_unsummarized_children(d)) {
				state = 'summary_partial';
			} else {
				state = 'summary';
			}
		} else if (d.hiddennode) {
			state = 'hidden';
		} else if (d.collapsed) {
			state = 'sum_comment';
			if (d.summarized!=null && !d.summarized) {
				state = 'unsum_comment';
			}
		}
	} else {
		var state = 'gray';
		if (filterMatch(d)) {
			state = 'highlighted';
		}
	}
	return state;
}

function stripHtml(text) {
	var stripped = text.replace(/<[^>]*>?/gm, '');
	stripped = stripped.replace(/\"/g, "");
	return stripped.replace('[quote]','');
}

function shorten(text, max_length) {
  if (text.length <= max_length) return text;
  if (text.lastIndexOf(' ', max_length) == -1) {
  	return text.substr(0, max_length);
  } else {
  	return text.substr(0, text.lastIndexOf(' ', max_length));
  }
}

function setMaxLength(depth) {
	return Math.max(50 - depth * 5, 20);
}

function filterMatch(d) {
	if (filter.substring(0, 4) == 'Tag:') {
		var d_tags = d.tags.map(tag => tag[0]);
		if (d_tags.includes(filter.substring(5))) {
			return true;
		}
	} else if (filter.substring(0, 5) == 'User:') {
		if (d.author == filter.substring(6)) {
			return true
		}
	} else {
		if (d.name.includes(filter)) {
			return true;
		}
	}
	return false;
}

function createOutlineInsideString(d, outline='', depth=0, shouldExpand=false) {
	/** type (for coloring):
	  *  comment = normal comment
	  *  unsum = unsummarized comment under a summary node
	  *	 summary = summary
	  *  psum = partially summarized comment
	  */
	var noArrow = !shouldExpand;
	if (noArrow) {
		outline += `<div class="list-group nested-sortable">`;
	}
	if (d.children && d.children.length) {
		for (var i=0; i<d.children.length; i++) {
			var node = d.children[i];
			var maxLength = setMaxLength(depth);
			if (node.depth) maxLength = setMaxLength(node.depth - 1);
			let title = node.summary? shorten(stripHtml(node.summary), maxLength) : shorten(stripHtml(node.name), maxLength);
			let state = getState(node);
			outline += `<div class="list-countainer">`;
				outline += `<div class="list-group-line" id="line-${node.d_id}"> </div>`;
				outline += `<div class="list-group-item">`
						+ `<div class="outline-item" id=${node.d_id}>`
						+ `<span class="marker m-${state}" id="marker-${node.d_id}" `;
				if (colorby == "user" && (state == 'unsum_comment' || state == 'sum_comment')) {
					var userColor = '#cccccc';
					if (node.author && node.author != "Anonymous") {
						userColor = stringToColour(node.author);
					}
					outline += `style="background-color:${userColor};"`;
				}
				var not_read = '';
				if (read_list.length > 0 && $("#owner").length > 0) {
					not_read = (read_list.indexOf(node.d_id.toString()) >= 0 || $("#owner")[0].innerHTML == node.author)? '' : 'comment-unread';
				}
				outline	+= `></span>`
						+ `<span class="${not_read} outline-text t-${state}" id="outline-text-${node.d_id}">`
						+ title + `</span>`;
				var shouldExpand = ((state === 'summary' || state === 'summary_partial') && node.replace && node.replace.length) || (node._children && node._children.length);
				if (shouldExpand) {
					outline += '<span id="down-arrow">&#9660</span>';
				}
				outline += `</div>`;
				outline += createOutlineInsideString(d.children[i], '', depth+1, shouldExpand);
				outline += `</div>`;
			outline += `</div>`;
		}
	}
	if (noArrow) outline += `</div>`;
	return outline
}

function createOutlineString(d) {
	var title = $('#wikum-title').clone().children().remove().end().text();
	var outlineString = '<div id="nestedOutline" class="list-group col nested-sortable">';
	outlineString += `<div id='viewAll' class='outline-title outline-item'><div class='outline-title' id='outline-text-viewAll'>${title}`;
	outlineString += `</div></div>`;
	outlineString += createOutlineInsideString(d);
	outlineString += '</div>';
	return outlineString;
}

function recurse_update_nodes_all(d, parent=undefined, all_children=[], depth=0) {
	if (d.parent) d.parent = parent;
	d.depth = depth;
	all_children.push(d);
	if (d.replace_node && d.replace) {
		for (var i=0; i<d.replace.length; i++) {
			recurse_update_nodes_all(d.replace[i], d, all_children, depth + 1);
		}
	}
	if (d.children) {
		for (var i=0; i<d.children.length; i++) {
			recurse_update_nodes_all(d.children[i], d, all_children, depth + 1);
		}
	}
	if (d._children) {
		for (var i=0; i<d._children.length; i++) {
			recurse_update_nodes_all(d._children[i], d, all_children, depth + 1);
		}
	}
	return all_children;
}

function update_ids(nodes_all) {
	let counter = 0;
	nodes_all = nodes_all.map(function (node) {
		counter += 1;
		node['id'] = counter;
		return node;
	});
	return nodes_all;
}

function update_nodes_all(d, depth=0) {
	var nodes_all = recurse_update_nodes_all(d, depth=depth);
	for (var i = 1; i < nodes_all.length; i++) {
		if (!nodes_all[i].parent) {
			nodes_all[i].parent = nodes_all[0];
		}
	}
	nodes_all = update_ids(nodes_all);
	return nodes_all;
}

/**
 * Updates the outline view
 * Replace with the following update() to return to d3 node view
 */
function update(d) {
	// Replace element and all of its children with updated version in the outline view
	// (should be in correct order for update(some_parent) b/c of insert_node_to_children)
	var outline_item;
	if (d.article) {
		outline_item = $('.outline-item#viewAll');
	} else {
		outline_item = $('.outline-item#' + d.d_id);
	}
	let children = $(outline_item).next();
	let state = getState(d);
	var shouldExpand = ((state === 'summary' || state === 'summary_partial') && d.replace && d.replace.length) || (d._children && d._children.length);
	var inside_string = createOutlineInsideString(d, '', d.depth, shouldExpand);
	if (children && children.length) {
		children_group = children[0];
		$(children_group).replaceWith(inside_string);
	} else {
		// no children, need to create
		if ($(outline_item).parent() && $(outline_item).parent().length) {
			$($(outline_item).parent().get(0)).append(inside_string);
		}
	}
	$('#marker-' + d.d_id).removeClass();
	$('#marker-' + d.d_id).addClass('marker m-' + state);
	nodes_all = update_nodes_all(nodes_all[0]);
	if (typeof isSortable == 'undefined') isSortable = !nodes_all[0].drag_locked;
	setSortables(!isSortable);
}

function is_click() {
	isClick = false;
}

function is_click2() {
	isClick2 = false;
}

function hide_node(id) {
	d = nodes_all[id-1];
	parent = d.parent;

	// add to hidden list
	parent.hid.push(d);

	// remove from children list
	if (parent.children) {
		index = parent.children.indexOf(d);
		if (index > -1) {
			parent.children.splice(index, 1);
		}
		if (parent.children.length == 0) {
			delete parent.children;
		}
	}

	// remove from _children list
	if (parent._children) {
		index = parent._children.indexOf(d);
		if (index > -1) {
			parent._children.splice(index, 1);
		}
		if (parent._children.length == 0) {
			delete parent._children;
		}
	}

	// d3.select('#node_' + parent.id).style('fill', color);
	return null;
}

function recurse_hide_node(d) {
	if (d.children) {
		for (var i=0; i<d.children.length; i++) {
			$('#comment_' + d.children[i].id).remove();
			recurse_hide_node(d.children[i]);
		}
	}
}

// Toggle children on click.
function click_node(id) {
  d = nodes_all[id-1];

  if (d.children) {
	recurse_hide_node(d);
    d._children = d.children;
    d.children = null;
  } else {
    d.children = d._children;
    d._children = null;
  }

  update(d);
  return null;
}

function collapse_recurs(d) {
	if (d.children) {
	    d._children = d.children;
	    d.children = null;
	  }
	if (d._children) {
		for (var i=0; i<d._children.length; i++) {
			collapse_recurs(d._children[i]);
		}
	}
}

function expand_recurs(d) {
	if (d._children) {
	    d.children = d._children;
	    d._children = null;
	  }
	if (d.children && d.children.length) {
		for (var i=0; i<d.children.length; i++) {
			expand_recurs(d.children[i]);
		}
		return true;
	}
	return false;
}


function collapse_node(id) {
	var d = nodes_all[id-1];
	if (d._children) {
	    d.children = d._children;
	    d._children = null;
	}
	if (d.children && d.children.length) {
		collapse_recurs(d);
		var outlineItem = '.outline-item#' + d.d_id;
		if (!$(outlineItem).find('#down-arrow').length) $(outlineItem).append('<span id="down-arrow">&#9660</span>');
		update(d);
		show_text(d);
	}
}


function expand_node(id) {
	var d = nodes_all[id-1];
	var updated = expand_recurs(d);
	if (updated) {
		update(d);
		$('.outline-item#' + d.d_id).find("#down-arrow").remove();
		redOutlineBorder($('.outline-item#' + d.d_id));
		show_text(d);
	}
}


function toggle_original(id) {
	$('#orig_' + id).toggle();
}

function subscribe_edit(did, is_replace_node, not_hidden) {
	subscribe_edit_comments.push(did.toString());
	var csrf = $('#csrf').text();
	var data = {csrfmiddlewaretoken: csrf,
				id: did};
	$.ajax({
		type: 'POST',
		url: '/subscribe_comment_edit',
		data: data,
		success: function(res) {
			$('#subscribe-buttons-' + did).html(render_subscribe_buttons(did, is_replace_node, not_hidden));
		}
	});
}

function subscribe_replies(did, is_replace_node, not_hidden) {
	subscribe_replies_comments.push(did.toString());
	var csrf = $('#csrf').text();
	var data = {csrfmiddlewaretoken: csrf,
				id: did};
	$.ajax({
		type: 'POST',
		url: '/subscribe_comment_replies',
		data: data,
		success: function(res) {
			$('#subscribe-buttons-' + did).html(render_subscribe_buttons(did, is_replace_node, not_hidden));
		}
	});
}

function unsubscribe_edit(did, is_replace_node, not_hidden) {
	const index = subscribe_edit_comments.indexOf(did.toString());
	if (index > -1) {
		subscribe_edit_comments.splice(index, 1);
	}
	var csrf = $('#csrf').text();
	var data = {csrfmiddlewaretoken: csrf,
				id: did};
	$.ajax({
		type: 'POST',
		url: '/unsubscribe_comment_edit',
		data: data,
		success: function(res) {
			$('#subscribe-buttons-' + did).html(render_subscribe_buttons(did, is_replace_node, not_hidden));
		}
	});
}

function unsubscribe_replies(did, is_replace_node, not_hidden) {
	const index = subscribe_replies_comments.indexOf(did.toString());
	if (index > -1) {
		subscribe_replies_comments.splice(index, 1);
	}
	var csrf = $('#csrf').text();
	var data = {csrfmiddlewaretoken: csrf,
				id: did};
	$.ajax({
		type: 'POST',
		url: '/unsubscribe_comment_replies',
		data: data,
		success: function(res) {
			$('#subscribe-buttons-' + did).html(render_subscribe_buttons(did, is_replace_node, not_hidden));
		}
	});
}

function render_subscribe_buttons(did, is_replace_node, not_hidden) {
	var logged_in = $("#owner").length > 0;
	if (!not_hidden) return '';
	var text = '<span id="subscribe-buttons-' + did + '">';
	var is_sub_replies = false;
	var is_sub_edits = false;
	if (subscribe_replies_comments.indexOf(did.toString()) > -1) is_sub_replies = true;
	if (is_replace_node && subscribe_edit_comments.indexOf(did.toString()) > -1) is_sub_edits = true;
	if (logged_in) {
		if (is_replace_node) {
			if (is_sub_edits) {
				text += `<a onclick="unsubscribe_edit(${did}, ${is_replace_node}, ${not_hidden});">Unsubscribe To Edits</a>`;
			} else {
				text += `<a onclick="subscribe_edit(${did}, ${is_replace_node}, ${not_hidden});">Subscribe To Edits</a>`;
			}
		}
		if (is_sub_replies) {
			text += `<a onclick="unsubscribe_replies(${did}, ${is_replace_node}, ${not_hidden});">Unsubscribe To Replies</a>`;
		} else {
			text += `<a onclick="subscribe_replies(${did}, ${is_replace_node}, ${not_hidden});">Subscribe To Replies</a>`;
		}
	}
	text += '</span>';
	return text;
}

function format_time(time_string) {
	var date = new Date(time_string.replace(/['"]+/g, ''));
	var hours = date.getHours();
	var minutes = date.getMinutes();
	var ampm = hours >= 12 ? 'pm' : 'am';
	hours = hours % 12;
	hours = hours ? hours : 12; // the hour '0' should be '12'
	minutes = minutes < 10 ? '0'+minutes : minutes;
	var strTime = hours + ':' + minutes + ' ' + ampm;
	return (date.getMonth()+1) + "/" + date.getDate() + "/" + date.getFullYear() + "  " + strTime;
}

function construct_comment(d) {
	var text = "";
	var summary = !!(d.summary != '' || d.extra_summary != '');

	text += `<div class="comment_text" id="comment_text_${d.id}">`;
	text += `<span class="id_val">`;
	var formatted_time = '';
	if (d.last_updated) formatted_time = format_time(d.last_updated);
	text += `<span class="time_created">${formatted_time}</span>`;

	if (summary) {
		if (d.replace_node) {
			text += `Summary`;
		} else {
			text += `Summary`;
			text += ` of Comment by `;

			highlight_authors = $('#highlight_authors').text().split(',');

			if (highlight_authors.indexOf(d.author) > -1) {
				text += `<span class="author" style="background-color: pink;">${d.author}</span>`;
			} else {
				text += `<span class="author">${d.author}</span>`;
			}
			if (d.size > 0) {
				text += ` (${d.size} `;
				if (d.size == 1) {
					text += `like)`;
				} else {
					text += `likes)`;
				}
			}
		}
		
		text += ` #${d.d_id}</span><span id="flags-${d.id}" class="flags">`;
		var found = false;
		if (d.rating_flag) {
			if (d.rating_flag.neutral != 3) {
				found = true;
			}
			if (d.rating_flag.neutral == 1) {
	      		text += `<div class="red-flag"><img src="/static/website/img/alarm.png" width=13> Inserted Bias (major)</div>`;
	      	} else if (d.rating_flag.neutral == 2) {
	      		text += `<div class="red-flag"><img src="/static/website/img/warning.png" width=13> Inserted Bias (minor)</div>`;
	      	} else if (d.rating_flag.neutral == 4) {
	      		text += `<div class="green-flag"><img src="/static/website/img/silver.png" width=15> Neutral POV (good)</div>`;
	      	} else if (d.rating_flag.neutral == 5) {
	      		text += `<div class="green-flag"><img src="/static/website/img/gold.png" width=9  style="margin-left: 2px;"> Neutral POV (great)</div>`;
	      	}
	      
	      	if (found && d.rating_flag.coverage != 3) {
	      		text += `<br>`;
	      	} else if (d.rating_flag.coverage != 3) {
	      		found = true;
	      	}
	      	if (d.rating_flag.coverage == 1) {
	      		text += `<div class="red-flag"><img src="/static/website/img/alarm.png" width=13> Incomplete (major) </div>`;
	      	} else if (d.rating_flag.coverage == 2) {
	      		text += `<div class="red-flag"><img src="/static/website/img/warning.png" width=13> Incomplete (minor)</div>`;
	      	} else if (d.rating_flag.coverage == 4) {
	      		text += `<div class="green-flag"><img src="/static/website/img/silver.png" width=15> Coverage (good) </div>`;
	      	} else if (d.rating_flag.coverage == 5) {
	      		text += `<div class="green-flag"><img src="/static/website/img/gold.png" width=9  style="margin-left: 2px;"> Complete coverage (great)</div>`;
	      	}
	      	
	      	if (found && d.rating_flag.quality != 3) {
	      		text += `<br>`;
	      	}
	      	if (d.rating_flag.quality == 1) {
	      		text += `<div class="red-flag"><img src="/static/website/img/alarm.png" width=13> Writing quality (poor) </div>`;
	      	} else if (d.rating_flag.quality == 2) {
	      		text += `<div class="red-flag"><img src="/static/website/img/warning.png" width=13> Writing quality (needs touchup) </div>`;
	      	} else if (d.rating_flag.quality == 4) {
	      		text += `<div class="green-flag"><img src="/static/website/img/silver.png" width=15> Writing quality (good)</div>`;
	      	} else if (d.rating_flag.quality == 5) {
	      		text += `<div class="green-flag"><img src="/static/website/img/gold.png" width=9 style="margin-left: 2px;"> Writing quality (great)</div>`;
	      	}
		}
		
		text += `</span>`;

		text += render_summary_node(d, false);
	} else if (d.hiddennode) {
		highlight_authors = $('#highlight_authors').text().split(',');

		if (highlight_authors.indexOf(d.author) > -1) {
			text += `(Hidden) Comment by <span class="author" style="background-color: pink;">${d.author}</span>`;
		} else {
			text += `(Hidden) Comment by <span class="author">${d.author}</span>`;
		}

		if (d.size > 0) {
			text += ` (${d.size} `;
			if (d.size == 1) {
				text += `like)`;
			} else {
				text += `likes)`;
			}
		}
		text += ` #${d.d_id}</span>`;
		text += '<span class="original_comment">' + d.name + '</span>';
	}

	else {

		highlight_authors = $('#highlight_authors').text().split(',');

		if (highlight_authors.indexOf(d.author) > -1) {
			text += `Comment by <span class="author" style="background-color: pink;">${d.author}</span>`;
		} else {
			text += `Comment by <span class="author">${d.author}</span>`;
		}

		if (d.size > 0) {
			text += ` (${d.size} `;
			if (d.size == 1) {
				text += `like)`;
			} else {
				text += `likes)`;
			}
		}
		text += ` #${d.d_id}</span>`;
		text += '<span class="original_comment">' + d.name + '</span>';
	}

	text += '</div>';

	if (d.tags.length > 0) {
		text += '<div class="tags" id="tags_' + d.id + '">Tags: ';
		for (var i=0; i<d.tags.length; i++) {
			if (is_dark(d.tags[i][1])) {
				text += '<a href="/visualization_flags?id=' + article_id + '&owner=' + owner + '&filter=Tag: ' + d.tags[i][0] + '">';
				text += '<button class="btn btn-xs" style="color: #FFFFFF; background-color: #' + d.tags[i][1] + '">' + d.tags[i][0] + '</button> ';
				text += '</a>';
			} else {
				text += '<a href="/visualization_flags?id=' + article_id + '&owner=' + owner + '&filter=Tag: ' + d.tags[i][0] + '">';
				text += '<button class="btn btn-xs" style="color: #000000; background-color: #' + d.tags[i][1] + '">' + d.tags[i][0] + '</button> ';
				text += '</a>';
			}
		}
		text += '</div>';
	} else {
		text += '<div id="tags_' + d.id + '"></div>';
	}

	if (summary) {
		if (d.editors && d.editors.length > 0) {
			text +='<div class="editors" align="right">Summary edited by: ';
			for (var i=0;i<d.editors.length; i++) {
				text += d.editors[i] + ', '
			}
			text = text.slice(0, -2);
			text += '</div>';
		}
		if (!d.replace_node) {
			text += `<footer align="right">`;
			text += '<a onclick="toggle_original(' + d.id + ');">View Original Comment</a>';
			// comment summary
			var data_access = $('#access_mode').attr('data-access');
			if (data_access == "0" || data_access == "1") {
				text += `<a data-toggle="modal" data-backdrop="false" data-did="${d.d_id}" data-target="#reply_modal_box" data-id="${d.id}">Reply</a>`;
			}
			if (data_access == "0" || data_access == "2") {
				text += '<a ';
				if (d.is_locked) text += 'class="disabled" ';
				text += 'data-toggle="modal" data-backdrop="false" data-did="' + d.d_id + '" data-target="#summarize_modal_box" data-type="edit_summarize_one" data-id="' + d.id + '">Edit</a>';
				text += '<a data-toggle="modal" data-backdrop="false" data-target="#confirm_delete_modal_box" data-id="' + d.id + '" data-did="' + d.d_id +'">Delete</a>';
				text += '<a data-toggle="modal" data-backdrop="false" data-did="' + d.d_id + '" data-target="#tag_modal_box" data-type="tag_one" data-id="' + d.id + '">Tag</a>';
				text += '<a data-toggle="modal" data-backdrop="false" data-did="' + d.d_id + '" data-target="#evaluate_summary_modal_box" data-type="evaluate_summary" data-id="' + d.id + '">Evaluate</a>';
				text += render_subscribe_buttons(d.d_id, d.replace_node, !d.hiddennode);
			}
			text += `</footer>`;
			text += '<div id="orig_' + d.id + '" style="display: none;" class="original_comment">' + d.name + '</div>';

		} else {
			var data_access = $('#access_mode').attr('data-access');
			text += `<footer align="right">`;
			if (data_access == "0" || data_access == "1") {
				text += `<a data-toggle="modal" data-backdrop="false" data-did="${d.d_id}" data-target="#reply_modal_box" data-id="${d.id}">Reply</a>`;
			}
			if (data_access == "0" || data_access == "2") {
				text += `<a `;
				if (d.is_locked) text += `class="disabled" `;
				text += `data-toggle="modal" data-backdrop="false" data-did="${d.d_id}" data-target="#summarize_multiple_modal_box" data-type="edit_summarize" data-id="${d.id}">Edit</a>
				<a data-toggle="modal" data-backdrop="false" data-target="#confirm_delete_modal_box" data-id="${d.id}" data-did="${d.d_id}">Delete</a>
				<a data-toggle="modal" data-backdrop="false" data-did="${d.d_id}" data-target="#tag_modal_box" data-type="tag_one" data-id="${d.id}">Tag</a>
				<a data-toggle="modal" data-backdrop="false" data-did="${d.d_id}" data-target="#evaluate_summary_modal_box" data-type="evaluate_summary" data-id="${d.id}">Evaluate</a>`;
			}
			text += render_subscribe_buttons(d.d_id, d.replace_node, !d.hiddennode);
			text += `</footer>`;
		}
	} else {
		text += '<footer align="right">';
		if ($('#access_mode').attr('data-access') == "0") {
			 if (!summary && d.name.length > 300) {
		
				if (((!d.children || !d.children.length) && !d.replace_node) || (!d.replace_node && d.hashidden && d.children.length == d.hidconstant)) {
					if (!d.hiddennode) {
						text += '<a data-toggle="modal" data-backdrop="false" data-did="' + d.d_id + '" data-target="#reply_modal_box" data-type="" data-id="' + d.id + '">Reply</a>';
						text += '<a ';
						if (d.is_locked) text += 'class="disabled" ';
						text += 'data-toggle="modal" data-backdrop="false" data-did="' + d.d_id + '" data-target="#summarize_modal_box" data-type="summarize_one" data-id="' + d.id + '">Summarize Comment</a>';
						text += '<a data-toggle="modal" data-backdrop="false" data-did="' + d.d_id + '" data-target="#tag_modal_box" data-type="tag_one" data-id="' + d.id + '">Tag Comment</a>';
						text += '<a data-toggle="modal" data-backdrop="false" data-did="' + d.d_id + '" data-target="#hide_modal_box" data-type="hide_comment" data-id="' + d.id + '">Mark Unimportant</a>';
					}
				} else if (!d.replace_node) {
					if (!d.hiddennode) {
						text += '<a data-toggle="modal" data-backdrop="false" data-did="' + d.d_id + '" data-target="#reply_modal_box" -type="tag_one" data-id="' + d.id + '">Reply</a>';

						if (!(d.parent && d.parent.replace_node)) {
							text += '<a ';
							if (d.is_locked) text += 'class="disabled" ';
							text += 'data-toggle="modal" data-backdrop="false" data-did="' + d.d_id + '" data-target="#summarize_multiple_modal_box" data-type="summarize" data-id="' + d.id + '">Summarize Comment + Replies</a>';
						}

						text += '<a data-toggle="modal" data-backdrop="false" data-did="' + d.d_id + '" data-target="#hide_modal_box" data-type="hide_replies" data-id="' + d.id + '">Mark Replies Unimportant</a>';
						text += '<a ';
						if (d.is_locked) text += 'class="disabled" ';
						text += 'data-toggle="modal" data-backdrop="false" data-did="' + d.d_id + '" data-target="#summarize_modal_box" data-type="summarize_one" data-id="' + d.id + '">Summarize Comment</a>';
						text += '<a data-toggle="modal" data-backdrop="false" data-did="' + d.d_id + '" data-target="#tag_modal_box" data-type="tag_one" data-id="' + d.id + '">Tag Comment</a>';
					}
				}
			} else if (!d.replace_node) {
				if ((!d.children || !d.children.length) || (d.hashidden && d.children.length == d.hidconstant)) {
					if (!d.hiddennode) {
						text += '<a data-toggle="modal" data-backdrop="false" data-did="' + d.d_id + '" data-target="#reply_modal_box" data-type="" data-id="' + d.id + '">Reply</a>';
						text += '<a data-toggle="modal" data-backdrop="false" data-did="' + d.d_id + '" data-target="#tag_modal_box" data-type="tag_one" data-id="' + d.id + '">Tag Comment</a>';
						text += '<a data-toggle="modal" data-backdrop="false" data-did="' + d.d_id + '" data-target="#hide_modal_box" data-type="hide_comment" data-id="' + d.id + '">Mark Unimportant</a>';
					}
				} else {
					if (!d.hiddennode) {
						text += '<a data-toggle="modal" data-backdrop="false" data-did="' + d.d_id + '" data-target="#reply_modal_box" data-type="" data-id="' + d.id + '">Reply</a>';
						if (!(d.parent && d.parent.replace_node)) {
							text += '<a ';
							if (d.is_locked) text += 'class="disabled" ';
							text += 'data-toggle="modal" data-backdrop="false" data-did="' + d.d_id + '" data-target="#summarize_multiple_modal_box" data-type="summarize" data-id="' + d.id + '">Summarize Comment + Replies</a>';
						}
						text += '<a data-toggle="modal" data-backdrop="false" data-did="' + d.d_id + '" data-target="#hide_modal_box" data-type="hide_replies" data-id="' + d.id + '">Mark Replies Unimportant</a>';
						text += '<a data-toggle="modal" data-backdrop="false" data-did="' + d.d_id + '" data-target="#tag_modal_box" data-type="tag_one" data-id="' + d.id + '">Tag Comment</a>';
					}
				}
			}

		}
		else if ($('#access_mode').attr('data-access') == "1") {
			if (!d.replace_node && !d.hiddennode) {
				text += '<a data-toggle="modal" data-backdrop="false" data-did="' + d.d_id + '" data-target="#reply_modal_box" data-type="" data-id="' + d.id + '">Reply</a>';
			}
		}
		else if ($('#access_mode').attr('data-access') == "2") {
			if (!summary && d.name.length > 300) {
		
				if (((!d.children || !d.children.length) && !d.replace_node) || (!d.replace_node && d.hashidden && d.children.length == d.hidconstant)) {
					if (!d.hiddennode) {
						text += '<a ';
						if (d.is_locked) text += 'class="disabled" ';
						text += 'data-toggle="modal" data-backdrop="false" data-did="' + d.d_id + '" data-target="#summarize_modal_box" data-type="summarize_one" data-id="' + d.id + '">Summarize Comment</a>';
						text += '<a data-toggle="modal" data-backdrop="false" data-did="' + d.d_id + '" data-target="#tag_modal_box" data-type="tag_one" data-id="' + d.id + '">Tag Comment</a>';
						text += '<a data-toggle="modal" data-backdrop="false" data-did="' + d.d_id + '" data-target="#hide_modal_box" data-type="hide_comment" data-id="' + d.id + '">Mark Unimportant</a>';
					}
				} else if (!d.replace_node) {
					if (!d.hiddennode) {
						if (!(d.parent && d.parent.replace_node)) {
							text += '<a ';
							if (d.is_locked) text += 'class="disabled" ';
							text += 'data-toggle="modal" data-backdrop="false" data-did="' + d.d_id + '" data-target="#summarize_multiple_modal_box" data-type="summarize" data-id="' + d.id + '">Summarize Comment + Replies</a>';
						}
					
						text += '<a data-toggle="modal" data-backdrop="false" data-did="' + d.d_id + '" data-target="#hide_modal_box" data-type="hide_replies" data-id="' + d.id + '">Mark Replies Unimportant</a>';
						text += '<a ';
						if (d.is_locked) text += 'class="disabled" ';
						text += 'data-toggle="modal" data-backdrop="false" data-did="' + d.d_id + '" data-target="#summarize_modal_box" data-type="summarize_one" data-id="' + d.id + '">Summarize Comment</a>';
						text += '<a data-toggle="modal" data-backdrop="false" data-did="' + d.d_id + '" data-target="#tag_modal_box" data-type="tag_one" data-id="' + d.id + '">Tag Comment</a>';
					}
				}
			} else if (!d.replace_node) {
				if ((!d.children || !d.children.length) || (d.hashidden && d.children.length == d.hidconstant)) {
					if (!d.hiddennode) {
						text += '<a data-toggle="modal" data-backdrop="false" data-did="' + d.d_id + '" data-target="#tag_modal_box" data-type="tag_one" data-id="' + d.id + '">Tag Comment</a>';
						text += '<a data-toggle="modal" data-backdrop="false" data-did="' + d.d_id + '" data-target="#hide_modal_box" data-type="hide_comment" data-id="' + d.id + '">Mark Unimportant</a>';
					}
				} else {
					if (!d.hiddennode) {
						if (!(d.parent && d.parent.replace_node)) {
							text += '<a ';
							if (d.is_locked) text += 'class="disabled" ';
							text += 'data-toggle="modal" data-backdrop="false" data-did="' + d.d_id + '" data-target="#summarize_multiple_modal_box" data-type="summarize" data-id="' + d.id + '">Summarize Comment + Replies</a>';
						}
						text += '<a data-toggle="modal" data-backdrop="false" data-did="' + d.d_id + '" data-target="#hide_modal_box" data-type="hide_replies" data-id="' + d.id + '">Mark Replies Unimportant</a>';
						text += '<a data-toggle="modal" data-backdrop="false" data-did="' + d.d_id + '" data-target="#tag_modal_box" data-type="tag_one" data-id="' + d.id + '">Tag Comment</a>';
					}
				}
			}
		}
		text += render_subscribe_buttons(d.d_id, d.replace_node, !d.hiddennode);
		text += '</footer>';
	}
	return text;
}

function escapeHtml(text) {
    'use strict';
    return text.replace(/[\"&<>]/g, function (a) {
        return { '"': '&quot;', '&': '&amp;', '<': '&lt;', '>': '&gt;' }[a];
    });
}

function clear_box_top() {
	$('#box_top').html('');
}


function get_subtree_box(text, d, level) {
	if (d.children) {
		for (var i=0; i<d.children.length; i++) {
			var levelClass = level > 2? "level3" : `level${level}`;
			var summaryClass = d.children[i].replace_node? "summary_box" : "";
			var summarized = d.children[i].summarized!=null && !d.children[i].summarized? "unsummarized" : "";
			var collapsed = d.children[i].collapsed && !d.children[i].replace_node? "collapsed" : "";
			var summary = d.children[i].summary && !d.children[i].replace_node? "summary" : "";
			var hiddennode = d.children[i].hiddennode && !d.children[i].replace_node? "hiddennode" : "";


			text += `<article class="comment_box ${summaryClass} ${summarized} ${levelClass} ${collapsed} ${summary} ${hiddennode}" data-did=${d.children[i].d_id} id="comment_${d.children[i].id}">`;

			text +=  construct_comment(d.children[i]);
			text += '</article>';
			highlight_node(d.children[i].id);
			text = get_subtree_box(text, d.children[i], level+1);
		}
	}

	return text;
}

function highlight_node(id) {
	if (id != 1) {
		d3.select("#node_" + id)
			.attr("class", "clicked")
			.style("stroke","#000000")
			.style("stroke-width", stroke_width);
	}
}

function unhighlight_node(id) {
	if (id != 1) {
		d3.select("#node_" + id)
			.style("stroke-width", "0px")
			.attr("class", null);
	}
}

function unhighlight_all() {
	for (var i=1; i<nodes_all.length; i++) {
		d3.select("#node_" + nodes_all[i].id)
		.style("stroke-width", "0px")
		.attr("class", null);
	}
}

function highlight_all() {
	for (var i=1; i<nodes_all.length; i++) {
		d3.select("#node_" + nodes_all[i].id)
		.style("stroke-width", stroke_width);
	}
}

function highlight_link(from_id, to_id) {
	d3.select("#link_" + from_id + '_' + to_id).transition()
		.style("stroke", "red")
		.style("stroke-width", stroke_width)
		.each("end", function() {
			extra_highlight_node(from_id);
			d3.select(this)
				.transition()
				.style("stroke", "#cccccc")
				.style("stroke-width", "2px");

		});
}

function show_parent(id) {
	d = nodes_all[id-1];
	unextra_highlight_node(id);
	// parent = d.parent;
	// highlight_node(parent.id);
	// highlight_link(parent.id, id);
	show_text(d.parent);
	var outlineItem = $('.outline-item#' + d.parent.d_id);
	redOutlineBorder(outlineItem);
}

function show_text(d) {
	if (d && d != 'clicked') {
		clear_box_top();
		parent = d.parent;
		if (d.article) {
			var text = '';
			text = get_subtree_box(text, d, 0);
			redOutlineBorder(document.getElementById("viewAll"));
		} else {
			var summaryClass = d.replace_node? "summary_box" : "";
			var summarized = d.summarized!=null && !d.summarized? "unsummarized" : "";
			var collapsed = d.collapsed && !d.replace_node? "collapsed" : "";
			var summary = d.summary && !d.replace_node? "summary" : "";
			var hiddennode = d.hiddennode && !d.replace_node? "hiddennode" : "";

			var text = `<article class="comment_box ${summaryClass} ${collapsed} ${summarized} ${summary} ${hiddennode}" data-did=${d.d_id} id="comment_${d.id}">`;

			if (d.depth > 1
                	) {
			    if (!summary) {
			        text += '<a onclick="show_parent(' + d.id + ');">Show parent comment</a><BR>';
			    }
			    else
			    {
			        text += '<a onclick="show_parent(' + d.id + ');">Show parent summary</a><BR>';
			    }
			}

			text += construct_comment(d);
			text += '</article>';
			highlight_node(d.id);
			text = get_subtree_box(text, d, 1);
			redOutlineBorder($('.outline-item#' + d.d_id));
		}
		$('#box').html(text);
		//author_hover();
	} else if (d && d != 'clicked') {
		$('#box').html(d.name);
		clear_box_top();
	} else if (d == null){
		console.log('null');
		$('#box').html('Click on a node to see it and its children or drag to select multiple nodes.');
		clear_box_top();
	} else {
		console.log('clicked');
		$('#box').html('');
		clear_box_top();
		var objs = [];
		var min_level = 50;
		$('#outline .rb-red').each( function() {
			var data = nodes_all.filter(o => o.d_id == this.id)[0];
			if (data && !data.article) {
				objs.push(data);
				if (data.depth < min_level) {
					min_level = data.depth;
				}
			}
		});

		if (objs.length > 1) {
			construct_box_top(objs);
		}

		objs.sort(compare_nodes);
		for (var i in objs) {
			var text = '';

			var level = objs[i].depth - min_level;
			var levelClass = level > 2? "level3" : `level${level}`;
			var summaryClass = objs[i].replace_node? "summary_box" : "";
			var collapsed = objs[i].collapsed && !objs[i].replace_node? "collapsed" : "";
			var summarized = objs[i].summarized!=null && !objs[i].summarized? "unsummarized" : "";
			var summary = objs[i].summary && !objs[i].replace_node? "summary" : "";
			var hiddennode = objs[i].hiddennode && !objs[i].replace_node? "hiddennode" : "";

			text += `<article class="comment_box ${summaryClass} ${levelClass} ${collapsed} ${summarized} ${summary} ${hiddennode}" data-did=${objs[i].d_id} id="comment_${objs[i].id}">`;

			if (!level && objs[i].depth > 1) {
			    if (!summary)
			    {
			        text += '<a onclick="show_parent(' + objs[i].id + ');">Show parent comment</a><BR>';
			    }
			    else {
			        text += '<a onclick="show_parent(' + objs[i].id + ');">Show parent summary</a><BR>';
			    }
			    
			}

			text += construct_comment(objs[i]);
			text += '</article>';
			$('#box').append(text);
			//author_hover();
		};
	}

	var delay=500, setTimeoutConst;
	var hoverDelay=1000, markReadHoverTimer;
	$('.comment_box').hover(
		  function() {
		    var did = parseInt(this.dataset.did);
		    var id = parseInt(this.id.substring(8));
		    extra_highlight_node(did, id);
		    setTimeoutConst = setTimeout(function() {
				$('#viz').scrollTo('#outline-text-' + did, 500, {axis: 'y', offset: {top: -100}});
			}, delay);
			markReadHoverTimer = setTimeout(function() {
				mark_comments_read([did]);
			}, hoverDelay);
		  }, function() {
		    var did = parseInt(this.dataset.did);
		    var id = parseInt(this.id.substring(8));
		    unextra_highlight_node(did, id);
		    clearTimeout(setTimeoutConst);
		    clearTimeout(markReadHoverTimer);
		  }
	);

}

function extra_highlight_node(did, id) {
	$('#outline-text-' + did).css('background-color', '#D3D3D3');
	highlight_box(id);
}

function unextra_highlight_node(did, id) {
	$('#outline-text-' + did).css('background-color', '');
	highlight_box(id);
}

function author_hover() {
	$('.author').mouseover(function(e) {
		var args = {'username': e.currentTarget.innerText, 
					'article': article_url,
					'num': num,
					'owner': owner
					}
		$.get("/author_info", args, function(data) {
			
			var text = '<strong>Total Comments</strong>: ' + data.comment_count;
			
			if (data.registration) {
				text += '<BR><strong>Registered</strong>: ' + data.registration;
			}
			if (data.edit_count) {
				text += '<BR><strong>Edit Count</strong>: ' + data.edit_count;
			}
			
			if (data.groups) {
				text += '<BR><strong>Groups</strong>: ' + data.groups;
			}
			
			$('#author_info').html(text);
			
			var d_y =  e.pageY + 15;
			var d_x =  e.pageX - $('#author_info').width();
			$('#author_info').css({'display': 'block', 'top': d_y + 'px', 'left': d_x + 'px'});
			
			
			
			
		});
	})
	.mouseout(function(e) {
		$('#author_info').css({'display': 'none'});
		$('#author_info').html("");
		
	});
}

function construct_box_top(objs) {
	
	if ($('#access_mode').attr('data-access') != "0" && $('#access_mode').attr('data-access') != "2") {
		return;
	}

	var parent_node = null;

	accepted = true;
	count = 0;
	
	accepted2 = true;

	for (var i=0; i<objs.length; i++) {
		parent = objs[i].parent;
		if (objs[i].children) {
			for (var c=0; c<objs[i].children.length; c++) {
				child = objs[i].children[c];
				if (objs.indexOf(child) == -1) {
					accepted = false;
					break;
				}
			}
		}

		if (objs[i]._children) {
			for (var c=0; c<objs[i]._children.length; c++) {
				child = objs[i]._children[c];
				if (objs.indexOf(child) == -1) {
					accepted = false;
					break;
				}
			}
		}

		if (objs.indexOf(parent) != -1) {
			continue;
		}
		if (parent_node && parent == parent_node) {
			count += 1;
			continue;
		}
		if (!parent_node) {
			parent_node = parent;
			count += 1;
			continue;
		}

		accepted = false;
		break;
	}
	
	for (var i=0; i<objs.length; i++) {
		if ((objs[i].children && objs[i].children.length > 0) || (objs[i]._children && objs[i]._children.length > 0)) {
			accepted2 = false;
			break;
		}
	}

	var text = '';
	if (accepted && count > 1 && !parent_node.replace_node) {
		text += '<BR> <a class="btn btn-xs btn-info" data-toggle="modal" data-backdrop="false" data-target="#summarize_multiple_modal_box" data-type="summarize_selected">Summarize</a><BR>';
	}
	if (accepted) {
		text += '<a class="btn btn-xs btn-info" data-toggle="modal" data-backdrop="false" data-target="#hide_modal_box" data-type="hide_all_selected">Hide selected</a><BR>';
	}
	text += '<a class="btn btn-xs btn-info" data-toggle="modal" data-backdrop="false" data-target="#tag_modal_box" data-type="tag_selected">Tag Selected</a>';

	$('#box_top').html(text);
}

function compare_nodes(a,b) {
  if (a.id < b.id)
    return -1;
  else if (a.id > b.id)
    return 1;
  else
    return 0;
}

function highlight_box(id) {
	$('.highlighted').removeClass('highlighted');
	$('#comment_' + id).addClass('highlighted');
}

function set_expand_position(d) {
	var bbox;
	if (d.article) {
		bbox = $('.outline-item#viewAll').get(0).getBoundingClientRect();
	} else if (d.d_id) {
		let item = $('.outline-item#' + d.d_id);
		if (item) {
			bbox = item.get(0).getBoundingClientRect();
		}
	}
	var width = $('#expand').width();
	var node_width = 0;
	if (d.article) {
		node_width = 10;
	} else {
		node_width = (d.size + 400)/65;
	}
	$('#expand').css({top: bbox.top,
		left: bbox.left - width - 10});
}

function showdiv(d) {
	if (!isMouseDown) {
		if (d && d.replace_node) {
			clearTimeout(timer);

			text = '';
			if (comment_id != d.d_id) {
				if (text != '') {
					text += '<BR>';
				}
				text += '<a href="/subtree?id=' + article_id + '&comment_id=' + d.d_id + '&owner=' + owner + '">See Subtree</a>';
				text += '<BR><a onclick="expand_all(' + d.id + ')">Expand all</a>';
				if (d.hid && d.hid.length > 0) {
					text += '<BR><a onclick="show_hidden(' + d.id + ')"> Show ' + d.hid.length + ' Hidden </a>';
				}				
				if (d.hashidden) {
					text += '<BR><a onclick="hide_hidden(' + d.id + ')"> Rehide hidden </a>';
				}

			}

			if (text != '') {
				$('#expand').html(text);
				$('#expand').show();
			} else {
				$('#expand').html("");
				$('#expand').hide();
			}

			set_expand_position(d);

		} else if (d.children || d._children) {
			clearTimeout(timer);

			one_depth = true;
			if (d.children){
				for (var i=0; i<d.children.length; i++) {
					if (d.children[i].children || d.children[i]._children) {
						one_depth = false;
					}
				}
			}
			if (d._children) {
				for (var i=0; i<d._children.length; i++) {
					if (d._children[i].children || d._children[i]._children) {
						one_depth = false;
					}
				}
			}

			if (one_depth) {
				text = '';
			} else {
				if (!d.parent_node) {
					text = '<a onclick="collapse_node(' + d.id + ');">Collapse replies</a><BR><a onclick="expand_node(' + d.id + ');">Expand replies</a>';
				} else {
					text = '';
				}
			}

			if (d.article) {
				if (window.location.href.indexOf('/subtree') > -1) {
					text = '<a href="/visualization_flags?id=' + article_id + '&owner=' + owner + '">See Entire Discussion</a>';
				}
			} else {
				if (comment_id != d.d_id) {
					if (text != '') {
						text += '<BR>';
					}
					text += '<a href="/subtree?id=' + article_id + '&comment_id=' + d.d_id + '&owner=' + owner +'">See Subtree</a>';
				

				}
			}
			text += '<BR><a onclick="expand_all(' + d.id + ')">Expand all</a>';

			if (d.hid.length > 0) {
					text += '<BR><a onclick="show_hidden(' + d.id + ')"> Show ' + d.hid.length + ' hidden </a>';
				}
			if (d.hashidden) {
					text += '<BR><a onclick="hide_hidden(' + d.id + ')"> Rehide hidden </a>';
				}

			if (text != '') {
				$('#expand').html(text);
				$('#expand').show();
			} else {
				$('#expand').html("");
				$('#expand').hide();
			}

			set_expand_position(d);
		} else {
			text = '';
			if (d.hid.length > 0) {
					text += '<a onclick="show_hidden(' + d.id + ')"> Show ' + d.hid.length + ' hidden </a>';
				}
			if (d.hashidden) {
					text += '<a onclick="hide_hidden(' + d.id + ')"> Rehide hidden </a>';
				}

			if (text != '') {
				$('#expand').html(text);
				$('#expand').show();
			} else {
				$('#expand').html("");
				$('#expand').hide();
			}

			set_expand_position(d);
		}

		// if (d3.select(this).classed("clicked")) {
		// 	extra_highlight_node(d.id);
		// 	highlight_box(d.id);
		// 	hover_timer = window.setTimeout(function(d) {
		// 		$("#box").scrollTo("#comment_" + d.id, 500);
		// 	}, 500, d);
		// }
	}
}

function hide_replace_nodes(id) {
	d = nodes_all[id-1];

	delete_children_boxes(d);
	if (d.children && d.children.length) {
		if (!d.replace) {
			d.replace = [];
		}
		for (var i=0; i<d.children.length; i++) {
			d.replace.push(d.children[i]);
		}
		d.children = null;
		update(d);
		var outlineItem = '.outline-item#' + d.d_id;
		if (!$(outlineItem).find('#down-arrow').length) $(outlineItem).append('<span id="down-arrow">&#9660</span>');
		show_text(d);
	}
	text = '';
	if (comment_id != d.d_id) {
		text += '<a href="/subtree?id=' + article_id + '&comment_id=' + d.d_id + '&owner=' + owner + '">See Subtree</a>';
		text += '<BR><a onclick="expand_all(' + d.id + ')">Expand all</a>';
	}
	if (text != '') {
		$('#expand').html(text);
	} else {
		$('#expand').html("");
	}
}

function show_replace_nodes(id) {
	d = nodes_all[id-1];
	if (d.replace && d.replace.length) {
		if (!d.children) {
			d.children = [];
		}

		for (var i=0; i<d.replace.length; i++) {
			d.children.push(d.replace[i]);
		}
		d.replace = [];
		update(d);
		$('.outline-item#' + d.d_id).find("#down-arrow").remove();
		redOutlineBorder($('.outline-item#' + d.d_id));
		show_text(d);
	}

	text = '';
	if (comment_id != d.d_id) {
		text += '<a href="/subtree?id=' + article_id + '&comment_id=' + d.d_id + '&owner=' + owner + '">See Subtree</a>';
		text += '<BR><a onclick="expand_all(' + d.id + ')">Expand all</a>';

	}
	if (text != '') {
		$('#expand').html(text);
	} else {
		$('#expand').html("");
	}
}

function recurse_mark_hiddennode(d) {
	d.hiddennode = true
	if (d.children && d.hiddennode) {
		for (var i=0; i<d.children.length; i++) {
			d.children[i].hiddennode = true;
			recurse_mark_hiddennode(d.children[i]);
		}
	}
}

function mark_children_summarized(d) {
	d.summarized = true;
	if (d.children) {
		for (var i=0; i<d.children.length; i++) {
			d.children[i].summarized = true;
			mark_children_summarized(d.children[i]);
		}
	}
	if (d._children) {
		for (var i=0; i<d._children.length; i++) {
			d._children[i].summarized = true;
			mark_children_summarized(d._children[i]);
		}
	}
	if (d.replace) {
		for (var i=0; i<d.replace.length; i++) {
			d.replace[i].summarized = true;
			mark_children_summarized(d.replace[i]);
		}
	}
}

function mark_children_unsummarized(d) {
	if (!d.replace_node) {
		d.summarized = false;
		d.collapsed = false;
	}
	if (d.children) {
		for (var i=0; i<d.children.length; i++) {
			if (!d.replace_node) d.children[i].summarized = false;
			mark_children_unsummarized(d.children[i]);
		}
	}
	if (d._children) {
		for (var i=0; i<d._children.length; i++) {
			if (!d.replace_node) d._children[i].summarized = false;
			mark_children_unsummarized(d._children[i]);
		}
	}
}

function has_unsummarized_children(d) {
	if (!d.replace_node && d.summarized == false) {
		return true;
	} else {
		// either summary node or summarized comment
		var huc = false;
		if (d.children) {
			for (var i=0; i<d.children.length; i++) {
				huc = huc || has_unsummarized_children(d.children[i]);
			}
		}
		if (d._children) {
			for (var i=0; i<d._children.length; i++) {
				huc = huc || has_unsummarized_children(d._children[i]);
			}
		}
		if (d.replace) {
			for (var i=0; i<d.replace.length; i++) {
				huc = huc || has_unsummarized_children(d.replace[i]);
			}
		}
		return huc;
	}
}

function expand_unsummarized_children(d) {
	if (d.replace_node && d.replace) {
		for (var i=0; i<d.replace.length; i++) {
			if (!d.children) {
				d.children = [];
			}
			if (recurse_get_unsummarized(d.replace[i]).length > 0) {
				d.children.push(d.replace[i]);
				d.replace.splice(i, 1);
			}
		}
		update(d);
	}
}

// expands all branches with unsummarized comments
function show_all_unsummarized(d) {
	if (d.replace_node) {
		expand_unsummarized_children(d);
	}
	if (d.replace) {
		for (var i=0; i<d.replace.length; i++) {
			show_all_unsummarized(d.replace[i]);
		}
	}
	if (d.children) {
		for (var i=0; i<d.children.length; i++) {
			show_all_unsummarized(d.children[i]);
		}
	}
}

function show_hidden(id) {
	d = nodes_all[id-1];
	d.hashidden = false;
	d.hidconstant = d.hid.length;

	$($('#expand').children()[$('#expand').children().length-1]).attr("onclick","hide_hidden("+id+")");
	$($('#expand').children()[$('#expand').children().length-1]).text('Rehide hidden');
	

	if (d.hid.length>0) {

		if (!d.children) {
			d.children = [];
		}
		for (var i=0; i<d.hid.length; i++) {
			recurse_mark_hiddennode(d.hid[i]);
			d.children.push(d.hid[i]);
		}
		d.hid = [];
		d.hashidden = true;
		update(d);
		show_text(d);
		redOutlineBorder($('.outline-item#' + d.d_id));
	}
}

function hide_hidden(id) {
	d = nodes_all[id-1];
	newchildren = [];

	$($('#expand').children()[$('#expand').children().length-1]).attr("onclick","show_hidden("+id+")");
	$($('#expand').children()[$('#expand').children().length-1]).text('Show ' + d.hidconstant + ' hidden');
	
	if (d.children) {
		for (var i=0; i<d.children.length; i++) {
			
			if (d.children[i].hiddennode) {
				d.children[i].hiddennode = false;
				d.hid.push(d.children[i]);
			}	
			else {
				newchildren.push(d.children[i]);
			}
		}
		d.children = newchildren;

	} else if (d._children) {
		for (var i=0; i<d._children.length; i++) {
			
			if (d._children[i].hiddennode) {
				d._children[i].hiddennode = false;
				d.hid.push(d._children[i]);
			}	
			else {
				newchildren.push(d._children[i]);
			}
		}
		d._children = newchildren;
	}

	
	if (d.hashidden) {
		d.hashidden = false;
		update(d);
		show_text(d);
		redOutlineBorder($('.outline-item#' + d.d_id));
	}
}

function recurse_get_children(d, all_children=[]) {
	all_children.push(d);
	if (d.replace_node && d.replace) {
		for (var i=0; i<d.replace.length; i++) {
			recurse_get_children(d.replace[i], all_children);
		}
	}
	if (d.children) {
		for (var i=0; i<d.children.length; i++) {
			recurse_get_children(d.children[i], all_children);
		}
	}
	return all_children;
}

function recurse_get_unsummarized(d, unsummarized_children=[]) {
	if (d.summarized == false) {
		unsummarized_children.push(d);
	}
	if (d.replace_node && d.replace) {
		for (var i=0; i<d.replace.length; i++) {
			recurse_get_unsummarized(d.replace[i], unsummarized_children);
		}
	}
	if (d.children) {
		for (var i=0; i<d.children.length; i++) {
			recurse_get_unsummarized(d.children[i], unsummarized_children);
		}
	}
	return unsummarized_children;
}

function hidediv(d) {
	if (!isMouseDown) {
		unextra_highlight_node(d.id);
	}
	window.clearTimeout(hover_timer);
	timer = setTimeout(remove_dic, 100);
}

function remove_dic() {
	$('#expand').hide();
}

$("#expand").mouseleave(function() {
    timer = setTimeout(remove_dic, 100);
}).mouseenter(function() {
    clearTimeout(timer);
});


function stroke_width(d) {
	if (d.article) {
  		return 3;
  	}
  	return 2.5;
}

function stroke(d) {
	if (d.article) {
		return "#000000";
	}
 }

var svg = d3.select("body").append("svg").attr("id", "d3svg");

var gradientblue = svg.append("svg:defs")
    .append("svg:linearGradient")
    .attr("id", "gradientblue")
    .attr("x1", "0%")
    .attr("y1", "0%")
    .attr("x2", "100%")
    .attr("y2", "100%")
    .attr("spreadMethod", "pad");

// Define the gradient colors
gradientblue.append("svg:stop")
    .attr("offset", "0%")
    .attr("stop-color", "#1F637A")
    .attr("stop-opacity", 1);

gradientblue.append("svg:stop")
    .attr("offset", "100%")
    .attr("stop-color", "#ffffff")
    .attr("stop-opacity", 1);

 var gradientorange = svg.append("svg:defs")
    .append("svg:linearGradient")
    .attr("id", "gradientorange")
    .attr("x1", "0%")
    .attr("y1", "0%")
    .attr("x2", "100%")
    .attr("y2", "100%")
    .attr("spreadMethod", "pad");

// Define the gradient colors
gradientorange.append("svg:stop")
    .attr("offset", "0%")
    .attr("stop-color", "#B35900")
    .attr("stop-opacity", 1);

gradientorange.append("svg:stop")
    .attr("offset", "100%")
    .attr("stop-color", "#ffffff")
    .attr("stop-opacity", 1);

var half_orange_blue = svg.append("svg:defs")
	.append("svg:linearGradient")
	.attr("id", "half_orange_blue")
	.attr("x1", "100%")
    .attr("y1", "100%")
    .attr("x2", "0%")
    .attr("y2", "0%");
half_orange_blue.append("svg:stop")
    .attr("offset", "50%")
    .attr("stop-color", "#a1c5d1");
half_orange_blue.append("svg:stop")
    .attr("offset", "50%")
    .attr("stop-color", "#ee7600");


var stringToColour = function(str) {
  var hash = 0;
  for (var i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  var colour = '#';
  for (var i = 0; i < 3; i++) {
    var value = (hash >> (i * 8)) & 0xFF;
    colour += ('00' + value.toString(16)).substr(-2);
  }
  return colour;
}

function redOutlineBorder(element) {
	$('.rb-red').removeClass('rb-red');
	if (element && element.id !== 'viewAll') $(element).addClass('rb-red');
	var child = $(element).next()[0];
	$(child).addClass('rb-red');

	$('.outline-selected').removeClass('outline-selected');
	/* outline the circle */
	if ($(element).children('.marker') && $(element).children('.marker').length) {
		$(element).children('.marker').addClass('outline-selected');
	}
	/* highlight the line */
	$(child).children('.list-countainer').each(function () {
		$(this).children('.list-group-line').addClass('outline-selected');
	});
	lastClicked = $(element).children('.outline-text')[0];
}

function color(d) {
	if (colorby == "summarized") {
		if (d.parent_node) {
			return "#cccccc";
		}
	
		if (d.replace_node) {
			if (recurse_get_unsummarized(d).length > 0) {
				return "url(#half_orange_blue)";
			} else {
				return "#ee7600";
			}
		}
	
		if (d.article) {
			return "#ffffff";
		}
	
		if (d.collapsed) {
			if (d.hiddennode) {
				return "#990000";
			}
			if (d.summarized==false) {
				return "#a1c5d1";
			}

			if (d.summary) {
				return "url(#gradientorange)";
			}
			
			return "#f8c899";
		}
	
		if (d.summary) {
			return "url(#gradientblue)";
		}
	} else if (colorby == "user") {
		if (d.parent_node) {
			return "#cccccc";
		}
		if (d.article) {
			return '#ffffff';
		}
		if (d.replace_node) {
			return "#ee7600";
		}
		if (d.hiddennode) {
			return "#990000";
		}
			
		if (d.author && d.author != "Anonymous") {
			return stringToColour(d.author);
		} else {
			return '#cccccc';
		}
	}


	if (d.hiddennode) {
		return "#990000";
	}

	return "#a1c5d1";

}

function count_unsummarized_words(d) {
	count = 0;
	if (d.replace_node) {
		if (d.replace) {
			for (var i=0; i<d.replace.length; i++) {
				count += count_unsummarized_words(d.replace[i]);
			}
		}
		if (d.children) {
			for (var i=0; i<d.children.length; i++) {
				count += count_unsummarized_words(d.children[i]);
			}
		}
		if (d._children) {
			for (var i=0; i<d._children.length; i++) {
				count += count_unsummarized_words(d._children[i]);
			}
		}
	} else {
		if (d.children) {
			for (var i=0; i<d.children.length; i++) {
				count += count_unsummarized_words(d.children[i]);
			}
		}
		if (d._children) {
			for (var i=0; i<d._children.length; i++) {
				count += count_unsummarized_words(d._children[i]);
			}
		}

		if (!d.article && !d.parent_node && d.summarized == false) {
			if (d.summary != '') {
				count += wordCount(d.summary);
				count += wordCount(d.extra_summary);
			} else {
				count += wordCount(d.name);
			}
		}
	}
	return count;
}

function count_all_words(d) {
	count = 0;
	if (d.replace_node) {
		if (d.replace) {
			for (var i=0; i<d.replace.length; i++) {
				count += count_all_words(d.replace[i]);
			}
		}

		if (d.children) {
			for (var i=0; i<d.children.length; i++) {
				count += count_all_words(d.children[i]);
			}
		}

	} else {
		if (d.children) {
			for (var i=0; i<d.children.length; i++) {
				count += count_all_words(d.children[i]);
			}
		}
		if (d._children) {
			for (var i=0; i<d._children.length; i++) {
				count += count_all_words(d._children[i]);
			}
		}

		if (!d.article && !d.parent_node) {
			count += wordCount(d.name);
		}
	}	
	// if (d.hid) {
	// 	for (var i=0; i<d.hid.length; i++) {
	// 			count += count_all_words(d.hid[i]);
	// 		}
	// }
	
	return count;
}

function make_progress_bar() {
	num_words_all = count_all_words(nodes_all[0]);
	num_words_still = count_unsummarized_words(nodes_all[0]);

	// if (num_words_all >= 250) {
	// 	num_words_all = num_words_all - 250;
	// 	num_words_still = num_words_still - 250;
	// } else {
	// 	var half = num_words_all/2;
	// 	num_words_all = num_words_all - half;
	// 	num_words_still = num_words_still - half;
	// }

	if (num_words_all != 0) {
		value = Math.round((1 - (num_words_still/num_words_all)) * 100);
		if (value > 100) {
			value = 100;
		}
	} else {
		value = 100;
	}

	$('progress').attr('value', value);
	$('.progress-label span').text(value);
}

function wordCount(str) {
	if (!str) {
		return 0;
	}

	return str.trim().split(/\s+/).length;
}

$(".modal").on("show.bs.modal", function(){
	$(this).find(".wordcount").text("");
})

$(".summary-editor").on("input", function(evt) {
	var words = wordCount($(this).closest(".modal-content").find(".summarize_comment_comment").text());
	var summaryWords = wordCount(this.value);
	var max_length = Math.round(Math.min(words/2, 250));
	// var isValid = summaryWords < max_length;

	// var $wordcount = $(this).prevAll(".wordcount");
	// $wordcount.text(`${summaryWords}/${max_length}`);
	// $wordcount.toggleClass("invalid", !isValid);

	// this.setCustomValidity(isValid? "" : "Summary is too long");
})
