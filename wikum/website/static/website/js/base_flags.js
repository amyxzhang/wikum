draggingNode = null;
selectedNode = null;
activeBox = null;

delete_summary_nodes = [];
delete_summary_node_ids = [];

current_summarize_d_id = [];

var article_url = getParameterByName('article');
var owner = getParameterByName('owner');

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
				if (res.sents[i].length > 6) {
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

$("#unhide_comment").draggable({
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

$('#hide_modal_box').on('hidden.bs.modal', function () {
    var cnt = $(".ui-resizable").contents();
	$(".ui-resizable").replaceWith(cnt);
	$(".ui-resizable-handle").remove();
	$('#hide_comment_box').attr('style', '');
	$('#hide_comment_box').text('');
});

$('#summarize_modal_box').on('hidden.bs.modal', function () {
    var cnt = $(".ui-resizable").contents();
	$(".ui-resizable").replaceWith(cnt);
	$(".ui-resizable-handle").remove();
	$('#summarize_comment_box').attr('style', '');
	$('#summarize_comment_box').text('');
	current_summarize_d_id = [];
	unhighlight_sents();
});

$('#summarize_multiple_modal_box').on('hidden.bs.modal', function () {
	$('#summarize_multiple_comment_box').text('');
	delete_summary_nodes = [];
	delete_summary_node_ids = [];
	current_summarize_d_id = [];
	unhighlight_sents();
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


$('#evaluate_summary_modal_box').on('show.bs.modal', function(e) {
	var id = $(e.relatedTarget).data('id');
	d = nodes_all[id-1];
	
	var text = 'Flag this summary as being problematic or exemplary in the below characteristics:';
	$('#evaluate_text').html(text);
	
	if (d.replace_node) {
		var node_text = '<strong>Summary Node:</strong><BR>' + render_summary_node(d, false);
	} else if (d.summary != '') {
		var node_text = '<strong>Summary:</strong> ' + render_summary_node(d, false);
	} else {
		var node_text = d.name;
	}
			
	var text = '<div class="summary_box tag_comment_comment">' + node_text+ '</div>';

	$('#evaluate_summary_box').html(text);
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


	var did = $(e.relatedTarget).data('did');

	$('#evaluate_summary_modal_box form').off("submit");

	$('#evaluate_summary_modal_box form').submit({data_id: did, id: id}, function(evt) {
		evt.preventDefault();
		
		var neu = $( "#neutral_rating" ).slider('value');
		var cov = $( "#coverage_rating" ).slider('value');
		var qual = $( "#quality_rating" ).slider('value');
		
		var csrf = $('#csrf').text();
		var data = {csrfmiddlewaretoken: csrf,
			neu: neu,
			cov: cov,
			qual: qual
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

	highlight_box(id);
	if (type == "tag_one") {
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

		$('.clicked').each(function(index) {
			var id_clicked = parseInt($(this)[0].id.substring(5), 10);
			if (id_clicked != 1) {
				ids.push(id_clicked);
				var data = nodes_all[id_clicked-1];

				if (index == 0) {
					overlapping_tags = data.tags;
				} else {
					for (var i=overlapping_tags.length; i>=0; i--) {
						if (data.tags.indexOf(overlapping_tags[i]) == -1) {
							overlapping_tags.splice(i, 1);
						}
					}
				}

				datas.push(data);
				dids.push(data.d_id);
				if (data.depth < min_level) {
					min_level = data.depth;
				}
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
				d_text += '<button class="btn btn-xs" style="color: #FFFFFF; background-color: #' + overlapping_tags[i][1] + '">' + overlapping_tags[i][0] + '</button> ';
			} else {
				d_text += '<button class="btn btn-xs" style="background-color: #' + overlapping_tags[i][1] + '">' + overlapping_tags[i][0] + '</button> ';
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

	var tag_suggestions = new Bloodhound({
	  datumTokenizer: Bloodhound.tokenizers.whitespace,
	  queryTokenizer: Bloodhound.tokenizers.whitespace,
	  prefetch: {
	  	url:'/tags?article=' + article_url + '&num=' + num + '&owner=' + owner,
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
		var tag = $('#tag-form').val();
		var article_id = $('#article_id').text();
		var csrf = $('#csrf').text();
		var data = {csrfmiddlewaretoken: csrf,
			tag: tag,
			article: article_id};

		if (evt.data.type == "tag_one") {
			data.id = evt.data.data_id;
			$.ajax({
				type: 'POST',
				url: '/tag_comment',
				data: data,
				success: function(res) {

					if (res.color) {

						d = nodes_all[evt.data.id -1];
						d.tags.push([tag, res.color]);

						d_text = '';
						if (is_dark(res.color)) {
							d_text += '<button class="btn btn-xs" style="color: #FFFFFF; background-color: #' + res.color + '">' + tag + '</button> ';
						} else {
							d_text += '<button class="btn btn-xs" style="background-color: #' + res.color + '">' + tag + '</button> ';
						}

						text = $('#current_tags').html();
						if (text == "") {
							$('#current_tags').html('Current tags: ' + d_text);
						} else {
							$('#current_tags').append(d_text);
						}

						text = $('#tags_' + d.id).html();
						if (text == "") {
							$('#tags_' + d.id).html('Tags: ' + d_text);
						} else {
							$('#tags_' + d.id).append(d_text);
						}
					}

					// Clear tag input
					$("input#tag-form").prop("value", "");

					success_noty();
				},
				error: function() {
					error_noty();
				}
			});
		} else if (evt.data.type == "tag_selected") {
			data.ids = evt.data.dids;
			$.ajax({
				type: 'POST',
				url: '/tag_comments',
				data: data,
				success: function(res) {

					if (res.color) {

						d_text = '';
						if (is_dark(res.color)) {
							d_text += '<button class="btn btn-xs" style="color: #FFFFFF; background-color: #' + res.color + '">' + tag + '</button> ';
						} else {
							d_text += '<button class="btn btn-xs" style="background-color: #' + res.color + '">' + tag + '</button> ';
						}

						text = $('#current_tags').html();
						if (text == "") {
							$('#current_tags').html('Current tags: ' + d_text);
						} else {
							$('#current_tags').append(d_text);
						}

						for (var i=0; i<evt.data.ids; i++) {
							d = nodes_all[evt.data.ids[i] -1];
							d.tags.push([tag, res.color]);

							text = $('#tags_' + d.id).html();
							if (text == "") {
								$('#tags_' + d.id).html('Tags: ' + d_text);
							} else {
								$('#tags_' + d.id).append(d_text);
							}
						}
					}

				},
				error: function() {
					error_noty();
				}
			});
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
				$('.suggest_tag').click(function() {
					var text = $(this).text();
					$('#tag-form').val(text);
				});
			}
		}
	});
});

$("#unhide_comment").on('show.bs.modal', function(e) {
	var id = $(e.relatedTarget).data('id');
	var type = $(e.relatedTarget).data('type');
	d = nodes_all[id-1];

	d.hiddennode = false;
})


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
	} else if (type == "hide_replies") {
		var text = '<strong>Original Comment: </strong><div class="hide_comment_comment">' + d.name + '</div><BR><strong>Replies:</strong><BR>';
		text = get_subtree(text, d, 0);
		$('#hide_comment_text').text('Hide the replies to this original comment from view.');
	} else if (type == "hide_all_selected") {
		var text = '';
		var datas = [];
		var min_level = 50;
		$('.clicked').each(function(index) {
			var id_clicked = parseInt($(this)[0].id.substring(5), 10);
			if (id_clicked != 1) {
				ids.push(id_clicked);
				var data = nodes_all[id_clicked-1];
				datas.push(data);
				dids.push(data.d_id);
				if (data.depth < min_level) {
					min_level = data.depth;
				}
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

		if (evt.data.type == "hide_comment") {
			data.id = evt.data.data_id;
			$.ajax({
				type: 'POST',
				url: '/hide_comment',
				data: data,
				success: function() {
					$('#hide_modal_box').modal('toggle');
					success_noty();
					$('#comment_' + id).remove();
					hide_node(id);
					make_progress_bar();
				},
				error: function() {
					error_noty();
				}
			});
		} else if (evt.data.type == "hide_all_selected") {
			data.ids = evt.data.dids;
			$.ajax({
				type: 'POST',
				url: '/hide_comments',
				data: data,
				success: function() {
					$('#hide_modal_box').modal('toggle');
					success_noty();

					for (var i=0; i<evt.data.ids.length; i++) {
						$('#comment_' + evt.data.ids[i]).remove();
						hide_node(evt.data.ids[i]);
					}
					make_progress_bar();
				},
				error: function() {
					error_noty();
				}
			});
		} else {
			data.id = evt.data.data_id;
			$.ajax({
				type: 'POST',
				url: '/hide_replies',
				data: data,
				success: function() {
					$('#hide_modal_box').modal('toggle');
					success_noty();

					var d = nodes_all[evt.data.id-1];

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
				},
				error: function() {
					error_noty();
				}
			});
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

function insert_quote(highlighted_text, did) {
	var box = $('#' + activeBox + '_comment_textarea');
	var cursorPos = box.prop('selectionStart');
    var v = box.val();
    var textBefore = v.substring(0,  cursorPos );
    var textAfter  = v.substring( cursorPos, v.length );
    box.val( textBefore + '\n[quote]"' + highlighted_text + '" [[comment_' + did +']] [endquote]\n' + textAfter );
}

$('#summarize_modal_box').on('show.bs.modal', function(e) {

	activeBox = 'summarize';

	var type = $(e.relatedTarget).data('type');

	var ids = [];
	var dids = [];



	var id = $(e.relatedTarget).data('id');
	var did = $(e.relatedTarget).data('did');

	d = nodes_all[id-1];
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
	   			highlighted_comm = parseInt(evt.target.parentNode.id.substring(8));
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

	$('#summarize_modal_box form').off("submit");

	$('#summarize_modal_box form').submit({data_id: did, id: id, type: type, ids: ids, dids: dids}, function(evt) {
		evt.preventDefault();
		var comment = $('#summarize_comment_textarea').val().trim();
		var article_id = $('#article_id').text();
		var csrf = $('#csrf').text();
		var data = {csrfmiddlewaretoken: csrf,
			comment: comment,
			article: article_id};

		data.id = evt.data.data_id;
		$.ajax({
			type: 'POST',
			url: '/summarize_comment',
			data: data,
			success: function(res) {
				$('#summarize_modal_box').modal('toggle');

				success_noty();

				d = nodes_all[evt.data.id-1];

				d.summary = res.top_summary;
				d.extra_summary = res.bottom_summary;
				
				if (article_url.indexOf('wikipedia.org') !== -1) {
					d.sumwiki = res.top_summary_wiki;
					d.extrasumwiki = res.bottom_summary_wiki;
				}

				var text = construct_comment(d);
				$('#comment_' + evt.data.id).empty();
				$('#comment_' + evt.data.id).html(text);
				author_hover();
				
				d3.select("#node_" + d.id).style("fill",color);
				$('#comment_' + evt.data.id).addClass("summary");

				highlight_box(evt.data.id);
				make_progress_bar();
			},
			error: function() {
				error_noty();
			}
		});
	});
});


$('#summarize_multiple_modal_box').on('show.bs.modal', function(e) {

	activeBox = 'summarize_multiple';

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
		d3.selectAll('.clicked').each( function(data) {
			if (!data.article) {
				objs.push(data);
				if (data.depth < min_level) {
					min_level = data.depth;
				}
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


			text += `<div id="sum_box_${objs[i].id}" class="summarize_comment_comment ${summaryClass} level${depth}">
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
		$('#summarize_multiple_comment_textarea').val("");
	} else {

		var id = $(e.relatedTarget).data('id');
		var did = $(e.relatedTarget).data('did');

		d = nodes_all[id-1];

		highlight_box(id);
		if (type == "summarize") {
			var text = '<div id="sum_box_' + d.id + '" class="summarize_comment_comment">';

			if (d.summary != '') {
				text += ' | <a class="btn-xs btn-edit" onclick="copy_summary(' + d.id + ');">Copy Entire Summary</a> | <a class="btn-xs btn-edit" onclick="cite_comment(' + d.d_id +');">Cite Comment</a></P><strong>Summary: </strong> ' + render_summary_node_edit(d) + '</div>';
			} else {
				text += ' | <a class="btn-xs btn-edit" onclick="cite_comment(' + d.d_id +');">Cite Comment</a></P>' + show_comment_text(d.name, d.d_id) + '<P>-- ' + d.author + '</P></div>';

				current_summarize_d_id.push(d.d_id);
			}

			text = get_subtree_summarize(text, d, 1);
			$('#summarize_multiple_comment_text').text('Summarize this comment and all replies (replaces them all).');
			$('#summarize_multiple_comment_textarea').val("");
		} else if (type == "edit_summarize") {

			show_replace_nodes(d.id);

			if (d.replace_node) {
				if (d.replace.length > 0) {
					var text = '';
					for (var i=0; i<d.replace.length; i++) {
						if (d.replace[i].summary != '') {
							text += '<div id="sum_box_' + d.replace[i].id + '" class="summarize_comment_comment"><P>ID: ' + d.replace[i].d_id + ' | <a class="btn-xs btn-edit" onclick="copy_summary(' + d.replace[i].id + ');">Copy Entire Summary</a> | <a class="btn-xs btn-edit" onclick="cite_comment(' + d.replace[i].d_id +');">Cite Comment</a></P><strong>Summary: </strong> ' + render_summary_node_edit(d.replace[i]) + '</div>';
						} else {

							current_summarize_d_id.push(d.replace[i].d_id);

							text += '<div id="sum_box_' + d.replace[i].id + '" class="summarize_comment_comment"><P>ID: ' + d.replace[i].d_id + ' | <a class="btn-xs btn-edit" onclick="cite_comment(' + d.replace[i].d_id +');">Cite Comment</a></P>' + show_comment_text(d.replace[i].name, d.replace[i].d_id)  + '<P>-- ' + d.replace[i].author + '</P></div>';
						}
						text = get_subtree_summarize(text, d.replace[i], 1);
					}

				} else if (d.children.length > 0) {
					var text = '';
					for (var i=0; i<d.children.length; i++) {
						if (d.children[i].summary != '') {
							text += '<div id="sum_box_' + d.children[i].id + '" class="summarize_comment_comment"><P>ID: ' + d.children[i].d_id + ' | <a class="btn-xs btn-edit" onclick="copy_summary(' + d.children[i].id + ');">Copy Entire Summary</a> | <a class="btn-xs btn-edit" onclick="cite_comment(' + d.children[i].d_id +');">Cite Comment</a></P><strong>Summary: </strong> ' + render_summary_node_edit(d.children[i]) + '</div>';
						} else {

							current_summarize_d_id.push(d.children[i].d_id);

							text += '<div id="sum_box_' + d.children[i].id + '" class="summarize_comment_comment"><P>ID: ' + d.children[i].d_id + ' | <a class="btn-xs btn-edit" onclick="cite_comment(' + d.children[i].d_id +');">Cite Comment</a></P>' + show_comment_text(d.children[i].name, d.children[i].d_id) + '<P>-- ' + d.children[i].author + '</P></div>';
						}
						text = get_subtree_summarize(text, d.children[i], 1);
					}
				}
			} else {
				var text = '<div id="sum_box_' + d.children[0].id + '" class="summarize_comment_comment"><P>ID: ' + d.children[0].d_id + ' | <a class="btn-xs btn-edit" onclick="cite_comment(' + d.children[0].d_id +');">Cite Comment</a></P>' + show_comment_text(d.children[0].name, d.children[0].d_id) + '<P>-- ' + d.children[0].author + '</P></div>';

				current_summarize_d_id.push(d.children[0].d_id);

				text = get_subtree_summarize(text, d.children[0], 1);
			}

			if (d.extra_summary != '') {
				if (article_url.indexOf('wikipedia.org') !== -1) {
					$('#summarize_multiple_comment_textarea').val(d.sumwiki + '\n----------\n' + d.extrasumwiki);
				} else {
					$('#summarize_multiple_comment_textarea').val(d.summary + '\n----------\n' + d.extra_summary);
				}
			} else {
				if (article_url.indexOf('wikipedia.org') !== -1) {
					$('#summarize_multiple_comment_textarea').val(d.sumwiki);
				}
				else {
					$('#summarize_multiple_comment_textarea').val(d.summary);
				}
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
	   			highlighted_comm = parseInt(evt.target.parentNode.id.substring(8));
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
		var comment = $('#summarize_multiple_comment_textarea').val().trim();
		var article_id = $('#article_id').text();
		var csrf = $('#csrf').text();
		var data = {csrfmiddlewaretoken: csrf,
			comment: comment,
			article: article_id,
			delete_nodes: delete_summary_nodes
		};

		if (evt.data.type == "summarize_selected") {
			data.ids = evt.data.dids;

			var objs = [];
			d3.selectAll('.clicked').each( function(data) {
				if (!data.article) {
					objs.push(data);
					if (data.depth < min_level) {
						min_level = data.depth;
					}
				}
			});

			children = [];
			children_dids = [];
			lowest_id = 500;
			lowest_d = null;
			size = 0;
			for (var i=0; i<objs.length; i++) {
				if (objs[i].depth == min_level) {
					children.push(objs[i]);
					children_dids.push(objs[i].d_id);
					if (objs[i].id < lowest_id) {
						lowest_id = objs[i].id;
						lowest_d = objs[i];
					}
					if (objs[i].size > size) {
						size = objs[i].size;
					}
				}
			}

			data.children = children_dids;
			data.child = lowest_d.d_id;

			$.ajax({
				type: 'POST',
				url: '/summarize_selected',
				data: data,
				success: function(res) {

					new_d = {d_id: res.d_id,
							 name: "",
							 summary: res.top_summary,
							 extra_summary: res.bottom_summary,
							 parent: lowest_d.parent,
							 replace: children,
							 author: "",
							 tags: [],
							 collapsed: lowest_d.parent.collapsed,
							 replace_node: true,
							 size: size,
							 depth: lowest_d.depth,
							 x: lowest_d.x,
							 x0: lowest_d.x0,
							 y: lowest_d.y,
							 y0: lowest_d.y0,
							};
							
					if (article_url.indexOf('wikipedia.org') !== -1) {
						 new_d.sumwiki = res.top_summary_wiki;
						 new_d.extrasumwiki = res.bottom_summary_wiki;
					}

					for (var d=0; d<children.length; d++) {
						for (var i=0; i<children[d].parent.children.length; i++) {
							if (children[d].parent.children[i] == children[d]) {
								children[d].parent.children.splice(i,1);
	  							break;
							}
						}
						children[d].parent = new_d;
					}

					insert_node_to_children(new_d, new_d.parent);

					for (var i=0; i<delete_summary_node_ids.length; i++) {
						delete_summary_node(delete_summary_node_ids[i]);
					}

					delete_summary_nodes = [];
					delete_summary_node_ids = [];

					console.log(new_d.collapsed);
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

					update(new_d.parent);

					d3.select("#node_" + new_d.id)
					.style("fill",color);

					$('#summarize_multiple_modal_box').modal('toggle');

					var text = '<div id="comment_text_' + new_d.id + '"><strong>Summary Node:</strong><BR>' + render_summary_node(new_d, false) + '</div>';
					
					if ($('#access_mode').attr('data-access') == "1") {
						text += `<footer>
							<a data-toggle="modal" data-backdrop="false" data-did="${new_d.id}" data-target="#summarize_multiple_modal_box" data-type="edit_summarize" data-id="${new_d.id}">Edit Summary</a>
							<a onclick="post_delete_summary_node(${new_d.id});">Delete Summary</a>
							<a data-toggle="modal" data-backdrop="false" data-did="${new_d.d_id}" data-target="#evaluate_summary_modal_box" data-type="evaluate_summary" data-id="${new_d.id}">Evaluate Summary</a>
						</footer>`;
					}
					

					for (var i=0; i<children.length; i++) {
						if (children[i] == lowest_d) {
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
			});
		} else if (evt.data.type == "summarize" || evt.data.type == "edit_summarize") {
			data.id = evt.data.data_id;
			$.ajax({
				type: 'POST',
				url: '/summarize_comments',
				data: data,
				success: function(res) {

					var d = nodes_all[evt.data.id-1];

					$('#summarize_multiple_modal_box').modal('toggle');

					if (evt.data.type == "summarize") {

						new_d = {d_id: res.d_id,
							 name: "",
							 parent: d.parent,
							 replace: [d],
							 tags: [],
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

						for (var i=0; i<d.parent.children.length; i++) {
							if (d.parent.children[i] == d) {
								 d.parent.children.splice(i,1);
      							break;
							}
						}

						d.parent = new_d;

						insert_node_to_children(new_d, new_d.parent);

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
					} else {
						update(d.parent);
					}

					for (var i=0; i<delete_summary_node_ids.length; i++) {
						delete_summary_node(delete_summary_node_ids[i]);
					}

					delete_summary_nodes = [];
					delete_summary_node_ids = [];



					d.summary = res.top_summary;
					d.extra_summary = res.bottom_summary;
					if (article_url.indexOf('wikipedia.org') !== -1) {
						 d.sumwiki = res.top_summary_wiki;
						 d.extrasumwiki = res.bottom_summary_wiki;
					}

					var text = '<div id="comment_text_' + d.id + '"><strong>Summary Node:</strong><BR>' + render_summary_node(d, false) + '</div>';
					
					if ($('#access_mode').attr('data-access') == "1") {
						text += `<footer>
							<a data-toggle="modal" data-backdrop="false" data-did="${d.id}" data-target="#summarize_multiple_modal_box" data-type="edit_summarize" data-id="${d.id}">Edit Summary Node</a>
							<a onclick="post_delete_summary_node(${d.id});">Delete Summary</a>
							<a data-toggle="modal" data-backdrop="false" data-did="${d.d_id}" data-target="#evaluate_summary_modal_box" data-type="evaluate_summary" data-id="${d.id}">Evaluate Summary</a>
						</footer>`;
					}

					$('#comment_' + d.id).html(text);

					highlight_box(d.id);
					success_noty();
					make_progress_bar();
				},
				error: function() {
					error_noty();
				}
			});
		}

	});
});

function post_delete_comment_summary(id){
	d = nodes_all[id-1];
	if (!d.replace_node) {
		var article_id = $('#article_id').text();
		var csrf = $('#csrf').text();
		var data = {csrfmiddlewaretoken: csrf,
			comment: '',
			article: article_id,
			id: d.d_id};
		$.ajax({
				type: 'POST',
				url: '/delete_comment_summary',
				data: data,
				success: function() {
					delete_comment_summary(id);
					success_noty();
					make_progress_bar();
				},
				error: function() {
					error_noty();
				}
		});
	}
}

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
	author_hover();
}

function post_delete_summary_node(id) {
	d = nodes_all[id-1];
	if (d.replace_node) {
		var article_id = $('#article_id').text();
		var csrf = $('#csrf').text();
		var data = {csrfmiddlewaretoken: csrf,
			comment: '',
			article: article_id,
			id: d.d_id};

		$.ajax({
				type: 'POST',
				url: '/hide_comment',
				data: data,
				success: function() {
					delete_summary_node(id);
					success_noty();
					make_progress_bar();
				},
				error: function() {
					error_noty();
				}
		});

	}
}

function delete_summary_node(id) {

	$('#comment_' +id).remove();

	d = nodes_all[id-1];
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
			for (var i=0; i<d.replace.length; i++) {
				d.replace[i].parent = parent;
				insert_node_to_children(d.replace[i], parent);
			}
		}
		if (d.children) {
			for (var i=0; i<d.children.length; i++) {
				d.children[i].parent = parent;
				insert_node_to_children(d.children[i], parent);
			}
		} else if (d._children) {
			for (var i=0; i<d._children.length; i++) {
				d._children[i].parent = parent;
				insert_node_to_children(d._children[i], parent);
			}
		}
	}

	update(d.parent);
}

function cascade_undo_collapses(d) {
	console.log(d.id);
	console.log('collapse false');
	d.collapsed = false;

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

function insert_node_to_children(node_insert, node_parent) {
	added = false;

	if (node_parent.children) {
		for (var i=0; i<node_parent.children.length; i++) {
			if (node_parent.children[i].size < node_insert.size) {
				node_parent.children.splice(i, 0, node_insert);
				added = true;
				break;
			}
		}

		if (!added) {
			node_parent.children.push(node_insert);
		}

	} else if (node_parent.replace) {
		for (var i=0; i<node_parent.replace.length; i++) {
			if (node_parent.replace[i].size < node_insert.size) {
				node_parent.replace.splice(i, 0, node_insert);
				added = true;
				break;
			}
		}

		if (!added) {
			node_parent.replace.push(node_insert);
		}
	}

}




function insert_node_to_un_children(node_insert, node_parent) {
	added = false;
	for (var i=0; i<node_parent._children.length; i++) {
		if (node_parent._children[i].size < node_insert.size) {
			node_parent._children.splice(i, 0, node_insert);
			added = true;
			break;
		}
	}
	if (!added) {
		node_parent._children.push(node_insert);
	}
}

function insert_node_to_replace(node_insert, node_parent) {
	added = false;
	for (var i=0; i<node_parent.replace.length; i++) {
		if (node_parent.replace[i].size < node_insert.size) {
			node_parent.replace.splice(i, 0, node_insert);
			added = true;
			break;
		}
	}
	if (!added) {
		node_parent.replace.push(node_insert);
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

function get_subtree_summarize(text, d, level) {
	if (level <= 2) {
		var lvl = level;
	} else {
		var lvl = 2;
	}

	if (d.children) {
		for (var i=0; i<d.children.length; i++) {

			if (d.children[i].summary != '' || d.children[i].extra_summary != '') {
				if (d.children[i].replace_node) {
					text += '<div id="sum_box_' + d.children[i].id + '" class="summary_box summarize_comment_comment level' + lvl + '"><P>ID: ' + d.children[i].d_id + ' | <a class="btn-xs btn-edit" onclick="copy_summary_node(' + d.children[i].id + ');">Promote Summary</a> | <a class="btn-xs btn-edit" onclick="copy_summary(' + d.children[i].id + ');">Copy Summary</a> | <a class="btn-xs btn-edit" onclick="cite_comment(' + d.children[i].d_id +');">Cite Summary</a></P><strong>Summary Node:</strong><BR>' + render_summary_node_edit(d.children[i]) + '</div>';
				} else {
					text += '<div id="sum_box_' + d.children[i].id + '" class="summarize_comment_comment level' + lvl + '"><P>ID: ' + d.children[i].d_id + ' | <a class="btn-xs btn-edit" onclick="copy_summary(' + d.children[i].id + ');">Copy Entire Summary</a> | <a class="btn-xs btn-edit" onclick="cite_comment(' + d.children[i].d_id +');">Cite Comment</a></P><strong>Summary: </strong> ' + render_summary_node_edit(d.children[i]) + '</div>';
				}
			} else {

				current_summarize_d_id.push(d.children[i].d_id);

				text += '<div id="sum_box_' + d.children[i].id + '" class="summarize_comment_comment level' + lvl + '"><P>ID: ' + d.children[i].d_id + ' | <a class="btn-xs btn-edit" onclick="cite_comment(' + d.children[i].d_id +');">Cite Comment</a></P>' + show_comment_text(d.children[i].name, d.children[i].d_id) + '<P>-- ' + d.children[i].author + '</P></div>';
			}
			if (!d.children[i].replace_node) {
				text = get_subtree_summarize(text, d.children[i], level+1);
			}
		}
	} else if (d._children) {
		for (var i=0; i<d._children.length; i++) {
			if (d._children[i].summary != '' || d._children[i].summary != '') {
				if (d._children[i].replace_node) {
					text += '<div id="sum_box_' + d._children[i].id + '" class="summarize_comment_comment summary_box level' + lvl + '"><P>ID: ' + d._children[i].d_id + ' | <a class="btn-xs" btn-edit onclick="copy_summary_node(' + d._children[i].id + ');">Promote Summary</a> | <a class="btn-xs" btn-edit onclick="copy_summary(' + d._children[i].id + ');">Copy Summary</a> | <a class="btn-xs btn-edit" onclick="cite_comment(' + d._children[i].d_id +');">Cite Summary</a></P><strong>Summary Node:</strong><BR>' + render_summary_node_edit(d._children[i]) + '</div>';
				} else {
					text += '<div id="sum_box_' + d._children[i].id + '" class="summarize_comment_comment level' + lvl + '"><P>ID: ' + d._children[i].d_id + ' | <a class="btn-xs btn-edit" onclick="copy_summary(' + d._children[i].id + ');">Copy Entire Summary</a> | <a class="btn-xs btn-edit" onclick="cite_comment(' + d._children[i].d_id +');">Cite Comment</a></P><strong>Summary:</strong> ' + render_summary_node_edit(d._children[i]) + '</div>';
				}
			} else {

				current_summarize_d_id.push(d._children[i].d_id);

				text += '<div id="sum_box_' + d._children[i].id + '" class="summarize_comment_comment level' + lvl + '"><P>ID: ' + d._children[i].d_id + ' | <a class="btn-xs btn-edit" onclick="cite_comment(' + d._children[i].d_id +');">Cite Comment</a></P>' + show_comment_text(d._children[i].name, d._children[i].d_id) + '<P>-- ' + d._children[i].author + '</P></div>';
			}
			text = get_subtree_summarize(text, d._children[i], level+1);
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

		history.pushState(null, "", `#comment_${child.id}`)
	}
}

function load_permalink() {
	var comment = $(location.hash);

	if (comment.length) {
		$("#box").scrollTo(comment, 500);
	}
	else if (location.hash) {
		var id = (location.hash.match(/comment_(\d+)/) || [])[1];

		if (id) {
			$(`#node_${id}`).d3Click();
		}

	}
	else {
		$("#node_2").d3Click();
	}
}

$(window).bind("hashchange popstate", load_permalink);

// Make permalinks work when page is loaded
if (location.hash) {
	$(load_permalink);
}

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

function cite_comment(did) {
	var box = $('#' + activeBox + '_comment_textarea');
	var cursorPos = box.prop('selectionStart');
    var v = box.val();
    var textBefore = v.substring(0,  cursorPos );
    var textAfter  = v.substring( cursorPos, v.length );
    box.val( textBefore + '[[comment_' + did +']]\n' + textAfter );
}

function delete_children_boxes(node) {
	if (node.children) {
		for (var i=0; i<node.children.length; i++) {
			$('#comment_' + node.children[i].id).remove();
			delete_children_boxes(node.children[i]);
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

function make_filter() {
	text = '<div style="display: inline-block; width: 160px;" id="filter_typeahead"><input required class="typeahead form-control input-sm" id="inputFilter" placeholder="Filter by tag or username"></div>';

	$('#filter').html(text);

	if (filter != '') {
		$('#inputFilter').val(filter);
		$('#inputFilter').css('background-color','yellow');
	}
	
	var tag_suggestions = new Bloodhound({
	  datumTokenizer: Bloodhound.tokenizers.whitespace,
	  queryTokenizer: Bloodhound.tokenizers.whitespace,
	  prefetch: {
	  	url:'/tags_and_authors?article=' + article_url + '&num=' + num + '&owner=' + owner,
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
	        window.location.href = '/visualization_flags?article=' + article_url + '&num=' + num + '&filter=' + filter + '&owner=' + owner;
	    }
	});
}

function add_global_perm(access) {
	var csrf = $('#csrf').text();
	var data = {
		csrfmiddlewaretoken: csrf,
		access: access,
		article: article_url,
		num: num,
		owner: owner,
		};

	$.ajax({
			type: 'POST',
			url: '/add_global_perm',
			data: data,
			success: function(res) {
				success_noty();
				$('#access_mode').text(access + ' | Share');
				if (access == "Publicly Editable") {
					$('#access_mode').attr('data-access', '1');
				} else if (access == "Publicly Viewable") {
					$('#access_mode').attr('data-access', '3');
				} else if (access == "Private") {
					$('#access_mode').attr('data-access', '4');
				}
			},
			error: function() {
				error_noty();
			}
	});
	
}

function add_user_perm(username, access, delete_perm, delete_row) {
	var csrf = $('#csrf').text();
	var data = {
		csrfmiddlewaretoken: csrf,
		username: username,
		access: access,
		article: article_url,
		num: num,
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
					text += '<ul class="dropdown-menu permission-menu"><li><a href="#">Edit Access</a></li>';
					text += '<li><a href="#">View Access</a></li></ul></div></td>';
					text += '<td><button type="button" class="btn btn-default btn-xs btn-success update_user_perm">Update</button>';
					text += '</td><td><button type="button" class="btn btn-default btn-xs btn-danger delete_user_perm">Delete</button></td></tr>';
					
					$('#user_perm_table > tbody:last-child').after(text);
					
					$(".permission-menu li a").click(function(){
						$(this).parent().parent().prev().html($(this).text() + ' <span class="caret"></span>');
				   });
				   
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
	   });
}

function make_highlight() {
	text = '<input type="text" class="form-control input-sm" id="inputHighlight" placeholder="Highlight text" style="display: inline; width: 125px; margin-right: 10px;">';
	text += '<span id="count_result"></span>';
	$('#node_highlight').html(text);

	$('#inputHighlight').keyup(function (e) {
	 	$('#box').unhighlight();
	  	for (var i=1; i<nodes_all.length; i++) {
				d3.select("#node_" + nodes_all[i].id)
						.style("fill", color);
		}

		$('#count_result').text('0');


	  	highlight_text = $('#inputHighlight').val();
	  	count = 0;
	  	if (highlight_text.length > 0) {
	  		var pattern = new RegExp('\\b' + highlight_text.toLowerCase() + '\\b');
		  	for (var i=1; i<nodes_all.length; i++) {
		  		text = nodes_all[i].name;
		  		if (pattern.test(text.toLowerCase())) {
		  			d3.select("#node_" + nodes_all[i].id)
						.style("fill","#ffd700");
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


function initiateDrag(d, domNode) {
    draggingNode = d;

    d3.selectAll(".clicked").classed("clicked", false);
    unhighlight_all();

    d3.select(domNode).select('.ghostCircle').attr('pointer-events', 'none');
        d3.selectAll('.ghostCircle').attr('class', 'ghostCircle show');
        d3.select(domNode).attr('class', 'node activeDrag');


    svg.selectAll("g.node").sort(function(a, b) { // select the parent and sort the path's
            if (a.id != draggingNode.id) return 1; // a is not the hovered element, send "a" to the back
            else return -1; // a is the hovered element, bring "a" to the front
        });

    nodes = tree.nodes(d);

    // if nodes has children, remove the links and nodes
    if (nodes.length > 1) {
        // remove link paths
        links = tree.links(nodes);
        nodePaths = svg.selectAll("path.link")
            .data(links, function(d) {
                return d.target.id;
            }).remove();
        // remove child nodes
        nodesExit = svg.selectAll("g.node")
            .data(nodes, function(d) {
                return d.id;
            }).filter(function(d, i) {
                if (d.id == draggingNode.id) {
                    return false;
                }
                return true;
            }).remove();
    }

    // remove parent link
    parentLink = tree.links(tree.nodes(draggingNode.parent));
    svg.selectAll('path.link').filter(function(d, i) {
        if (d.target.id == draggingNode.id) {
            return true;
        }
        return false;
    }).remove();

    dragStarted = null;
}

function dragmove(d) {
    if (d.article || d.parent_node) {
        return;
    }
    if (dragStarted) {
        domNode = this;
        initiateDrag(d, domNode);
        dragStarted = null;
    }

    $('#expand').hide();


    x = d3.event.x, y = d3.event.y;

	node = d3.select(this);
	node.attr("transform", "translate(" + x+ "," + y + ")");
	updateTempConnector();
}

  var overCircle = function(d) {
  		if (d != draggingNode) {
	        selectedNode = d;
	        updateTempConnector();
	    }
    };
    var outCircle = function(d) {
        selectedNode = null;
        updateTempConnector();
    };

 var updateTempConnector = function() {
        if (draggingNode !== null && selectedNode !== null) {
        	node = d3.select('#node_' + selectedNode.id);
            node.attr("r", 20)
            	.attr('class', 'selected');

        } else {
        	d3.selectAll('.selected')
        	.classed("selected", false)
        	.attr('r', function(d) {
        		return (d.size + 400 )/65;
        	});
        }
};

function expand(d) {
	if (d.replace_node) {
		show_replace_nodes(d.id);
	} else {
		expand_recurs(d);
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
}

function dragend(d) {
 	if (d.article || d.parent_node) {
        return;
    }

    domNode = this;
    if (selectedNode) {
        save_node_position();
    } else {

    	d.x0 = 0;
		d.y0 = 0;

		node = d3.select(this);
		node
		.attr("transform", "translate(" + d.y0 + "," + d.x0 + ")")
		.attr("r", function(d) {

	    	if (d.replace_node || d.summary != '') {
				num_words = wordCount(d.summary + ' ' + d.extra_summary)
			} else {
				num_words = wordCount(d.name)
			}

	      	total = num_words/20 + 5;


	      	if (total > 18) {
	      		return 15;
	      	} else if (total < 8) {
	      		return 8;
	      	} else {
	      		return total;
	      	}
	    });
        endDrag();
    }
}

function save_node_position() {

	var csrf = $('#csrf').text();
	data = {csrfmiddlewaretoken: csrf,
			new_parent: selectedNode.d_id,
			node: draggingNode.d_id};

	$.ajax({
		type: 'POST',
		url: '/move_comments',
		data: data,
		success: function(res) {


			// now remove the element from the parent, and insert it into the new elements children
	        var index = draggingNode.parent.children.indexOf(draggingNode);
	        if (index > -1) {
	            draggingNode.parent.children.splice(index, 1);
	        }
	        draggingNode.parent = selectedNode;
	        if (typeof selectedNode.children !== 'undefined' || typeof selectedNode._children !== 'undefined') {
	            if (typeof selectedNode.children !== 'undefined') {
	            	insert_node_to_children(draggingNode, selectedNode);
	            } else {
	            	insert_node_to_un_children(draggingNode, selectedNode);
	            }
	        } else {
	        	if (selectedNode.replace_node) {
	        		insert_node_to_replace(draggingNode, selectedNode);
	        	} else {
	        		selectedNode.children = [];
	            	selectedNode.children.push(draggingNode);
	        	}
	        }
	        // Make sure that the node being added to is expanded so user can see added node is correctly moved
	        expand(selectedNode);

	        draggingNode.x0 = 0;
			draggingNode.y0 = 0;

	        endDrag();

			success_noty();
		},
		error: function() {

			draggingNode.x0 = 0;
			draggingNode.y0 = 0;

			node = d3.select('#node_' + draggingNode.id);
			node.attr("transform", "translate(" + draggingNode.y0 + "," + draggingNode.x0 + ")")
				.attr("r", function(d) {
			      	return (d.size + 400 )/65;
			    });

	        endDrag();

			error_noty();
		}
	});
}


function endDrag() {
    selectedNode = null;
    d3.selectAll('.ghostCircle').attr('class', 'ghostCircle');
    d3.select(domNode).attr('class', 'node');
    // now restore the mouseover event or we won't be able to drag a 2nd time
    d3.select(domNode).select('.ghostCircle').attr('pointer-events', '');
    updateTempConnector();
    if (draggingNode !== null) {

    	d3.select("#node_" + draggingNode.id)
			.attr("transform", "translate(" + 0 + "," + 0 + ")");

        update(draggingNode.parent);

        draggingNode = null;
    }
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

function update(source) {
  

  // Compute the flattened node list. TODO use d3.layout.hierarchy.
  var nodes = tree.nodes(root);

  var height = Math.max($(window).height() - 250, 100 + nodes.length * barHeight + margin.top + margin.bottom);

  d3.select("svg").transition()
      .duration(duration)
      .attr("height", height);

  d3.select("rect").transition()
      .duration(duration)
      .attr("height", height);

  d3.select(self.frameElement).transition()
      .duration(duration)
      .style("height", height + "px");

  // Compute the "layout".
  nodes.forEach(function(n, i) {
    n.x = (i * barHeight) + 100;
    n.y = n.y + 100;
  });

  // Update the nodes…
  var node = svg.selectAll("g.node")
      .data(nodes, function(d) {
	      	if (d.id) {
	      		nodes_all[d.id-1] = d;
	      		return d.id;
	      	} else {
	      		d.id = ++i;
	      		nodes_all[d.id-1] = d;
	      		return d.id;
	      	}
      	});

  var nodeEnter = node.enter().append("g")
      .attr("class", "node")
      .attr("transform", function(d) { return "translate(" + source.y0 + "," + source.x0 + ")"; })
      .style("opacity", 1e-6);

  var node_drag = d3.behavior.drag()
  	.origin(function(d) { return {x: 0, y: 0}; })
    .on("dragstart", dragstart)
    .on("drag", dragmove)
    .on("dragend", dragend);


  // Enter any new nodes at the parent's previous position.
  nodeEnter.append("path")
  	  .attr("d", function(d) {
  	  	if (!(d.children || d._children || d.replace_node)) {
  	  		return "M0,5c0-1.4,0-5,0-5s3.7,0,5,0c2.8,0,5,2.2,5,5s-2.2,5-5,5S0,7.8,0,5z";
  	  	} else {
  	  		return "M-10,0a10,10 0 1,0 20,0a10,10 0 1,0 -20,0";
  	  	}
  	  })
      .attr("height", barHeight)
      .style("stroke-width", stroke_width)
      .style("stroke", stroke)
      .style("fill", color)
      .attr("id", function(d) { return 'node_' + d.id; })
      .attr("vector-effect", "non-scaling-stroke")
      .style("transform", function(d) {
      		if (d.article) {
	      		return "";
	      	}

			if (d.replace_node || d.summary != '') {
				num_words = wordCount(d.summary + ' ' + d.extra_summary)
			} else {
				num_words = wordCount(d.name)
			}

	      	total = num_words/20 + 5;

	      	if ((total/10 < 1.3) && !(d.children || d._children || d.replace_node)) {
	      		return "scale(1.3)";
	      	}

	      	if (total > 18) {
	      		return "scale(1.5)";
	      	} else if (total < 8) {
	      		return "scale(0.8)";
	      	} else {
	      		return `scale(${total/10})`;
	      	}
      })
      .on("click", function(d) {
      	
      	if (d3.event.ctrlKey || d3.event.metaKey) {
      		clicked = d3.selectAll(".clicked")[0];

			console.log(clicked.length);
      		clicked_ids = [];
      		
      		for (var i=0; i<clicked.length; i++) {
      			clicked_ids.push(parseInt(clicked[i].id.substring(5)));
      		}
      		
    		if ($('#node_' + d.id).css('stroke-width') == "0px") {
    			clicked_ids.push(d.id);
    			highlight_node(d.id);
    		} else if ( clicked.length == nodes_all.length - 2) {
    			unhighlight_all();
    			clicked_ids = [];
    			clicked_ids.push(d.id);
    			highlight_node(d.id);
    		} else {
    			var index = clicked_ids.indexOf(d.id);
				if (index !== -1) array.splice(index, 1);
				unhighlight_node(d.id);
    		}
    		
    		show_text('clicked');
      		if (highlight_text) {
	      		$('#box').highlight(highlight_text);
	      	}
      		
      		
	    } else {

      		clicked = d3.selectAll(".clicked")[0];
      		clicked_ids = [];

      		if ($('#node_' + d.id).css('stroke-width') != "0px") {
      			clicked_ids.push(d.id);
      		}

      		for (var i=0; i<clicked.length; i++) {
      			clicked_ids.push(parseInt(clicked[i].id.substring(5)));
      		}

      		if (!d.parent_node) {
      			if (d.replace_node) {
      				if (d.replace.length > 0) {
      					if (check_clicked_node(d, clicked_ids) && count_children(d) == clicked_ids.length) {
      						show_replace_nodes(d.id);
      					}
      				} else {
      					if (check_clicked_node(d, clicked_ids) && count_children(d) == clicked_ids.length) {
      						hide_replace_nodes(d.id);
      					}
      				}
      			}

		      	if (check_clicked_node(d, clicked_ids) && count_children(d) == clicked_ids.length) {
		      		click_node(d.id);
		      	}
		    }
	      	d3.selectAll(".clicked").classed("clicked", false);
	      	unhighlight_all();
	      	show_text(d);
	      	$('#box').scrollTop(0);
	      	if (highlight_text) {
	      		$('#box').highlight(highlight_text);
	      	}
	      }

      })
      .on("mouseover", showdiv)
      .on("mouseout", hidediv)
      .call(node_drag);

	nodeEnter.append("circle")
            .attr('class', 'ghostCircle')
            .attr("r", 20)
            .attr("opacity", 0.0) // change this to zero to hide the target area
        .style("fill", "red")
            .attr('pointer-events', 'mouseover')
            .on("mouseover", function(node) {
                overCircle(node);
            })
            .on("mouseout", function(node) {
                outCircle(node);
            });

  // Transition nodes to their new position.
  nodeEnter.transition()
      .duration(duration)
      .attr("transform", function(d) { return "translate(" + d.y + "," + d.x + ")"; })
      .style("opacity", 1);

  node.transition()
      .duration(duration)
      .attr("transform", function(d) { return "translate(" + d.y + "," + d.x + ")"; })
      .style("opacity", 1)
    .select("rect")
      .style("fill", color);

  // Transition exiting nodes to the parent's new position.
  node.exit().transition()
      .duration(duration)
      .attr("transform", function(d) { return "translate(" + source.y + "," + source.x + ")"; })
      .style("opacity", 1e-6)
      .remove();

  // Update the links…
  var link = svg.selectAll("path.link")
      .data(tree.links(nodes), function(d) {
      	if (d.source.article) {
      		return null;
      	} else {
      		return d.target.id;
      	}
      	});

  // Enter any new links at the parent's previous position.
  link.enter().insert("path", "g")
      .attr("class", "link")
      .attr("d", function(d) {
    	var o = {x: source.x0, y: source.y0};
    	return diagonal({source: o, target: o});
      })
      .attr("id", function(d) {
     	return 'link_' + d.source.id + '_' + d.target.id;
      })
    .transition()
      .duration(duration)
      .attr("d", diagonal);

  // Transition links to their new position.
  link.transition()
      .duration(duration)
      .attr("d", diagonal);

  // Transition exiting nodes to the parent's new position.
  link.exit().transition()
      .duration(duration)
      .attr("d", function(d) {
        var o = {x: source.x, y: source.y};
        return diagonal({source: o, target: o});
      })
      .remove();

  // Stash the old positions for transition.
  nodes.forEach(function(d) {
    d.x0 = d.x;
    d.y0 = d.y;
  });
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

	update(parent);

	d3.select('#node_' + parent.id).style('fill', color);
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
	if (d.children) {
		for (var i=0; i<d.children.length; i++) {
			expand_recurs(d.children[i]);
		}
	}
}


function collapse_node(id) {
  d = nodes_all[id-1];
	if (d._children) {
	    d.children = d._children;
	    d._children = null;
	  }
	if (d.children) {
		for (var i=0; i<d.children.length; i++) {
			collapse_recurs(d.children[i]);
		}
	}
  update(d);
  setTimeout( function(){
    show_text('clicked');
  }  , 2000 );

  return null;
}


function expand_node(id) {
  d = nodes_all[id-1];
  expand_recurs(d);
  update(d);
  return null;
}


function toggle_original(id) {
	$('#orig_' + id).toggle();
}



function construct_comment(d) {
	var text = "";
	var summary = !!(d.summary != '' || d.extra_summary != '');

	text += `<div id="comment_text_${d.id}">`;

	if (summary) {
		if (d.replace_node) {
			text += `<h6 align="right">Summary`;
		} else {
			text += `<h6 align="right">Summary`;
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
		
		text += `</h6><span id="flags-${d.id}" class="flags">`;
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
			text += `<h6 align="right">(Hidden) Comment by <span class="author" style="background-color: pink;">${d.author}</span>`;
		} else {
			text += `<h6 align="right">(Hidden) Comment by <span class="author">${d.author}</span>`;
		}

		if (d.size > 0) {
			text += ` (${d.size} `;
			if (d.size == 1) {
				text += `like)</h6>`;
			} else {
				text += `likes)</h6>`;
			}
		}
		text += `</h6>`;
		text += '<span class="original_comment">' + d.name + '</span>';
	}

	  else {

		highlight_authors = $('#highlight_authors').text().split(',');

		if (highlight_authors.indexOf(d.author) > -1) {
			text += `<h6 align="right">Comment by <span class="author" style="background-color: pink;">${d.author}</span>`;
		} else {
			text += `<h6 align="right">Comment by <span class="author">${d.author}</span>`;
		}

		if (d.size > 0) {
			text += ` (${d.size} `;
			if (d.size == 1) {
				text += `like)</h6>`;
			} else {
				text += `likes)</h6>`;
			}
		}
		text += `</h6>`;
		text += '<span class="original_comment">' + d.name + '</span>';
			}

	text += '</div>';

	if (d.tags.length > 0) {
		text += '<BR><div id="tags_' + d.id + '">Tags: ';
		for (var i=0; i<d.tags.length; i++) {
			if (is_dark(d.tags[i][1])) {
				text += '<a href="/visualization_flags?article=' + article_url + '&num=' + num + '&owner=' + owner + '&filter=Tag: ' + d.tags[i][0] + '">';
				text += '<button class="btn btn-xs" style="color: #FFFFFF; background-color: #' + d.tags[i][1] + '">' + d.tags[i][0] + '</button> ';
				text += '</a>';
			} else {
				text += '<a href="/visualization_flags?article=' + article_url + '&num=' + num + '&owner=' + owner + '&filter=Tag: ' + d.tags[i][0] + '">';
				text += '<button class="btn btn-xs" style="color: #000000; background-color: #' + d.tags[i][1] + '">' + d.tags[i][0] + '</button> ';
				text += '</a>';
			}
		}
		text += '</div><BR>';
	} else {
		text += '<div id="tags_' + d.id + '"></div><BR>';
	}

	if (summary) {
		if (d.editors && d.editors.length > 0) {
			text +='<div class="editors">Summary edited by: ';
			for (var i=0;i<d.editors.length; i++) {
				text += d.editors[i] + ', '
			}
			text = text.slice(0, -2);
			text += '</div>';
		}
		if (!d.replace_node) {
			text += '<P>';
			text += ' | <a onclick="toggle_original(' + d.id + ');">View Original Comment</a> | ';
			if ($('#access_mode').attr('data-access') == "1") {
				text += '<a data-toggle="modal" data-backdrop="false" data-did="' + d.d_id + '" data-target="#summarize_modal_box" data-type="edit_summarize_one" data-id="' + d.id + '">Edit Comment Summary</a> | ';
				text += '<a onclick="post_delete_comment_summary('+d.id+');">Delete Comment Summary</a> | ';
				text += '<a data-toggle="modal" data-backdrop="false" data-did="' + d.d_id + '" data-target="#evaluate_summary_modal_box" data-type="evaluate_summary" data-id="' + d.id + '">Evaluate Summary</a></P>';
			}
			text += '<div id="orig_' + d.id + '" style="display: none;" class="original_comment">' + d.name + '</div>';
		} else {
			if ($('#access_mode').attr('data-access') == "1") {
				
				text += `<footer>
					<a data-toggle="modal" data-backdrop="false" data-did="${d.d_id}" data-target="#summarize_multiple_modal_box" data-type="edit_summarize" data-id="${d.id}">Edit Summary</a>
					<a onclick="post_delete_summary_node(${d.id});">Delete Summary</a>
					<a data-toggle="modal" data-backdrop="false" data-did="${d.d_id}" data-target="#tag_modal_box" data-type="tag_one" data-id="${d.id}">Tag Summary</a>
					<a data-toggle="modal" data-backdrop="false" data-did="${d.d_id}" data-target="#evaluate_summary_modal_box" data-type="evaluate_summary" data-id="${d.id}">Evaluate Summary</a>
				</footer>`;
			}
		}
	}

	if ($('#access_mode').attr('data-access') == "1") {
		 if (!summary && d.name.length > 300) {
			text += '<footer>';
	
			if (!d.children && !d.replace_node) {
				text += '<a data-toggle="modal" data-backdrop="false" data-did="' + d.d_id + '" data-target="#summarize_modal_box" data-type="summarize_one" data-id="' + d.id + '">Summarize Comment</a>';
				text += '<a data-toggle="modal" data-backdrop="false" data-did="' + d.d_id + '" data-target="#tag_modal_box" data-type="tag_one" data-id="' + d.id + '">Tag Comment</a>';
				text += '<a data-toggle="modal" data-backdrop="false" data-did="' + d.d_id + '" data-target="#hide_modal_box" data-type="hide_comment" data-id="' + d.id + '">Mark Unimportant</a>';
				text += '<a data-toggle="modal" data-backdrop="false" data-did="' + d.d_id + '" data-target="#option_show_unimportant" data-type="show_unimportant" data-id="' + d.id + '">Show Hidden Comments</a>';
			} else if (!d.replace_node) {
				if (!(d.parent && d.parent.replace_node)) {
					text += '<a data-toggle="modal" data-backdrop="false" data-did="' + d.d_id + '" data-target="#summarize_multiple_modal_box" data-type="summarize" data-id="' + d.id + '">Summarize Comment + Replies</a>';
				}
	
				text += '<a data-toggle="modal" data-backdrop="false" data-did="' + d.d_id + '" data-target="#hide_modal_box" data-type="hide_replies" data-id="' + d.id + '">Mark Replies Unimportant</a>';
				text += '<a data-toggle="modal" data-backdrop="false" data-did="' + d.d_id + '" data-target="#summarize_modal_box" data-type="summarize_one" data-id="' + d.id + '">Summarize Comment</a>';
				text += '<a data-toggle="modal" data-backdrop="false" data-did="' + d.d_id + '" data-target="#tag_modal_box" data-type="tag_one" data-id="' + d.id + '">Tag Comment</a>';
			}
	
			text += '</footer>';
		} else if (!d.replace_node) {
			text += '<footer>';
	
			if (!d.children) {
				text += '<a data-toggle="modal" data-backdrop="false" data-did="' + d.d_id + '" data-target="#tag_modal_box" data-type="tag_one" data-id="' + d.id + '">Tag Comment</a>';
				text += '<a data-toggle="modal" data-backdrop="false" data-did="' + d.d_id + '" data-target="#hide_modal_box" data-type="hide_comment" data-id="' + d.id + '">Mark Unimportant</a>';
			} else {
				if (!(d.parent && d.parent.replace_node)) {
					text += '<a data-toggle="modal" data-backdrop="false" data-did="' + d.d_id + '" data-target="#summarize_multiple_modal_box" data-type="summarize" data-id="' + d.id + '">Summarize Comment + Replies</a>';
				}
	
				text += '<a data-toggle="modal" data-backdrop="false" data-did="' + d.d_id + '" data-target="#hide_modal_box" data-type="hide_replies" data-id="' + d.id + '">Mark Replies Unimportant</a>';
				text += '<a data-toggle="modal" data-backdrop="false" data-did="' + d.d_id + '" data-target="#tag_modal_box" data-type="tag_one" data-id="' + d.id + '">Tag Comment</a>';
			}
	
			text += '</footer>';
		}

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
			var collapsed = d.children[i].collapsed && !d.children[i].replace_node? "collapsed" : "";
			var summary = d.children[i].summary && !d.children[i].replace_node? "summary" : "";
			var hiddennode = d.children[i].hiddennode && !d.children[i].replace_node? "hiddennode" : "";


			text += `<article class="comment_box ${summaryClass} ${levelClass} ${collapsed} ${summary} ${hiddennode}" id="comment_${d.children[i].id}">`;

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
	parent = d.parent;
	highlight_node(parent.id);
	highlight_link(parent.id, id);
	show_text('clicked');
}

function show_text(d) {
	if (d && d != 'clicked') {
		clear_box_top();
		parent = d.parent;
		if (d.article) {
			var text = '';
			text = get_subtree_box(text, d, 0);
		} else {
			var summaryClass = d.replace_node? "summary_box" : "";
			var collapsed = d.collapsed && !d.replace_node? "collapsed" : "";
			var summary = d.summary && !d.replace_node? "summary" : "";
			var hiddennode = d.hiddennode && !d.replace_node? "hiddennode" : "";

			var text = `<article class="comment_box ${summaryClass} ${collapsed} ${summary} ${hiddennode}" id="comment_${d.id}">`;

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
		}
		$('#box').html(text);
		author_hover();
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
		d3.selectAll('.clicked').each( function(data) {
			if (!data.article) {
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
			var summary = objs[i].summary && !objs[i].replace_node? "summary" : "";
			var hiddennode = objs[i].hiddennode && !objs[i].replace_node? "hiddennode" : "";

			text += `<article class="comment_box ${summaryClass} ${levelClass} ${collapsed} ${summary} ${hiddennode}" id="comment_${objs[i].id}">`;

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
			author_hover();
		};
	}

	$('.comment_box').hover(
		  function() {
		    var id = parseInt(this.id.substring(8));
		    extra_highlight_node(id);
		  }, function() {
		    var id = parseInt(this.id.substring(8));
		    unextra_highlight_node(id);
		  }
	);
}

function extra_highlight_node(id) {
	if (id != 1) {
		d3.select("#node_" + id)
			.style("stroke","#d73c37")
			.style("stroke-width", stroke_width);
		highlight_box(id);
	}
}

function unextra_highlight_node(id) {
	if (id != 1) {
		d3.select("#node_" + id)
			.style("stroke","#000000")
			.style("stroke-width", stroke_width);
		highlight_box(id);
	}
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
	
	if ($('#access_mode').attr('data-access') != "1") {
		return;
	}

	var parent_node = null;

	accepted = true;
	count = 0;

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

	if (accepted && count > 1 && !parent_node.replace_node) {
		 var text = '<BR> <a class="btn btn-xs btn-info" data-toggle="modal" data-backdrop="false" data-target="#summarize_multiple_modal_box" data-type="summarize_selected">Summarize + Group Selected</a><BR>';
		 text += '<a class="btn btn-xs btn-info" data-toggle="modal" data-backdrop="false" data-target="#hide_modal_box" data-type="hide_all_selected">Hide selected</a><BR>';
		 text += '<a class="btn btn-xs btn-info" data-toggle="modal" data-backdrop="false" data-target="#tag_modal_box" data-type="tag_selected">Tag Selected</a>';

		$('#box_top').html(text);
	}
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
	var offset = $('svg').offset();
	var width = $('#expand').width();
	var node_width = 0;
	if (d.article) {
		node_width = 10;
	} else {
		node_width = (d.size + 400)/65;
	}
	$('#expand').css({top: offset.top + d.x + 22,
		left: offset.left + d.y + ((d.size + 100)/60) - width + 10 - node_width});
}

function showdiv(d) {
	if (!isMouseDown) {
		if (d.replace_node) {
			clearTimeout(timer);

			text = '';
			if (comment_id != d.d_id) {
				if (text != '') {
					text += '<BR>';
				}
				text += '<a href="/subtree?article=' + article_url + '&comment_id=' + d.d_id + '&num=' + num + '&owner=' + owner + '">See Isolated Subtree</a>';
				text += '<BR><a onclick="expand_all(' + d.id + ')">Expand everything</a>';
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
					text = '<a href="/visualization_flags?article=' + article_url + '&num=' + num + '&owner=' + owner + '">See Entire Discussion</a>';
				}
			} else {
				if (comment_id != d.d_id) {
					if (text != '') {
						text += '<BR>';
					}
					text += '<a href="/subtree?article=' + article_url + '&comment_id=' + d.d_id + '&num=' + num + '&owner=' + owner +'">See Isolated Subtree</a>';
				

				}
			}
			text += '<BR><a onclick="expand_all(' + d.id + ')">Expand everything</a>';

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
		}

		if (d3.select(this).classed("clicked")) {
			extra_highlight_node(d.id);
			highlight_box(d.id);
			hover_timer = window.setTimeout(function(d) {
				$("#box").scrollTo("#comment_" + d.id, 500);
			}, 500, d);
		}
	}
}


function hide_replace_nodes(id) {
	d = nodes_all[id-1];

	delete_children_boxes(d);
	if (d.children) {
		if (!d.replace) {
			d.replace = [];
		}
		for (var i=0; i<d.children.length; i++) {
			d.replace.push(d.children[i]);
		}
		d.children = null;
		update(d);
	}
	text = '';
	if (comment_id != d.d_id) {
		text += '<a href="/subtree?article=' + article_url + '&comment_id=' + d.d_id + '&num=' + num + '&owner=' + owner + '">See Isolated Subtree</a>';
		text += '<BR><a onclick="expand_all(' + d.id + ')">Expand everything</a>';
	}
	if (text != '') {
		$('#expand').html(text);
	} else {
		$('#expand').html("");
	}
}

function show_replace_nodes(id) {
	d = nodes_all[id-1];
	if (d.replace) {
		if (!d.children) {
			d.children = [];
		}
		for (var i=0; i<d.replace.length; i++) {
			d.children.push(d.replace[i]);
		}
		d.replace = [];
		update(d);
	}

	text = '';
	if (comment_id != d.d_id) {
		text += '<a href="/subtree?article=' + article_url + '&comment_id=' + d.d_id + '&num=' + num + '&owner=' + owner + '">See Isolated Subtree</a>';
		text += '<BR><a onclick="expand_all(' + d.id + ')">Expand everything</a>';

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
	}
}

function hide_hidden(id) {
	d = nodes_all[id-1];
	newchildren = [];

	$($('#expand').children()[$('#expand').children().length-1]).attr("onclick","show_hidden("+id+")");
	$($('#expand').children()[$('#expand').children().length-1]).text('Show ' + d.hidconstant + ' hidden');
	

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

	if (d.hashidden) {
		d.hashidden = false;
		update(d);
	}
}


function hidediv(d) {
	if (!isMouseDown && d3.select(this).classed("clicked")) {
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

function color(d) {

	if (d.parent_node) {
		return "#cccccc";
	}

	if (d.replace_node) {
		return "#ee7600";
	}

	if (d.article) {
		return "#ffffff";
	}

	if (d.collapsed) {
		if (d.summary) {
			return "url(#gradientorange)";
		}
		
		if (d.hiddennode) {
			return "#990000";
		}
		return "#f8c899";
	}

	if (d.summary) {
		return "url(#gradientblue)";
	}


	if (d.hiddennode) {
		return "#990000";
	}

	return "#a1c5d1";

}

function count_unsummarized_words(d) {
	count = 0;
	if (d.replace_node) {
		count += d.summary.split(/\s+/).length;
		count += d.extra_summary.split(/\s+/).length;
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

		if (!d.article && !d.parent_node) {
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
	return count;
}

function make_progress_bar() {
	num_words_all = count_all_words(nodes_all[0]);
	console.log(num_words_all);

	num_words_still = count_unsummarized_words(nodes_all[0]);
	console.log(num_words_still);

	if (num_words_all >= 250) {
		num_words_all = num_words_all - 250;
		num_words_still = num_words_still - 250;
	} else {
		var half = num_words_all/2;
		num_words_all = num_words_all - half;
		num_words_still = num_words_still - half;
	}

	value = Math.round((1 - (num_words_still/num_words_all)) * 100);
	if (value > 100) {
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
	var isValid = summaryWords < max_length;

	var $wordcount = $(this).prevAll(".wordcount");
	$wordcount.text(`${summaryWords}/${max_length}`);
	$wordcount.toggleClass("invalid", !isValid);

	this.setCustomValidity(isValid? "" : "Summary is too long");
})