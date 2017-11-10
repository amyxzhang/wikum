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
    barHeight = 27;

var i = 0,
    duration = 400,
    root;

var tree = d3.layout.tree()
    .nodeSize([0, 27]);

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

        d3.selectAll('path').each( function(state_data, i) {
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
article_url = article_url.replace('#','%23');

var size = parseInt(getParameterByName('size'));
if (!size) {
	size = 0;
}

var num = parseInt(getParameterByName('num'));
if (!num) {
	num = 0;
}

var owner = getParameterByName('owner');

d3.json('/cluster_data?article=' + article_url + '&size=' + size + '&num' + num + '&owner' + owner, function(error, flare) {
  if (error) throw error;

  flare.x0 = 100;
  flare.y0 = 100;
  
  nodes_all = tree.nodes(flare);
  
  update(root = flare);
  
  show_text(nodes_all[0]);
  
  make_key();
  
  make_dropdown();
  
  make_highlight();
  
  $('#button_subtree').html('<a class="btn-sm btn-default" href="/visualization?article=' + article_url + '&num=' + num + '&owner=' + owner + '">Overall View</a> <a class="btn-sm btn-default" href="/subtree?article=' + article_url + '&num=' + num + '">Subtree View</a> &nbsp;<strong>Cluster View </strong> <a class="btn-sm btn-default" href="/summary?article=' + article_url + '&num=' + num + '">Summary View</a>');
	
  
  $( "#slider" ).slider({
  	value: size,
  	change: function( event, ui ) {
  		url = "/cluster?article=" + article_url + '&num=' + num + '&owner=' + owner + '&size=';
  		window.location.href = url + ui.value;
  	}
  });
  
});

function make_dropdown() {
	url = "/cluster?article=" + article_url + '&num=' + num + '&owner=' + owner  + '&size=';
	
	text = '<a class="btn btn-xs" href="' +url + size + '">Get another random cluster &gt;&gt;</a>';
	
	text += '<BR>Cluster size: <div id="slider"></div>';
	$('#node_sort').html(text);
}
