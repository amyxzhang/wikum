var timer = null;
var isClick = true;
var isClick2 = true;
var isMouseDown = false;
var hover_timer = null;
var highlighted_text = null;
var highlighted_comm = null;
var highlight_text = null;

var margin = {top: 30, right: 20, bottom: 30, left: 20},
    width = 600 - margin.left - margin.right,
    barHeight = 30;

var i = 0,
    duration = 400,
    root;

var tree = d3.layout.tree()
    .nodeSize([0, 16]);

var diagonal = d3.svg.diagonal()
    .projection(function(d) { return [d.y, d.x]; });

var svg = d3.select("#viz").append("svg")
    .attr("width", width + margin.left + margin.right)
  .append("g")
    .attr("transform", "translate(" + margin.left + "," + margin.top + ")");


svg.append('svg:rect')
  .attr('width',  width + margin.left + margin.right) // the whole width of g/svg
  .attr('fill', 'none')
  .attr('pointer-events', 'all')
  .on('click', function() {
  	clearTimeout(cancelClick);
  	if (isClick) {
  		d3.selectAll( '.clicked').classed( "clicked", false);
  		unhighlight_all();
  		show_text(null);
  	} else {
  		show_text('clicked');
  	}

  	isClick = true;
  })
  .on('mousedown', function() {
  		isMouseDown = true;

  		cancelClick = setTimeout(is_click, 250);
   		var p = d3.mouse( this);

	    svg.append( "rect")
	    .attr({
	        rx      : 6,
	        ry      : 6,
	        class   : "selection",
	        x       : p[0],
	        y       : p[1],
	        width   : 0,
	        height  : 0
	    })
	    .on("mousemove", function() {
	    	var s = svg.select("rect.selection");
	    	var p = d3.mouse(this),
            d = {
                x       : parseInt( s.attr( "x"), 10),
                y       : parseInt( s.attr( "y"), 10),
                width   : parseInt( s.attr( "width"), 10),
                height  : parseInt( s.attr( "height"), 10)
            },
            move = {
                x : p[0] - d.x,
                y : p[1] - d.y
            }
	        ;

	        if( move.x < 1 || (move.x*2<d.width)) {
	            d.x = p[0];
	            d.width -= move.x;
	        } else {
	            d.width = move.x;
	        }

	        if( move.y < 1 || (move.y*2<d.height)) {
	            d.y = p[1];
	            d.height -= move.y;
	        } else {
	            d.height = move.y;
	        }

	        s.attr( d);

	    });
  })
  .on( "mousemove", function() {
    var s = svg.select( "rect.selection");

    if( !s.empty()) {
        var p = d3.mouse(this),
            d = {
                x       : parseInt( s.attr( "x"), 10),
                y       : parseInt( s.attr( "y"), 10),
                width   : parseInt( s.attr( "width"), 10),
                height  : parseInt( s.attr( "height"), 10)
            },
            move = {
                x : p[0] - d.x,
                y : p[1] - d.y
            }
        ;

        if( move.x < 1 || (move.x*2<d.width)) {
            d.x = p[0];
            d.width -= move.x;
        } else {
            d.width = move.x;
        }

        if( move.y < 1 || (move.y*2<d.height)) {
            d.y = p[1];
            d.height -= move.y;
        } else {
            d.height = move.y;
        }

        s.attr( d);

		// deselect all temporary selected state objects
		d3.selectAll( '.clicked').classed( "clicked", false);
        unhighlight_all();

        d3.selectAll( 'path').each( function(state_data, i) {
        	if (this.className.baseVal.indexOf('ghostCircle') == -1) {
	            if(
	                !d3.select( this).classed( "selected") &&
	                    // inner circle inside selection frame
	                state_data.x>=d.y && state_data.x<=d.y+d.height &&
	                state_data.y>=d.x && state_data.y<=d.x+d.width
	            ) {
	            	if (!state_data.article) {
						d3.select(this)
						.style("stroke","#000000")
						.style("stroke-width", stroke_width)
						.attr("class", "clicked");
					}
	            }
	        }
        });

        }
        })
	.on( "mouseup", function() {
		isMouseDown = false;

	       // remove selection frame
	    svg.selectAll( "rect.selection").remove();

	});

var nodes_all = null;

var article_url = getParameterByName('article');
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

var comment_id = null;

d3.json(`/viz_data?article=${article_url}&sort=${sort}&next=${next}&num=${num}&filter=${filter}&owner=${owner}`, function(error, flare) {
  if (error) throw error;

  flare.x0 = 100;
  flare.y0 = 100;

  nodes_all = tree.nodes(flare);

  update(root = flare);

  show_text(nodes_all[0]);

  make_progress_bar();

  make_key();

  make_dropdown();

  make_filter();

  make_highlight();

  var article_id = $("#article_id").text();

 $('#button_subtree').html(`
    <a class="btn-sm btn-default" disabled>Overall</a>
    <a class="btn-sm btn-default" href="/subtree?article=${article_url}&num=${num}&owner=${owner}">Subtree</a>
    <!--<a class="btn-sm btn-default" href="/cluster?article=${article_url}&num=${num}&owner=${owner}">Cluster</a>-->
    <a class="btn-sm btn-default" href="/summary?article=${article_url}&num=${num}&owner=${owner}">Summary</a>
    <a class="btn-sm btn-default" href="/history?article=${article_id}">Edit History</a>`);
});

function make_dropdown() {

	text = '<div class="dropdown" style="margin-bottom: 8px;"><button class="btn btn-xs dropdown-toggle" type="button" data-toggle="dropdown">';

	if (!sort || sort == "id") {
		text += gettext('Sort all by - ID');
	} else if (sort == "likes") {
		text += gettext('Sort all by - # Likes');
	} else if (sort == "replies") {
		text += gettext('Sort all by - # Replies');
	} else if (sort == "long") {
		text += gettext('Sort all by - Longest');
	} else if (sort == "short") {
		text += gettext('Sort all by - Shortest');
	} else if (sort == "newest") {
		text += gettext('Sort all by - Newest');
	} else if (sort == "oldest") {
		text += gettext('Sort all by - Oldest');
	}

	text += '<span class="caret"></span></button><ul class="dropdown-menu">';
	url = "/visualization?article=" + article_url + '&num=' + num + '&owner=' + owner + '&sort=';
	text += '<li><a href="' + url + 'likes"># '+ gettext("Likes") + '</a></li><li><a href="' + url + 'replies"># '+ gettext("Replies") + '</a></li><li><a href="' + url + 'long">'+ gettext("Longest") + '</a></li><li><a href="' + url + 'short">'+ gettext("Shortest") + '</a></li><li><a href="' + url + 'newest">'+ gettext("Newest") + '</a></li><li><a href="' + url + 'oldest">'+ gettext("Oldest") + '</a></li></ul>';


	count = 0;
	for (var i=0;i<nodes_all.length;i++) {
		if (nodes_all[i].depth == 1) {
			count += 1;
		}
	}
	if (count == 15) {
		next_sub = next + 1;
		text += '</div><a class="btn btn-xs" href="' +url + sort+ '&next=' + next_sub + '">' + gettext("Get next page of comments") + '&gt;&gt;</a>';
	}
	
	$('#node_sort').html(text);

	
}
