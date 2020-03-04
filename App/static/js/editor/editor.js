function create_editor(editor_config_path, graph_container) {
	/**
	 * Creates editor and initializes configurations.
	 * @param  {String} editor_config_path Path to key handler configurations file.
	 * @param  {Object} graph_container HTML element of the graph container.
	 * @returns {Object} The created editor.
	 */
	// Create editor with key handler config
	mxObjectCodec.allowEval = true;
	let editor_config = mxUtils.load(editor_config_path).getDocumentElement();
	let editor = new mxEditor(editor_config);
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

	// Overwrite cell value to string function
	editor.graph.convertValueToString = cell => {
		// If the cell value is xml data, return the `label` attribute
		if (mxUtils.isNode(cell.value)) return cell.getAttribute("label", "");
		else return cell.value;
	};

	// Add event listeners
	add_event_listeners(editor);

	// Set flow and cell validation rules
	set_validation_rules(editor);

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
		ENTITY_DIMENSIONS,
		`${image_dir_path}/entity.png`
	);

	// Add process element
	add_toolbar_item(
		graph,
		toolbar_container,
		add_process_to_graph,
		PROCESS_DIMENSIONS,
		`${image_dir_path}/process.png`
	);

	// Add data store element
	add_toolbar_item(
		graph,
		toolbar_container,
		add_datastore_to_graph,
		DATASTORE_DIMENSIONS,
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
	// Create toolbar item and add to toolbar
	let img = document.createElement("img");
	img.setAttribute("src", image);
	img.style.width = `${item_dimension.width / 1.5}px`;
	img.style.height = `${item_dimension.height / 1.5}px`;
	img.title = "Drag this to the diagram";
	let div = document.createElement("div");
	div.classList.add("toolbar_item_container");
	div.appendChild(img);
	toolbar.appendChild(div);

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

function add_event_listeners(editor) {
	/**
	 * Adds event listeners to the given editor
	 * @param  {Object} editor The editor to add event listeners to
	 */
	// Add graph select, add and edit listener
	editor.graph
		.getSelectionModel()
		.addListener(mxEvent.CHANGE, (sender, event) => {
			/* Handel graph selection */
			graph_select(sender, event);
			/* Handel graph add or cell move */
			graph_add_or_move(sender, event);
		});

	// Add cell delete event listener
	editor.graph.addListener(mxEvent.REMOVE_CELLS, graph_delete);

	// Add cell label edit event listener
	/* validation check before calling event */
	mxGraphLabelChanged = mxGraph.prototype.labelChanged;
	mxGraph.prototype.labelChanged = is_valid_label_change;
	/* event handler */
	editor.graph.addListener(mxEvent.LABEL_CHANGED, cell_label_edit);

	// Add cell resize event listener
	editor.graph.addListener(mxEvent.CELLS_RESIZED, cell_resize);
}

function graph_select(sender, event) {
	/**
	 * Cell selection event handler.
	 * @param  {Object} sender Sender of the event
	 * @param  {Object} event Details about event
	 */
	// Get selected cells
	let cells = event.getProperty("removed");

	if (cells && cells.length === 1 && cells[0].item_type === "process") {
		// Single process selected
		let cell = cells[0];

		// Display item configurations
		/* Add item title */
		let item_title = document.getElementById("item_configurations_title");
		let item_id = document.getElementById("item_configurations_id");
		item_title.innerHTML = cell.value.getAttribute("label");
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

function graph_add_or_move(sender, event) {
	/**
	 * Cell add or move event handler.
	 * @param  {Object} sender Sender of the event
	 * @param  {Object} event Details about event
	 */
	/* Get cell add or moved */
	let active_process_name = get_active_hierarchy_item_and_name()[1];
	let cells = event.getProperty("removed") || [];
	cells.forEach(cell => {
		/* Set flow item type and value if added */
		if (cell.edge && !cell.item_type) {
			cell.item_type = "flow";
			cell.value = `flow_${Math.floor(Math.random() * 1000)}`;
			cell.style = EDGE_STYLE;
			editor.graph.refresh();
		}

		/* If edge connects an item to a sub process, add that item to the sub process */
		if (cell.edge) {
			["source", "target"].forEach(direction => {
				/* Does sub process exist */
				let item = cell[direction];
				if (item.item_type === "process")
					try {
						let process_name = editor.graph.convertValueToString(
							cell[direction]
						);
						let process = get_hierarchy_diagram(process_name);
						/* Add the cell in the opposite direction to the sub process */
						let opposite =
							direction === "source" ? "target" : "source";
						add_item_to_subprocess(
							cell[opposite],
							process_name,
							new Set()
						);
					} catch {}
			});
		}
	});

	/* Save any changes of the current graph to the diagram hierarchy data structure */
	save_current_graph(active_process_name);
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
		let parent_cell_removed = false;
		let current_graph_name = get_active_hierarchy_item_and_name()[1];
		let process = get_hierarchy_diagram(current_graph_name);
		let process_id = process.process_id;

		let cells = event.getProperty("cells");
		cells.forEach(cell => {
			let cell_name = editor.graph.convertValueToString(cell);

			// Edge being deleted
			if (cell.edge) {
				handel_flow_delete(cell);
			} else {
				// Graph Item being deleted
				/* Find and remove all occurrence */
				let occurrences = find_all_occurrences(
					cell_name,
					cell.item_type,
					hierarchy
				);
				occurrences.forEach(occurrence => {
					let graph = get_hierarchy_diagram(occurrence).graph_model;
					let found_cell = find_cell_in_graph(
						graph,
						cell_name,
						cell.item_type
					);
					/* Remove item from current graph */
					remove_cell_from_graph(occurrence, graph, found_cell);
				});

				// If process and in hierarchy remove
				if (cell.item_type === "process")
					remove_from_hierarchy(cell_name);

				// Is cell from parent process
				if (is_cell_from_parent_process(cell))
					parent_cell_removed = true;
			}
		});

		// Update id's when deleted
		/* Do id's in parent process need to be updated */
		if (parent_cell_removed) {
			let parent_process = get_process_parent(process.name, hierarchy);
			update_ids(parent_process.process_id, parent_process.graph_model);
		} else update_ids(process_id, editor.graph.getModel());
	}

	event.consume();
}

function cell_label_edit(sender, event) {
	/**
	 * Cell label edit event handler.
	 * @param  {Object} sender Sender of the event
	 * @param  {Object} event Details about event
	 */
	let cell = event.getProperty("cell");
	/* Update name of all occurrences */
	if (["entity", "process", "datastore", "flow"].includes(cell.item_type))
		rename_all_occurrences(sender, event);

	/* Update hierarchy list and data structure */
	if (cell.item_type === "process") update_hierarchy_name(sender, event);

	/* Update required flows if flow renamed */
	if (cell.item_type === "flow") {
		let new_name = mxUtils.isNode(event.getProperty("value"))
			? event.getProperty("value").getAttribute("label")
			: event.getProperty("value");
		let old_name = mxUtils.isNode(event.getProperty("old"))
			? event.getProperty("old").getAttribute("label")
			: event.getProperty("old");
		update_flow_requirements(cell, old_name, new_name);
	}
}

function cell_resize(sender, event) {
	/**
	 * Cell resize edit event handler.
	 * @param  {Object} sender Sender of the event
	 * @param  {Object} event Details about event
	 */
	let parent = event.getProperty("cells")[0];
	if (parent.item_type === "process") {
		/* resize the width of the id to be the same as the parent */
		let child = parent.children[0];
		child.geometry.width = parent.geometry.width;
	}
}

function add_process_to_graph(parent, graph, x, y, dimensions) {
	/**
	 * Adds process item to graph
	 */
	const item_type = "process";
	/* is valid placement  */
	if (!can_add_to_context_diagram(item_type)) return null;

	/* Create xml process element */
	let doc = mxUtils.createXmlDocument();
	let node = doc.createElement(item_type);
	node.setAttribute(
		"label",
		`${item_type}_${Math.floor(Math.random() * 1000)}`
	);

	let container = graph.insertVertex(
		parent,
		null,
		node,
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
		create_id(active_graph_id, null, "process"),
		0,
		0,
		dimensions.width,
		dimensions.height / 5,
		ID_STYLE
	);
	id.setConnectable(false);

	container.item_type = item_type;
	return container;
}

function add_datastore_to_graph(parent, graph, x, y, dimensions) {
	/**
	 * Adds datastore to graph
	 */
	const item_type = "datastore";
	/* is valid placement  */
	if (!can_add_to_context_diagram(item_type)) return null;

	/* Create xml datastore element */
	let doc = mxUtils.createXmlDocument();
	let node = doc.createElement(item_type);
	node.setAttribute(
		"label",
		`${item_type}_${Math.floor(Math.random() * 1000)}`
	);

	let container = graph.insertVertex(
		parent,
		null,
		node,
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
		create_id(active_graph_id, null, "datastore"),
		0,
		0,
		dimensions.width / 4,
		dimensions.height,
		ID_STYLE
	);
	id.setConnectable(false);

	container.item_type = item_type;
	return container;
}

function add_entity_to_graph(parent, graph, x, y, dimensions) {
	/**
	 * Adds entity to graph
	 */
	const item_type = "entity";

	/* is valid placement */
	if (get_active_hierarchy_item_and_name()[1] !== "Context diagram") {
		alert("Entities must be placed in the Context diagram");
		return null;
	}

	let doc = mxUtils.createXmlDocument();
	let node = doc.createElement(item_type);
	node.setAttribute(
		"label",
		`${item_type}_${Math.floor(Math.random() * 1000)}`
	);

	let container = graph.insertVertex(
		parent,
		null,
		node,
		x,
		y,
		dimensions.width,
		dimensions.height,
		CONTAINER_STYLE
	);

	container.item_type = item_type;
	return container;
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
			graph.cells[key].item_type === cell_type &&
			editor.graph.convertValueToString(graph.cells[key]) === cell_name
		)
			return graph.cells[key];
	return null;
}

function find_connecting_cells(cell, cell_type) {
	/**
	 * Finds all cells connected to a given cell of a set type
	 * @param {Object} cell Root cell
	 * @param {String} cell_type Type of cell being searched for
	 * 		(if null includes cell of any type)
	 * @returns The list of connected cells
	 * @throws Exception if invalid cell type
	 */
	// validate cell type
	if (cell_type) validate_cell_type(cell_type);

	connected_cells = [];
	(cell.edges || []).forEach(edge => {
		["target", "source"].forEach(direction => {
			let same_type = edge[direction].item_type === cell_type;
			let not_same_item =
				edge[direction].getAttribute("label") !=
					cell.value.getAttribute("label") ||
				edge[direction].item_type != cell.item_type;
			if (
				(cell_type === null && not_same_item) ||
				(same_type && not_same_item)
			)
				connected_cells.push(edge[direction]);
		});
	});

	return connected_cells;
}

function remove_cell_from_graph(process_name, graph, cell) {
	/**
	 * Remove a cell from graph and sets this value in the diagram hierarchy
	 * @param {String} process_name The name of the process being updated
	 * @param {Object} graph The graph with cell being removed
	 * @param {Object} cell The cell being removed
	 */
	let remove_graph = new mxGraph(null, graph);
	try {
		remove_graph.getModel().beginUpdate();
		if (remove_graph.getModel().isVertex(cell))
			remove_graph.removeCells([cell]);
	} catch {
	} finally {
		remove_graph.getModel().endUpdate();
	}
	set_hierarchy_diagram(process_name, {
		new_model: remove_graph.getModel()
	});
}

function handel_flow_delete(cell) {
	/**
	 * Handles a edge removal. Remove this flow requirement from items in sub processes.
	 * Removes cell from parent in sub process if it no longer has any required flows.
	 * @param {Object} cell The edge being removed
	 */
	["source", "target"].forEach((direction, i) => {
		// Is edge connected to a sub process
		try {
			// Remove the required in/out flow of the item connected to the sub process
			/* Get the cell at both sides of the edge */
			let opposite_direction =
				direction === "target" ? "source" : "target";
			let process_cell = cell[direction];
			let opposite_cell = cell[opposite_direction];
			let process_name = editor.graph.convertValueToString(process_cell);
			let opposite_cell_name = editor.graph.convertValueToString(
				opposite_cell
			);

			/* Get sub process */
			let sub_process = get_hierarchy_diagram(process_name);
			/* Remove in/out flow requirement for that sub process and all its sub processes */
			let occurrences = find_all_occurrences(
				opposite_cell_name,
				opposite_cell.item_type,
				sub_process
			);
			occurrences.forEach(occurrence => {
				let graph = get_hierarchy_diagram(occurrence).graph_model;
				let found_cell = find_cell_in_graph(
					graph,
					opposite_cell_name,
					opposite_cell.item_type
				);

				/* Remove in/out flow requirement */
				let flow_requirements = [
					"required_inflows",
					"required_outflows"
				];
				let required_flow_string = found_cell.value.getAttribute(
					flow_requirements[i]
				);
				let required_flows = new Set(JSON.parse(required_flow_string));
				required_flows.delete(cell.value);
				found_cell.value.setAttribute(
					flow_requirements[i],
					JSON.stringify([...required_flows])
				);

				/* If that cell has not flow requirements (i.e. its no longer connected to the subprocess)
					remove that cell from the sub process */
				if (
					flow_requirements.every(
						requirement =>
							found_cell.value.getAttribute(requirement) === "[]"
					)
				)
					remove_cell_from_graph(occurrence, graph, found_cell);
			});
		} catch {}
	});
}
