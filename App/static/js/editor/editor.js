function main(editor_path) {
	// Checks if browser is supported
	if (!mxClient.isBrowserSupported()) {
		mxUtils.error("This browser is not supported.", 200, false);
	} else {
		// Select containers
		var toolbar_container = document.getElementById("toolbar");
		var graph_container = document.getElementById("graph");

		// Define an icon for creating connecting flow
		mxConnectionHandler.prototype.connectImage = new mxImage(
			`${editor_path}/images/connector_icon.gif`,
			16,
			16
		);

		// Create toolbar
		var toolbar = new mxToolbar(toolbar_container);
		toolbar.enabled = false;

		// Creates the model and graph
		var model = new mxGraphModel();
		var graph = new mxGraph(graph_container, model);

		// Enable new connections in the graph
		graph.setConnectable(true);
		graph.setMultigraph(false);

		// Stops editing on enter or escape keypress
		var keyHandler = new mxKeyHandler(graph);
		var rubberband = new mxRubberband(graph);

		var create_item = (icon, w, h, style) => {
			var vertex = new mxCell(null, new mxGeometry(0, 0, w, h), style);
			vertex.setVertex(true);

			var img = add_item_to_graph(graph, toolbar, vertex, icon);
			img.enabled = true;

			graph.getSelectionModel().addListener(mxEvent.CHANGE, function() {
				var tmp = graph.isSelectionEmpty();
				mxUtils.setOpacity(img, tmp ? 100 : 20);
				img.enabled = tmp;
			});
		};

		create_item(`${editor_path}/images/rectangle.gif`, 100, 40, "");
		create_item(
			`${editor_path}/images/ellipse.gif`,
			100,
			40,
			"shape=ellipse"
		);
	}
}

function add_item_to_graph(graph, toolbar, prototype, image) {
	var _add_item = (graph, evt, cell, x, y) => {
		graph.stopEditing(false);

		var vertex = graph.getModel().cloneCell(prototype);
		vertex.geometry.x = x;
		vertex.geometry.y = y;

		graph.addCell(vertex);
		graph.setSelectionCell(vertex);
	};

	// Create drag preview image
	var img = toolbar.addMode(null, image, function(evt, cell) {
		var pt = this.graph.getPointForEvent(evt);
		_add_item(graph, evt, cell, pt.x, pt.y);
	});

	// This listener is always called first before any other listener
	mxEvent.addListener(img, "mousedown", evt => {
		if (!img.enabled) mxEvent.consume(evt);
	});

	mxUtils.makeDraggable(img, graph, _add_item);
	return img;
}
