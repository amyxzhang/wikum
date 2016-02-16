var timer;
var isClick = true;
var isMouseDown = false;

$("#hide_modal_box").draggable({
    handle: ".modal-title"
}); 

$("#summarize_modal_box").draggable({
    handle: ".modal-title"
}); 

function get_subtree(text, d, level) {
	if (d.children) {
		for (var i=0; i<d.children.length; i++) {
			if (level == 0) {
				text += '<div class="hide_comment_comment">' + d.children[i].name + '</div>';
			} else if (level == 1) {
				text += '<div class="hide_comment_comment level1">' + d.children[i].name + '</div>';
			} else if (level == 2) {
				text += '<div class="hide_comment_comment level2">' + d.children[i].name + '</div>';
			} else if (level > 2) {
				text += '<div class="hide_comment_comment level3">' + d.children[i].name + '</div>';
			}
			text = get_subtree(text, d.children[i], level+1);
		}
	} else if (d._children) {
		for (var i=0; i<d._children.length; i++) {
			if (level == 0) {
				text += '<div class="hide_comment_comment">' + d._children[i].name + '</div>';
			} else if (level == 1) {
				text += '<div class="hide_comment_comment level1">' + d._children[i].name + '</div>';
			} else if (level == 2) {
				text += '<div class="hide_comment_comment level2">' + d._children[i].name + '</div>';
			} else if (level > 2) {
				text += '<div class="hide_comment_comment level3">' + d._children[i].name + '</div>';
			}
			text = get_subtree(text, d._children[i], level+1);
		}
	}
		
	return text;
}

function get_subtree_summarize(text, d, level) {
	if (d.children) {
		for (var i=0; i<d.children.length; i++) {
			if (level == 1) {
				text += '<div class="summarize_comment_comment level1">' + d.children[i].name + '</div>';
			} else if (level == 2) {
				text += '<div class="summarize_comment_comment level2">' + d.children[i].name + '</div>';
			} else if (level > 2) {
				text += '<div class="summarize_comment_comment level3">' + d.children[i].name + '</div>';
			}
			text = get_subtree(text, d.children[i], level+1);
		}
	} else if (d._children) {
		for (var i=0; i<d._children.length; i++) {
			if (level == 1) {
				text += '<div class="summarize_comment_comment level1">' + d._children[i].name + '</div>';
			} else if (level == 2) {
				text += '<div class="summarize_comment_comment level2">' + d._children[i].name + '</div>';
			} else if (level > 2) {
				text += '<div class="summarize_comment_comment level3">' + d._children[i].name + '</div>';
			}
			text = get_subtree(text, d._children[i], level+1);
		}
	}
		
	return text;
}

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
});


$('#hide_modal_box').on('show.bs.modal', function(e) {
	var id = $(e.relatedTarget).data('id');
	var type = $(e.relatedTarget).data('type');
	
	d = nodes_all[id-1];
	var ids = [];
	var dids = [];
	
	highlight_box(id);
	if (type == "hide_comment") {
		var text = '<div class="hide_comment_comment">' + $(".highlighted").children().first().html() + '</div>';
		$('#hide_comment_text').text('Hide this comment from view.');
	} else if (type == "hide_replies") {
		var text = '';
		text = get_subtree(text, d, 0);
		$('#hide_comment_text').text('Hide these replies from view.');
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
			if (datas[i].depth - min_level == 0) {
				text += '<div class="hide_comment_comment">' + datas[i].name + '</div>';
			} else if (datas[i].depth - min_level == 1) {
				text += '<div class="hide_comment_comment level1">' + datas[i].name + '</div>'; 
			} else if (datas[i].depth - min_level == 2) {
				text += '<div class="hide_comment_comment level2">' + datas[i].name + '</div>'; 
			} else {
				text += '<div class="hide_comment_comment level3">' + datas[i].name + '</div>'; 
			}
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
				},
				error: function() {
					error_noty();
				}
			});
		}
		
	});
});

