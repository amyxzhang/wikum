var timer = null;
var isClick = true;
var isClick2 = true;
var isMouseDown = false;
var hover_timer = null;
var highlighted_text = null;
var highlighted_comm = null;
var highlight_text = null;
var ctrlIsPressed = false;
var lastClicked = null;
var clicked_dids = {};
var article_id = $('#article_id').text();

/* Outline View Visualization */

$(document).keydown(function(evt) {
    if (evt.ctrlKey || evt.metaKey) {
    	ctrlIsPressed = true;
    	clicked_dids = {};
    } else {
    	ctrlIsPressed = false;
    }
});

$(document).keyup(function(evt){
	if (evt.originalEvent.key === 'Meta' || evt.originalEvent.key === 'Control') {
    	ctrlIsPressed = false;
    }
});

document.addEventListener('visibilitychange', function () {
    if (document.hidden) {
        ctrlIsPressed = false;
    }
});

var nodes_all = null;

var article_url = $('#article_url').text();
var owner = getParameterByName('owner');
article_url = article_url.replace('#','%23');

var sort = getParameterByName('sort');
if (!sort) {
	sort = "default";
}
var next = parseInt(getParameterByName('next'));
if (!next) {
	next = 0;
}
var num = parseInt(getParameterByName('num'));
if (!num) {
	num = 0;
}
var comment_id = parseInt(getParameterByName('comment_id'));
if (!comment_id) {
	comment_id = '';
}
var filter = getParameterByName('filter');
if (!filter) {
	filter = '';
}
var colorby = getParameterByName('colorby');
if (!colorby) {
	colorby = 'summarized';
}

make_stats();

make_color();

make_dropdown();

make_filter();

make_highlight();

var article_id = $("#article_id").text();


$('#menu-view').children().first().css({'background-color': '#42dca3'});	
$('#menu-view').children().eq(0).children().first().attr('href', `/visualization_flags?id=${article_id}&owner=${owner}`);
$('#menu-view').children().eq(1).children().first().attr('href', `/subtree?id=${article_id}&owner=${owner}`);
$('#menu-view').children().eq(2).children().first().attr('href', `/cluster?id=${article_id}&owner=${owner}`);
$('#menu-view').children().eq(3).children().first().attr('href', `/history?id=${article_id}&owner=${owner}`);
$('#menu-view').children().eq(4).children().first().attr('href', article_id);

make_username_typeahead();

