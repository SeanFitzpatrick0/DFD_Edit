// Global variables
// TODO move globals to own file
var editor;
var hierarchy = {};

function main(editor_path, loaded_hierarchy) {
	/**
	 * Initializes editor. Creates editor, toolbar and diagram hierarchy.
	 * Displays error message if browser is not supported.
	 * @param  {String} editor_path Path to editor directory.
	 * @param  {Object} loaded_hierarchy Existing Diagram hierarchy loaded from server.
	 *		This is loaded into the hierarchy global data structure.
	 		Null if creating a new DFD. New hierarchy will be created in this case 
	 */

	// Checks if browser is supported
	if (!mxClient.isBrowserSupported()) {
		mxUtils.error("This browser is not supported.", 200, false);
	} else {
		// Create Editor
		let graph_container = document.getElementById("graph");
		let toolbar_container = document.getElementById("toolbar_items");

		editor = create_editor(
			`${editor_path}/config/keyhandler-commons.xml`,
			graph_container
		);

		create_toolbar(editor.graph, toolbar_container, `${editor_path}/images`);

		create_hierarchy(loaded_hierarchy);

		// Add cell select event listener
		editor.graph.getSelectionModel().addListener(mxEvent.CHANGE, graph_select);
	}
}

function create_editor(editor_config_path, graph_container) {
	/**
	 * Creates editor and initializes configurations.
	 * @param  {String} editor_config_path Path to key handler configurations file.
	 * @param  {Object} graph_container HTML element of the graph container.
	 * @returns {Object} The created editor.
	 */

	// Create editor with key handler config
	mxObjectCodec.allowEval = true;
	var editor_config = mxUtils.load(editor_config_path).getDocumentElement();
	var editor = new mxEditor(editor_config);
	mxObjectCodec.allowEval = false;
	editor.setGraphContainer(graph_container);

	// Enable new connections in the graph
	editor.graph.setConnectable(true);

	// Enable guides
	mxGraphHandler.prototype.guidesEnabled = true;

	// Alt disables guides
	mxGuide.prototype.isEnabledForEvent = evt => {
		return !mxEvent.isAltDown(evt);
	};

	// Enables snapping way points to terminals
	mxEdgeHandler.prototype.snapToTerminals = true;

	// Does not allow dangling edges
	editor.graph.setAllowDanglingEdges(false);

	return editor;
}

function create_toolbar(graph, toolbar_container, image_dir_path) {
	/**
	 * Adds all elements to toolbar.
	 * @param  {Object} graph Editor graph.
	 * @param  {Object} toolbar_container HTML element of the toolbar container.
	 * @param  {String} image_dir_path Path to the editor image directory.
	 */

	// Add entity element
	add_toolbar_item(
		graph,
		toolbar_container,
		"",
		`${image_dir_path}/rectangle.gif`
	);

	// Add process element
	add_toolbar_item(
		graph,
		toolbar_container,
		"shape=ellipse",
		`${image_dir_path}/ellipse.gif`
	);
}

function add_toolbar_item(graph, toolbar, style, image) {
	/**
	 * Adds icon to toolbar and adds drag event handler for item
	 * @param  {Object} graph Editor graph.
	 * @param  {Object} toolbar HTML element of the toolbar container.
	 * @param  {String} style Style of the graph element.
	 * @param  {String} image Path to the image that will be added to the toolbar.
	 */

	// Create toolbar item image and add to toolbar
	let img = document.createElement("img");
	img.setAttribute("src", image);
	img.style.width = "48px";
	img.style.height = "48px";
	img.title = "Drag this to the diagram";
	toolbar.appendChild(img);

	// Create drag event handler for item
	/* Function that is executed when the image is dropped on the graph */
	let add_item_to_graph = (graph, evt, cell, x, y) => {
		let parent = graph.getDefaultParent();
		let model = graph.getModel();
		let vertex = null;
		let vertex_id = null; // Assigns unique id if null
		let vertex_name = "Test";
		let width = 120;
		let height = 120;

		// Preform update
		model.beginUpdate();
		try {
			vertex = graph.insertVertex(
				parent,
				vertex_id,
				vertex_name,
				x,
				y,
				width,
				height,
				style
			);
		} finally {
			model.endUpdate();
		}

		// Select added vertex
		graph.setSelectionCell(vertex);
	};

	/* Preview shown when dragging item over graph */
	let drag_element = document.createElement("div");
	drag_element.style.border = "dashed black 1px";
	drag_element.style.width = "120px";
	drag_element.style.height = "120px";
	let drag_offset; // Offset away from mouse when dragged

	/* Add drag event handler */
	let drag_preview = mxUtils.makeDraggable(
		img,
		graph,
		add_item_to_graph,
		drag_element,
		drag_offset,
		drag_offset
	);
	drag_preview.setGuidesEnabled(true);
}

function graph_select(sender, event) {
	/**
	 * Cell selection event handler.
	 * @param  {Object} sender Sender of the event
	 * @param  {Object} event Details about event
	 */

	// Get selected cells
	var cells = event.getProperty("removed");

	if (cells && cells.length == 1) {
		// Single cell selected
		let cell = cells[0];

		// Display item configurations
		/* Add item title */
		let item_title = document.getElementById("item_configurations_title");
		item_title.innerHTML = cell.value;
		/* Show menu */
		let item_configuration = document.getElementById("item_configurations");
		item_configuration.style.display = "block";
	} else {
		// No or multiple cells selected
		// Hide configuration menu
		document.getElementById("item_configurations").style.display = "none";
	}

	event.consume();
}

function update_editor_graph(target_graph) {
	/**
	 * Replaces the current editor graph with target graph.
	 * @param  {Object} target_graph New graph model
	 */

	// Get current graph
	let current_graph = editor.graph;

	// Update editor graph
	var parent = current_graph.getDefaultParent();
	current_graph.getModel().beginUpdate();
	try {
		// Removes all cells which are not in the current graph
		for (var key in current_graph.getModel().cells) {
			var tmp = current_graph.getModel().getCell(key);

			if (current_graph.getModel().isVertex(tmp))
				current_graph.removeCells([tmp]);
		}

		// Merges the current and target graphs
		current_graph
			.getModel()
			.mergeChildren(target_graph.getRoot().getChildAt(0), parent);
	} finally {
		current_graph.getModel().endUpdate();
		current_graph.refresh();
	}
}