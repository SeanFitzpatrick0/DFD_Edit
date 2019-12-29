// Global variables
// TODO move globals to own file
// TODO prevent graph items from resize
var editor;
var hierarchy = {};

// Global styles
// TODO prevent connectable
const ID_PERMISSION =
	"editable=0;movable=0;resizable=0;cloneable=0;deletable=0;";
const CONTAINER_STYLE =
	"fillColor=white;strokeColor=#343a40;fontColor=#343a40;rounded=1;foldable=0;";
const ID_STYLE =
	"fillColor=#343a40;fontColor=white;strokeColor=#343a40;rounded=1;" +
	ID_PERMISSION;
const entity_dimensions = {
	width: 100,
	height: 80
};
const process_dimensions = {
	width: 120,
	height: 120
};
const datastore_dimensions = {
	width: 120,
	height: 60
};

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

		create_toolbar(
			editor.graph,
			toolbar_container,
			`${editor_path}/images`
		);

		create_hierarchy(loaded_hierarchy);

		// Add graph change event listener
		// TODO refactor this event handler
		editor.graph
			.getSelectionModel()
			.addListener(mxEvent.CHANGE, (sender, event) => {
				// Handel graph selection
				graph_select(sender, event);

				// Add any updated entities
				let cells = event.getProperty("removed") || [];
				cells.forEach(cell => {
					// If edge get the connected entity
					if (cell.source && cell.source.item_type == "entity")
						cell = cell.source;
					else if (cell.target && cell.target.item_type == "entity")
						cell = cell.target;

					// Add entity
					if (cell.item_type == "entity") {
						let active_process_name = get_active_hierarchy_item_and_name()[1];
						add_entity(cell, active_process_name, new Set());
					}
				});

				// Save change to diagram hierarchy data structure
				let active_graph_name = get_active_hierarchy_item_and_name()[1];
				save_current_graph(active_graph_name);
			});

		// Add cell delete event listener
		editor.graph.addListener(mxEvent.REMOVE_CELLS, graph_delete);

		// Add cell edit event listener
		/* validation check before calling event */
		mxGraphLabelChanged = mxGraph.prototype.labelChanged;
		mxGraph.prototype.labelChanged = is_valid_label_change;
		/* event handler */
		editor.graph.addListener(mxEvent.LABEL_CHANGED, update_process_name);
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
		add_entity_to_graph,
		entity_dimensions,
		`${image_dir_path}/entity.png`
	);

	// Add process element
	add_toolbar_item(
		graph,
		toolbar_container,
		add_process_to_graph,
		process_dimensions,
		`${image_dir_path}/process.png`
	);

	// Add data store element
	add_toolbar_item(
		graph,
		toolbar_container,
		add_datastore_to_graph,
		datastore_dimensions,
		`${image_dir_path}/datastore.png`
	);
}