$('#summarize_modal_box').on('show.bs.modal', function(e) {
	var id = $(e.relatedTarget).data('id');
	var type = $(e.relatedTarget).data('type');
	
	d = nodes_all[id-1];
	var ids = [];
	var dids = [];
	
	highlight_box(id);
	if (type == "summarize") {
		var text = '<div class="summarize_comment_comment">' + d.name + '</div>';
		text = get_subtree_summarize(text, d, 1);
		$('#summarize_comment_text').text('Summarize this comment and all replies (replaces them all).');
	} else if (type == "hide_all_selected") {
	}
	
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
	
	var did = $(e.relatedTarget).data('did');
	
	$("#summarize_comment_submit").off("click");
	
	$('#summarize_comment_submit').click({data_id: did, type: type, ids: ids, dids: dids}, function(evt) {
		
		var comment = $('#summarize_comment_textarea').val();
		var article_id = $('#article_id').text();
		var csrf = $('#csrf').text();
		var data = {csrfmiddlewaretoken: csrf,
			comment: comment, 
			article: article_id};
		
		if (evt.data.type == "hide_all_selected") {
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
				},
				error: function() {
					error_noty();
				}
			});
		} else {
			data.id = evt.data.data_id; 
			$.ajax({
				type: 'POST',
				url: '/summarize_comments',
				data: data,
				success: function() {
					$('#summarize_modal_box').modal('toggle');
					success_noty();
				},
				error: function() {
					error_noty();
				}
			});
		}
		
	});
});

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

var margin = {top: 30, right: 20, bottom: 30, left: 20},
    width = 600 - margin.left - margin.right,
    barHeight = 23;

var i = 0,
    duration = 400,
    root;