$.ajax({type: 'GET',	
	url: '/subtree_data?id=' + article_id + '&sort=' + sort + '&next=' + next + '&owner=' + owner + '&comment_id=' + comment_id,	
	success: function(flare) {
		if (!flare.no_subtree) {
			var outline = createOutlineString(flare);
			document.getElementById("outline").innerHTML = outline;
			setSortables();

			redOutlineBorder(document.getElementById("viewAll"));

			nodes_all = update_nodes_all(flare);
			show_text(nodes_all[0]);
			make_progress_bar();

			var next_sub = next + 1;
			var url = "/subtree?id=" + article_id + '&num=' + num + '&owner=' + owner + '&sort=' + sort + '&colorby=' + colorby  + '&next=';
			var text = '<a class="btn btn-xs btn-primary" href="' +url + next_sub + '">New subtree &gt;&gt;</a>';
			console.log(text);
			$('#paginate').html(text);

			$('body').on('mouseenter', '.marker', function() {
				// hover gray background text
				$(this).next().addClass('outline-hover');
			});

			$('body').on('mouseleave', '.marker', function() {
				// circle marker in red
				$(this).next().removeClass('outline-hover');
			});

			// .outline-text functions
			var delay=500, setTimeoutConst;
			$('body').on('mouseenter', '.outline-text', function() {
				// circle marker in red
				$(this).prev().addClass('outline-hover');
				// highlight associated comment box
				let did = this.id.substring(13);
				if (did === 'viewAll') {
					setTimeoutConst = setTimeout(function() {
						$('#box').animate({scrollTop: 0}, 500);
					}, delay);
				} else {
					let comment_box = $(".comment_box[data-did='" + did +"']");
					if (comment_box && comment_box.length) {
						highlight_box(comment_box[0].id.substring(8));
						setTimeoutConst = setTimeout(function() {
							$("#box").scrollTo("#" + comment_box[0].id, 500);
						}, delay);
						
					}
				}
			});

			$('body').on('mouseleave', '.outline-text', function() {
				// removed red circle marker
				$(this).prev().removeClass('outline-hover');
				// highlight associated comment box
				let did = this.id.substring(13);
				if (did === 'viewAll') {
					clearTimeout(setTimeoutConst);
				} else {
					let comment_box = $(".comment_box[data-did='" + did +"']");
				
					if (comment_box && comment_box.length) {
						highlight_box(comment_box[0].id.substring(8));
						clearTimeout(setTimeoutConst);
					}
				}
			});

			$('body').on('click', '#down-arrow', function(evt) {
				var outlineItem = $(this).parent()[0];
				var child = $(this).parent().next()[0];
				let id = outlineItem.id;
				var d = id === 'viewAll' ? nodes_all[0] : nodes_all.filter(o => o.d_id == id)[0];
		    	if (child) {
		    		collapse(d);
		    	}
		    	else {
		    		expand(d);
		    	}
			});

			$('body').on('click', '.list-group-line', function(evt) {
				var selectGroup = $(this).closest('.list-group-item').children(":first").get(0);
				d = selectGroup ? nodes_all.filter(o => o.d_id == selectGroup.id)[0] : nodes_all[0];
				var outlineText = $(selectGroup).children('.outline-text')[0];
				var child = $(selectGroup).next().get(0);
				if (lastClicked === outlineText) {
		    		if (child) {
			    		collapse(d);
			    	}
			    	else {
			    		expand(d);
			    	}
		    	} else {
				    // highlight this and children
				    redOutlineBorder(selectGroup);
				    // show appropriate comment boxes
				    show_text(d);
		    	}
		    	lastClicked = outlineText;
			});

			$('body').on('mouseenter', '.list-group-line', function(evt) {
				$(this).closest('.list-group').children('.list-countainer').each(function () {
					$(this).children('.list-group-line').addClass('line-hover');
				});
			});

			$('body').on('mouseleave', '.list-group-line', function(evt) {
				$(this).closest('.list-group').children('.list-countainer').each(function () {
					$(this).children('.list-group-line').removeClass('line-hover');
				});
			});

			$('body').on('click', '.outline-text, .marker', function(evt) {
				var parent = $(this).parent();
				var outlineText = $(this).parent().children('.outline-text')[0];
			    if (ctrlIsPressed) {
			    	$('.rb-red').removeClass('rb-red');
			    	$('.outline-selected').removeClass('outline-selected');
			    	let did = outlineText.id.substring(13);
			    	if (did !== 'viewAll') {
			    		let outlineItem = $(outlineText).parent()[0];
				    	if (!(did in clicked_dids)) {
				    		clicked_dids[did] = 1;
				    	} else if (clicked_dids[did] === 0) {
				    		clicked_dids[did] = 1;
				    	} else if (clicked_dids[did] === 1) {
				    		// clicked outline item is already in clicked_dids
				    		clicked_dids[did] = 0;
				    	}
				    }

				    for (const did in clicked_dids) {
				    	if (clicked_dids[did] === 1) {
				    		$('.outline-item#' + did).addClass('rb-red');
				    		/* outline the circle */
							$('#marker-' + did).addClass('outline-selected');
				    	}
				    }
					show_text('clicked');
			  		if (highlight_text) {
			      		$('#box').highlight(highlight_text);
			      	}
			    } else {
			    	var outlineItem = $(outlineText).parent()[0];
				    var child = $(outlineText).parent().next()[0];
				    // show only this item and children (subtree)
					let id = outlineText.id.substring(13);
				    d = id === 'viewAll' ? nodes_all[0] : nodes_all.filter(o => o.d_id == id)[0];
			    	if (lastClicked === outlineText) {
			    		if (child) {
				    		collapse(d);
				    	}
				    	else {
				    		expand(d);
				    	}
			    	} else {
					    // highlight this and children
					    redOutlineBorder(outlineItem);
					    // show appropriate comment boxes
					    show_text(d);
			    	}
			    	lastClicked = outlineText;
			    }
			});

			var expandDelay=1000, expandSetTimeoutConst;
			$('body').on('mouseenter', '.outline-item', function() {
				// show #expand div
				let id = this.id;
				expandSetTimeoutConst = setTimeout(function() {
						var d = id === 'viewAll' ? nodes_all[0] : nodes_all.filter(o => o.d_id == id)[0];
						showdiv(d);
					}, expandDelay);
			});

			$('body').on('mouseleave', '.outline-item', function() {
				// show #expand div
				let id = this.id;
				var d = id === 'viewAll' ? nodes_all[0] : nodes_all.filter(o => o.d_id == id)[0];
				hidediv(d);
				clearTimeout(expandSetTimeoutConst);
			});

			// $('body').on('mouseleave', '#expand', function() {
			// 	// hide #expand div if move mouse out of #outline
			// 	$('#expand').hide();
			// });

			// viz functions
			$('#viz').on('click', function(evt) {
				if (!($(evt.target).hasClass('list-group-line') || $(evt.target).hasClass('list-group-item') || $(evt.target).hasClass('outline-item') || $(evt.target).hasClass('outline-text') || $(evt.target).hasClass('marker'))) {
					redOutlineBorder($('#outline').children(":first").children('.list-group'));
					show_text(nodes_all[0]);
					lastClicked = $('#outline-text-viewAll');
				}
			});
		} else {
			$('#box').text('There are no more subtrees to summarize!');
		}
	},
	error: function() {
		error_noty();
	}
});