function add_toolbar_item(graph, toolbar, add_item, item_dimension, image) {
	/**
	 * Adds icon to toolbar and adds drag event handler for item
	 * @param  {Object} graph Editor graph.
	 * @param  {Object} toolbar HTML element of the toolbar container.
	 * @param  {Function} add_item Function that adds the item to item to the graph.
	 * @param  {Object} item_dimension Width and Height of the item.
	 * @param  {String} image Path to the image that will be added to the toolbar.
	 */

	// Create toolbar item image and add to toolbar
	let img = document.createElement("img");
	img.setAttribute("src", image);
	img.style.width = `${item_dimension.width / 1.5}px`;
	img.style.height = `${item_dimension.height / 1.5}px`;
	img.title = "Drag this to the diagram";
	toolbar.appendChild(img);

	// Create drag event handler for item
	/* Function that is executed when the image is dropped on the graph */
	let add_item_to_graph = (graph, evt, cell, x, y) => {
		let parent = graph.getDefaultParent();
		let model = graph.getModel();

		// Preform update
		model.beginUpdate();
		try {
			let vertex = add_item(parent, graph, x, y, item_dimension);
			graph.setSelectionCell(vertex);
		} finally {
			model.endUpdate();
		}
	};

	/* Preview shown when dragging item over graph */
	let drag_element = document.createElement("div");
	drag_element.style.border = "dashed black 1px";
	drag_element.style.width = `${item_dimension.width}px`;
	drag_element.style.height = `${item_dimension.height}px`;
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
	let cells = event.getProperty("removed");

	if (cells && cells.length == 1 && cells[0].item_type == "process") {
		// Single process selected
		let cell = cells[0];

		// Display item configurations
		/* Add item title */
		let item_title = document.getElementById("item_configurations_title");
		let item_id = document.getElementById("item_configurations_id");
		item_title.innerHTML = cell.value;
		item_id.innerHTML = cell.children[0].value;

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

function graph_delete(sender, event) {
	/**
	 * Cell deletion event handler.
	 * @param  {Object} sender Sender of the event
	 * @param  {Object} event Details about event
	 */
	/* This checks that the delete event is resulting from the users 
		removing a cell and not from cells being remove when switching graphs */
	const GRAPH_SWITCH_UPDATE_LEVEL = 2;
	if (sender.getModel().updateLevel != GRAPH_SWITCH_UPDATE_LEVEL) {
		let cells = event.getProperty("cells");
		let remove_cells_with_subprocess = [];
		cells.forEach(cell => {
			// Handel deleting entity
			if (cell.item_type == "entity") {
				let active_graph_name = get_active_hierarchy_item_and_name()[1];
				remove_entity(cell.value, active_graph_name, new Set());
			}

			// Check if cell has sub processes
			let process_title = cell.value;
			try {
				let found_hierarchy = get_hierarchy_diagram(process_title);
				remove_cells_with_subprocess.push(found_hierarchy.name);
			} catch {}
		});

		// Remove from sub processes hierarchy
		remove_cells_with_subprocess.forEach(process_name => {
			remove_from_hierarchy(process_name);
		});

		// Update process id's when deleted
		/* Gets the text of the active diagram list item and 
		selects the first line as there will be multiple lines if it has nested list items */
		let current_graph_name = get_active_hierarchy_item_and_name()[1];
		let current_graph_id = get_hierarchy_diagram(current_graph_name)
			.process_id;
		update_process_ids(current_graph_id, editor.graph.getModel());
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

function add_process_to_graph(parent, graph, x, y, dimensions) {
	/**
	 * Adds process item to graph
	 */
	const item_type = "process";
	let container = graph.insertVertex(
		parent,
		null,
		item_type,
		x,
		y,
		dimensions.width,
		dimensions.height,
		CONTAINER_STYLE
	);

	let active_graph_name = get_active_hierarchy_item_and_name()[1];
	let active_graph_id = get_hierarchy_diagram(active_graph_name).process_id;

	let id = graph.insertVertex(
		container,
		null,
		create_process_id(active_graph_id),
		0,
		0,
		dimensions.width,
		dimensions.height / 5,
		ID_STYLE
	);

	container.item_type = item_type;
	return container;
}

function add_datastore_to_graph(parent, graph, x, y, dimensions) {
	/**
	 * Adds datastore to graph
	 */
	const item_type = "datastore";
	let container = graph.insertVertex(
		parent,
		null,
		item_type,
		x,
		y,
		dimensions.width,
		dimensions.height,
		CONTAINER_STYLE
	);
	let id = graph.insertVertex(
		container,
		null,
		"ID",
		0,
		0,
		dimensions.width / 5,
		dimensions.height,
		ID_STYLE
	);

	container.item_type = item_type;
	return container;
}

function add_entity_to_graph(parent, graph, x, y, dimensions) {
	/**
	 * Adds entity to graph
	 */
	const item_type = "entity";
	let container = graph.insertVertex(
		parent,
		null,
		item_type,
		x,
		y,
		dimensions.width,
		dimensions.height,
		CONTAINER_STYLE
	);

	container.item_type = item_type;
	return container;
}

function find_cell_in_graph(graph, cell_name, cell_type) {
	/**
	 * Finds a specified cell in a given graph
	 * @param {Object} graph Graph model being searched
	 * @param {String} cell_name Name of cell being searched for
	 * @param {String} cell_type Type of cell being searched for
	 * @returns The found cell or null if not found
	 * @throws Exception if invalid cell type
	 */
	// validate cell type
	validate_cell_type(cell_type);

	// Find cell in graph
	for (key in graph.cells)
		if (
			graph.cells[key].item_type == cell_type &&
			graph.cells[key].value == cell_name
		)
			return graph.cells[key];
	return null;
}

function find_connecting_cells(cell, cell_type) {
	/**
	 * Finds all cells connected to a given cell of a set type
	 * @param {Object} cell Root cell
	 * @param {String} cell_type Type of cell being searched for
	 * @returns The list of connected cells
	 * @throws Exception if invalid cell type
	 */
	// validate cell type
	validate_cell_type(cell_type);

	connected_cells = [];
	(cell.edges || []).forEach(edge => {
		["target", "source"].forEach(direction => {
			if (
				edge[direction].item_type == cell_type &&
				(edge[direction].name != cell.value ||
					edge[direction].item_title != cell_type)
			)
				connected_cells.push(edge[direction]);
		});
	});

	return connected_cells;
}