var tree = d3.layout.tree()
    .nodeSize([0, 23]);

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

        d3.selectAll( 'circle').each( function(state_data, i) {
            if( 
                !d3.select( this).classed( "selected") && 
                    // inner circle inside selection frame
                state_data.x>=d.y && state_data.x<=d.y+d.height && 
                state_data.y>=d.x && state_data.y<=d.x+d.width
            ) {

                d3.select( this)
                .classed( "clicked", true);
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

d3.json('/viz_data?article=' + article_url, function(error, flare) {
  if (error) throw error;

  flare.x0 = 100;
  flare.y0 = 100;
  
  nodes_all = tree.nodes(flare);
  
  update(root = flare);
  
  show_text(nodes_all[0]);
});

function getParameterByName(name, url) {
    if (!url) url = window.location.href;
    name = name.replace(/[\[\]]/g, "\\$&");
    var regex = new RegExp("[?&]" + name + "(=([^&#]*)|&|#|$)"),
        results = regex.exec(url);
    if (!results) return null;
    if (!results[2]) return '';
    return decodeURIComponent(results[2].replace(/\+/g, " "));
}

function update(source) {

  // Compute the flattened node list. TODO use d3.layout.hierarchy.
  var nodes = tree.nodes(root);

  var height = Math.max($(window).height() - 150, 100 + nodes.length * barHeight + margin.top + margin.bottom);

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
      .data(nodes, function(d) { return d.id || (d.id = ++i); });

  var nodeEnter = node.enter().append("g")
      .attr("class", "node")
      .attr("transform", function(d) { return "translate(" + source.y0 + "," + source.x0 + ")"; })
      .style("opacity", 1e-6);

  // Enter any new nodes at the parent's previous position.
  nodeEnter.append("circle")
      .attr("r", function(d) { 
      	if (d.article) {
      		return 10;
      	} else {
      		return (d.size + 150 )/40; 
      	}
      	})
      .attr("height", barHeight)
      .style("stroke-width", stroke_width)  
      .style("stroke", stroke)
      .style("fill", color)
      .attr("id", function(d) { return 'node_' + d.id; })
      .on("click", function(d) {
      	show_text(d);
      	d3.selectAll(".clicked").classed("clicked", false);
		d3.select(this).classed('clicked', true);
		
      })
      .on("mouseover", showdiv)
      .on("mouseout", hidediv);

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

// Toggle children on click.
function click_node(id) {
  d = nodes_all[id-1];
  
  console.log(d);
  
  if (d.children) {
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

// Toggle children on click.
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

// Toggle children on click.
function expand_node(id) {
  d = nodes_all[id-1];
  expand_recurs(d);
  update(d);
  return null;
}

function submit_summary(id, d_id) {
	var summary = $('#summarize_textbox_' + id).val();
	var article_id = $('#article_id').text();
	var csrf = $('#csrf').text();
		
	data = {csrfmiddlewaretoken: csrf, id: d_id, summary: summary, article: article_id};
	
	$.ajax({
		type: 'POST',
		url: '/summarize_comment',
		data: data,
		success: function() {
			success_noty();
			var text = '<P><strong>Summary:</strong> ' + summary + '</P>';
			text += '<P><a>Edit Comment Summary</a> | <a>View Original Comment</a></p>';
			$('#comment_text_' + id).html(text);
			show_summarize(id);
			highlight_box(id);
		},
		error: function() {
			error_noty();
		}
	});
}

function construct_comment(d) {
	var text = '';
	var summary = false;
	if (d.name.lastIndexOf('<P><strong>Summary:</strong>', 0) === 0) {
		summary = true;
	}
	
	text += '<div id="comment_text_' + d.id + '">' + d.name;
	if (!summary) {
		text += '<P>-- ' + d.author + '</P>';
		text += '<P>Likes: ' + d.size + '</P>';
	}
	text += '</div>';
	
	if (summary) {
		text += '<P><a>Edit Comment Summary</a> | <a>View Original Comment</a></p>';
	}
	
	if (!summary && d.name.length > 300) {
		text += '<hr><P>';
		if (!d.children) {
			text += '<a onclick="show_summarize(' + d.id + ');">Summarize Comment</a> | ';
			text += '<a data-toggle="modal" data-backdrop="false" data-did="' + d.d_id + '" data-target="#hide_modal_box" data-type="hide_comment" data-id="' + d.id + '">Mark as Unimportant</a>';
		} else {
			text += '<a data-toggle="modal" data-backdrop="false" data-did="' + d.d_id + '" data-target="#summarize_modal_box" data-type="summarize" data-id="' + d.id + '">Summarize Comment and all Replies</a> | ';
			text += '<a onclick="show_summarize(' + d.id + ');">Summarize Comment</a> | ';
			text += '<a data-toggle="modal" data-backdrop="false" data-did="' + d.d_id + '" data-target="#hide_modal_box" data-type="hide_replies" data-id="' + d.id + '">Mark all Replies Unimportant</a>';
		}
		text += '</p>';
		text += '<div id="summarize_' + d.id + '" style="display: none;">';
		text += '<textarea type="text" name="Summarize the comment" id="summarize_textbox_' + d.id + '"></textarea>';
		text += '<button type="button" class="btn btn-default btn-xs" onclick="submit_summary(' + d.id + ',' + d.d_id + ')">Submit</button> ';
		text += '<button type="button" class="btn btn-default btn-xs" onclick="show_summarize(' + d.id + ');">Cancel</button>';
		text += '</div>​';
	} else {
		if (!d.children) {
			text += '<hr><P>';
			text += '<a data-toggle="modal" data-backdrop="false" data-did="' + d.d_id + '" data-target="#hide_modal_box" data-type="hide_comment" data-id="' + d.id + '">Mark as Unimportant</a>';
			text += '</p>';
		} else {
			text += '<hr><P>';
			text += '<a data-toggle="modal" data-backdrop="false" data-did="' + d.d_id + '" data-target="#summarize_modal_box" data-type="summarize" data-id="' + d.id + '">Summarize Comment and all Replies</a> | ';
			text += '<a data-toggle="modal" data-backdrop="false" data-did="' + d.d_id + '" data-target="#hide_modal_box" data-type="hide_replies" data-id="' + d.id + '">Mark all Replies Unimportant</a></p>';
		}
	}
	return text;
}


function show_summarize(id) {
	$('#summarize_' + id).toggle();
}

function escapeHtml(text) {
    'use strict';
    return text.replace(/[\"&<>]/g, function (a) {
        return { '"': '&quot;', '&': '&amp;', '<': '&lt;', '>': '&gt;' }[a];
    });
}

function clear_box_top() {
	$('#box_top').html('');
	$('#box_top').css('border-bottom', '0px');
}


function get_subtree_box(text, d, level) {
	if (d.children) {
		for (var i=0; i<d.children.length; i++) {
			if (level == 0) {
				text += '<div class="comment_box" id="comment_' + d.children[i].id + '">';
			} else if (level == 1) {
				text += '<div class="comment_box level1" id="comment_' + d.children[i].id + '">';
			} else if (level == 2) {
				text += '<div class="comment_box level2" id="comment_' + d.children[i].id + '">';
			} else if (level > 2) {
				text += '<div class="comment_box level3" id="comment_' + d.children[i].id + '">';
			}
			text +=  construct_comment(d.children[i]);
			text += '</div>';
			text = get_subtree(text, d.children[i], level+1);
		}
	}
		
	return text;
}

function show_text(d) {
	if (d && d != 'clicked') {
		clear_box_top();
		if (d.article) {
			var text = '';
			text = get_subtree_box(text, d, 0);
		} else {
			var text = '<div class="comment_box" id="comment_' + d.id + '">';
			text += construct_comment(d);
			text += '</div>';
			text = get_subtree_box(text, d, 1);
		}
		$('#box').html(text);
	} else if (d && d != 'clicked') {
		$('#box').html(d.name);
		clear_box_top();
	} else if (d == null){
		$('#box').html('');
		clear_box_top();
	} else {
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
			construct_box_top();
		}
		
		objs.sort(compare_nodes);
		for (var i in objs) {
			var text = '';
			if (objs[i].depth - min_level == 0) {
				text += '<div class="comment_box" id="comment_' + objs[i].id + '">'; 
			} else if (objs[i].depth - min_level == 1) {
				text += '<div class="comment_box level1" id="comment_' + objs[i].id + '">'; 
			} else if (objs[i].depth - min_level == 2) {
				text += '<div class="comment_box level2" id="comment_' + objs[i].id + '">'; 
			} else {
				text += '<div class="comment_box level3" id="comment_' + objs[i].id + '">'; 
			}
			text += construct_comment(objs[i]);
			text += '</div>';
			$('#box').append(text);
		};
		
		
	}
}

function construct_box_top() {
	var text = '<a>Summarize all Selected</a>';
	text += ' | <a data-toggle="modal" data-backdrop="false" data-target="#hide_modal_box" data-type="hide_all_selected">Mark all Selected as Unimportant</a>';
	
	$('#box_top').css('border-bottom', '#000000 1px solid');
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

function showdiv(d) {
	if (!isMouseDown && (d.children || d._children)) {
		clearTimeout(timer);
		var offset = $('svg').offset();
		$('#expand').css({top: offset.top + d.x + 22, 
			left: offset.left + d.y + ((d.size + 100)/60) + 28});
		$('#expand').html('<a onclick="click_node(' + d.id + ');">Toggle</a> | <a onclick="collapse_node(' + d.id + ');">Collapse replies</a> | <a onclick="expand_node(' + d.id + ');">Expand replies</a>');
		$('#expand').show();
	}
	if (!isMouseDown && d3.select(this).classed("clicked")) {
		highlight_box(d.id);
		$("#box").scrollTo("#comment_" + d.id, 800);
	}
}

function hidediv(d) {
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
}

function stroke(d) {
	if (d.article) {
		return "#000000";
	}
 }

function color(d) {
	if (d.parent && d.parent.article) {
		return "#19668c";
	} else if (d.article) {
		return "#ffffff";
	}
	if (d._children || d.children) {
		return "#c6dbef";
	} else {
		return "#fd8d3c";
	}
}