function make_dropdown() {
	var sort_num = 0;
	if (sort == "id") {
		sort_num = 1;
	} else if (sort == "likes") {
		sort_num = 2;
	} else if (sort == "replies") {
		sort_num = 3;
	} else if (sort == "long") {
		sort_num = 4;
	} else if (sort == "short") {
		sort_num = 5;
	} else if (sort == "newest") {
		sort_num = 6;
	} else if (sort == "oldest") {
		sort_num = 7;
	}

	$('#menu-sort').children().eq(sort_num).css({'background-color': '#42dca3'});
	$('#menu-sort').children().eq(sort_num).addClass('disabled-menu');

	$('#menu-sort').children().eq(sort_num).children().first().on('click', function() {
	    return false;
	});

	var url = "/visualization_flags?id=" + article_id + '&filter=' + filter + '&owner=' + owner + '&colorby=' + colorby  + '&sort=';
	$('#menu-sort').children().eq(0).children().first().attr('href', String(url + 'default'));
	$('#menu-sort').children().eq(1).children().first().attr('href', String(url + 'id'));
	$('#menu-sort').children().eq(2).children().first().attr('href', String(url + 'likes'));
	$('#menu-sort').children().eq(3).children().first().attr('href', String(url + 'replies'));
	$('#menu-sort').children().eq(4).children().first().attr('href', String(url + 'long'));
	$('#menu-sort').children().eq(5).children().first().attr('href', String(url + 'short'));
	$('#menu-sort').children().eq(6).children().first().attr('href', String(url + 'newest'));
	$('#menu-sort').children().eq(7).children().first().attr('href', String(url + 'oldest'));
}

function make_color() {
	var color_val = 0;
	if (colorby == "user") {
		 color_val = 1;
	}
	
	$('#menu-color').children().eq(color_val).css({'background-color': '#42dca3'});
		 $('#menu-color').children().eq(color_val).addClass('disabled-menu');

  		$('#menu-color').children().eq(color_val).children().first().on('click', function() {
	    	return false;
		});
	
	$('#menu-color').children().eq(0).children().first().attr('href', 
		`/subtree?id=${article_id}&owner=${owner}&sort=${sort}&filter=${filter}&colorby=summarized`);
 
 	$('#menu-color').children().eq(1).children().first().attr('href', 
		`/subtree?id=${article_id}&owner=${owner}&sort=${sort}&filter=${filter}&colorby=user`);

}
