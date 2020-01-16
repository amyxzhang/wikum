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
var outline = '';
var level = 0;
function createOutlineInsideString(d) {
	/** type (for coloring):
	  *  comment = normal comment
	  *  unsum = unsummarized comment under a summary node
	  *	 summary = summary
	  *  psum = partially summarized comment
	  */
	if (d.children && d.children.length) {
		level += 1;
		outline += `<div class="list-group nested-sortable">`;
		for (var i=0; i<d.children.length; i++) {
			let title = d.children[i].summary? d.children[i].summary.substring(0,20) : d.children[i].name.substring(0,20);
			outline += `<div class="list-group-item nested-${level}">` + `<div class="outline-item" id=${d.children[i].d_id}>` + title + `</div>`;
			createOutlineInsideString(d.children[i]);
			outline += `</div>`
		}
		outline += `</div>`;
	} else if (d._children && d._children.length) {
		level += 1;
		outline += `<div class="list-group nested-sortable">`;
		for (var i=0; i<d._children.length; i++) {
			let title = d._children[i].summary? d._children[i].summary.substring(0,20) : d._children[i].name.substring(0,20);
			outline += `<div class="list-group-item nested-${level}">` + `<div class="outline-item">` + title + `</div>`;
			createOutlineInsideString(d._children[i]);
			outline += `</div>`;
		}
		outline += `</div>`;
	} else if (d.replace && d.replace.length) {
		level += 1;
		outline += `<div class="list-group nested-sortable">`;
		for (var i=0; i<d.replace.length; i++) {
			let title = d.replace[i].summary? d.replace[i].summary.substring(0,20) : d.replace[i].name.substring(0,20);
			outline += `<div class="list-group-item nested-${level}">` + `<div class="outline-item">` + title + `</div>`;
			createOutlineInsideString(d.replace[i]);
			outline += `</div>`;
		}
		outline += `</div>`;
	}
}

function createOutlineString(d) {
	outline += '<div id="nestedOutline" class="list-group col nested-sortable">';
	outline += '<div id="viewAll" class="outline-item">View All</div>';
	createOutlineInsideString(d);
	outline += '</div>';
}

$.ajax({type: 'GET',	
	url: `/viz_data?id=${article_id}&sort=${sort}&next=${next}&filter=${filter}&owner=${owner}`,	
	success: function(flare) {
		createOutlineString(flare);
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

		redRightOutlineBorder(document.getElementById("viewAll"));

		nodes_all = recurse_get_children(flare);

		let counter = 0;
		nodes_all = nodes_all.map(function (node) {
			counter += 1;
			node['id'] = counter;
			return node;
		});
		show_text(nodes_all[0]);
		make_progress_bar();

		// clicking on #viz will show everything again
		$('#viz').on('click', function(e) {
			e.stopPropagation();
			show_text(nodes_all[0]);
		});

		$('.outline-item').on('click', function(e) {
			// show only this item and children (subtree)
		    e.stopPropagation();
		    let id = this.id;
		    d = id === 'viewAll' ? nodes_all[0] : nodes_all.filter(o => o.d_id == id)[0];
		    // highlight this and children
		    redRightOutlineBorder(this);
		    // show appropriate comment boxes
		    show_text(d);
		});

		$('.outline-item').on('dblclick', function(e) {
		    e.stopPropagation();
	    	var child = $(this).next()[0];
	    	if ($(child).hasClass('nested-sortable')) {
		    	if ($(child).is(":visible")) {
		    		$(child).slideUp();
		    		$(this).append('<span class="down-arrow">&#9660</span>')
		    	}
		    	else {
		    		$(child).slideDown();
		    		$(this).children().last().remove();
		    	}
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
