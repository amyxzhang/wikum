var timer = null;
var isClick = true;
var isClick2 = true;
var isMouseDown = false;
var hover_timer = null;
var highlighted_text = null;
var highlighted_comm = null;
var highlight_text = null;
var article_id = $('#article_id').text();

/* Outline View Visualization */

var nodes_all = null;

var article_url = $('#article_url').text();
var owner = getParameterByName('owner');
article_url = article_url.replace('#','%23');

var sort = getParameterByName('sort');
if (!sort) {
	if (article_url.indexOf('wikipedia.org') !== -1) {
		sort = "id";
	} else {
		sort = "likes";
	}
}
var next = parseInt(getParameterByName('next'));
if (!next) {
	next = 0;
}
var num = parseInt(getParameterByName('num'));
if (!num) {
	num = 0;
}
var filter = getParameterByName('filter');
if (!filter) {
	filter = '';
}
var colorby = getParameterByName('colorby');
if (!colorby) {
	colorby = 'summarized';
}

var comment_id = null;

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
	url: `/viz_data?id=${article_id}&sort=${sort}&next=${next}&filter=${filter}&owner=${owner}`,	
	success: function(flare) {
		var outline = createOutlineString(flare);
		document.getElementById("outline").innerHTML = outline;
		var nestedSortables = document.getElementsByClassName("nested-sortable");
		// Loop through each nested sortable element
		for (var i = 0; i < nestedSortables.length; i++) {
			new Sortable(nestedSortables[i], {
				group: 'nested',
				animation: 150,
				fallbackOnBody: true,
				swapThreshold: 0.65
			});
		}

		redOutlineBorder(document.getElementById("viewAll"));

		nodes_all = update_nodes_all(flare);
		show_text(nodes_all[0]);
		make_progress_bar();

		var delay=500, setTimeoutConst;
		$('body').on('mouseenter', '.outline-text', function() {
			// highlight associated comment box
			let did = this.id.substring(13);
			let comment_box = $(".comment_box[data-did='" + did +"']");
			
			if (comment_box && comment_box.length) {
				highlight_box(comment_box[0].id.substring(8));
				setTimeoutConst = setTimeout(function() {
					$("#box").scrollTo("#" + comment_box[0].id, 500);
				}, delay);
				
			}
		});

		$('body').on('mouseleave', '.outline-text', function() {
			// highlight associated comment box
			let did = this.id.substring(13);
			let comment_box = $(".comment_box[data-did='" + did +"']");
			
			if (comment_box && comment_box.length) {
				highlight_box(comment_box[0].id.substring(8));
				clearTimeout(setTimeoutConst);
			}
		});

		$('body').on('click', '.outline-text', function() {
			// show only this item and children (subtree)
			let id = this.id.substring(13);
		    d = id === 'viewAll' ? nodes_all[0] : nodes_all.filter(o => o.d_id == id)[0];
		    // highlight this and children
		    redOutlineBorder($(this).parent()[0]);
		    // show appropriate comment boxes
		    console.log(d);
		    show_text(d);
		});

		$('body').on('dblclick', '.outline-text', function() {
			var outlineItem = $(this).parent()[0];
			var child = $(this).parent().next()[0];
			let id = outlineItem.id;
			var d = id === 'viewAll' ? nodes_all[0] : nodes_all.filter(o => o.d_id == id)[0];
	    	if ($(child).hasClass('nested-sortable')) {
		    	if ($(child).is(":visible")) {
		    		$(child).slideUp(); //collapse
		    		collapse_recurs(d);
		    		if (!$(outlineItem).find('#down-arrow').length) $(outlineItem).append('<span id="down-arrow">&#9660</span>');
		    	}
		    	else {
		    		$(child).slideDown();
		    		expand_recurs(d);
		    		$(outlineItem).children().last().remove();
		    	}
		    	show_text(d);
		    }
		});
	},
	error: function() {
		error_noty();
	}
});

function make_dropdown() {
	var sort_num = 0;
	if (sort == "likes") {
		sort_num = 1;
	} else if (sort == "replies") {
		sort_num = 2;
	} else if (sort == "long") {
		sort_num = 3;
	} else if (sort == "short") {
		sort_num = 4;
	} else if (sort == "newest") {
		sort_num = 5;
	} else if (sort == "oldest") {
		sort_num = 6;
	}

	$('#menu-sort').children().eq(sort_num).css({'background-color': '#42dca3'});
	$('#menu-sort').children().eq(sort_num).addClass('disabled-menu');

	$('#menu-sort').children().eq(sort_num).children().first().on('click', function() {
	    return false;
	});

	var url = "/visualization_flags?id=" + article_id + '&filter=' + filter + '&owner=' + owner + '&colorby=' + colorby  + '&sort=';
	$('#menu-sort').children().eq(0).children().first().attr('href', String(url + 'id'));
	$('#menu-sort').children().eq(1).children().first().attr('href', String(url + 'likes'));
	$('#menu-sort').children().eq(2).children().first().attr('href', String(url + 'replies'));
	$('#menu-sort').children().eq(3).children().first().attr('href', String(url + 'long'));
	$('#menu-sort').children().eq(4).children().first().attr('href', String(url + 'short'));
	$('#menu-sort').children().eq(5).children().first().attr('href', String(url + 'newest'));
	$('#menu-sort').children().eq(6).children().first().attr('href', String(url + 'oldest'));
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
		`/visualization_flags?id=${article_id}&owner=${owner}&sort=${sort}&filter=${filter}&colorby=summarized`);
 
 	$('#menu-color').children().eq(1).children().first().attr('href', 
		`/visualization_flags?id=${article_id}&owner=${owner}&sort=${sort}&filter=${filter}&colorby=user`);

}
