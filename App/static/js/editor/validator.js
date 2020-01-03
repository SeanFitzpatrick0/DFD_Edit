function create_id(parent_id, id_ending, item_type) {
	/**
	 * Creates the ID for a new process or datastore
	 * @param  {String} parent_id ID of the parent graph.
	 *                          Null if creating ID for system process.
	 * @param  {Integer} id_ending (Optional) The number ending for the ID.
	 * @param  {String}  item_type The type of the item reciveing a ID.
	 * 							Either 'process' or 'datastore'
	 * @return {String} New Process ID.
	 */
	// ID for the system process
	if (parent_id == null)
		if (item_type == "datastore")
			throw "Error: A datastore ID cant be created for the context diagram the Contextual Diagram.";
		else return "0";

	// If no ending, increment number of that item
	if (!id_ending) {
		let current_graph = editor.graph.getModel();
		let graph_cells = current_graph.cells;
		let item_cells = [];
		for (cell in graph_cells)
			if (graph_cells[cell].item_type == item_type) item_cells.push(cell);
		id_ending = item_cells.length + 1;
	}

	if (parent_id == "0")
		return `${item_type == "datastore" ? "D" : ""}${id_ending}`;
	else
		return `${
			item_type == "datastore" ? "D" : ""
		}${parent_id}.${id_ending}`;
}

function update_ids(parent_id, graph) {
	/**
	 * Updates the id's for each process and datastore and its sub processes
	 * @param  {String} parent_id ID of the parent graph.
	 * @param  {Object} graph MxGraph model to update
	 */
	["process", "datastore"].forEach(item_type => {
		let counter = 1;

		// Update each item in the graph
		for (key in graph.cells) {
			let cell = graph.cells[key];
			if (cell.item_type == item_type) {
				let new_id = create_id(parent_id, counter, item_type);

				// Update id in graph model
				cell.children[0].value = new_id;

				if (item_type == "process") {
					// Update process id in hierarch data structure
					try {
						let process_name = editor.graph.convertValueToString(
							cell
						);
						let process = get_hierarchy_diagram(process_name);
						process.process_id = new_id;

						// Recursively update the ids of sub processes
						update_ids(process.process_id, process.graph_model);
					} catch {}
				}
				counter++;
			}
		}
	});

	// Update changes
	editor.graph.refresh();
}

function add_item_to_subprocess(cell, process_name, visited) {
	/**
	 * Adds a cell to sub process (and parent if entity)
	 * @param  {Object} cell The cell being added
	 * @param  {String} process_name The name of the process the cell is being added to
	 * @param  {Set} visited Set of the names of already visited processes
	 * 					Used to prevent cycles when traversing the DFD
	 */
	// Check if already visited
	if (visited.has(process_name)) return;
	visited.add(process_name);

	// Add entity in parent process as all entities must appear in the context diagram
	let process = get_hierarchy_diagram(process_name);
	if (cell.item_type == "entity" && process.parent_name)
		add_item_to_subprocess(cell, process.parent_name, visited);

	// Add item to current process
	let current_graph = process.graph_model;
	/* Skip if item is already in the graph */
	if (
		find_cell_in_graph(
			current_graph,
			cell.value.getAttribute("label"),
			cell.item_type
		)
	)
		return;

	/* Add item and it's children cells (ID's) */
	let parent = current_graph.getChildAt(current_graph.getRoot(), 0);
	let copy = current_graph.add(parent, cell.clone());
	(cell.children || []).forEach(child =>
		current_graph.add(copy, child.clone())
	);
}

function validate_cell_type(cell_type) {
	/**
	 * Validates cell type
	 * @param {String} cell_type Type of cell
	 * @throws Exception if invalid cell type
	 */
	let valid_cell_types = ["entity", "process", "datastore", "flow"];
	if (!valid_cell_types.includes(cell_type))
		throw `Invalid cell_type: ${cell_type}. Must be in ${valid_cell_types}.`;
}

function is_valid_label_change(cell, value, evt) {
	/**
	 * Validates a cell label change. Executes the event if valid, alerts the user if not
	 * @param {Object} cell The cell being edited
	 * @param {String} value The new value of the cell
	 * @param {Object} event Label edit event
	 */
	// Remove new lines
	value = value.replace(/\n/g, "");
	// Validate process label change
	[
		["process", is_valid_process_name],
		["entity", is_valid_entity_name],
		["datastore", is_valid_datastore_name],
		["flow", is_valid_flow_name]
	].forEach(inputs => {
		let [item_type, validation_function] = inputs;
		if (cell.item_type == item_type) {
			let validation_result = validation_function(value, cell);
			if (validation_result[0]) {
				if (mxUtils.isNode(cell.value)) {
					// Clones the value for correct undo/redo
					var elt = cell.value.cloneNode(true);
					elt.setAttribute("label", value);
					value = elt;
				}
				mxGraphLabelChanged.apply(this, arguments);
			} else {
				alert(`Error: ${validation_result[1]}`);
			}
		}
	});
}

function is_valid_process_name(name) {
	/**
	 * Determines if valid new process name
	 * @param  {String} name The new name of the process
	 * @return {Boolean} If the new name is valid
	 * @return {String}  Error message if not valid
	 */
	// Validate name input
	if (!name || name.length == 0)
		return [false, "Unable to have null or empty name"];

	// Validate is not already in DFD
	let search_result = find_all_occurrences(name, "process", hierarchy);
	if (search_result.size > 0)
		return [
			false,
			`Process with name ${name}, already exists in ${Array.from(
				search_result
			).pop()}`
		];
	return [true];
}

function is_valid_datastore_name(name) {
	/**
	 * Determines if valid new datastore name
	 * @param  {String} name The new name of the datastore
	 * @return {Boolean} If the new name is valid
	 * @return {String}  Error message if not valid
	 */
	// Validate name input
	if (!name || name.length == 0)
		return [false, "Unable to have null or empty name"];

	// Validate not already in DFD
	let search_result = find_all_occurrences(name, "datastore", hierarchy);
	if (search_result.size > 0)
		return [
			false,
			`Data store with name ${name}, already exists in ${Array.from(
				search_result
			).pop()}`
		];
	return [true];
}

function is_valid_entity_name(name) {
	/**
	 * Determines if valid new entity name
	 * @param  {String} name The new name of the process
	 * @return {Boolean} If the new name is valid
	 * @return {String}  Error message if not valid
	 */
	// TODO clarify if going to allow multiple entity names
	// Validate name input
	if (!name || name.length == 0)
		return [false, "Unable to have null or empty name"];
	return [true];
}

function is_valid_flow_name(name, cell) {
	/**
	 * Determines if valid new flow name
	 * @param  {String} name The new name of the process
	 * @param  {Object} cell The flow cell being updated
	 * @return {Boolean} If the new name is valid
	 * @return {String}  Error message if not valid
	 */
	// Validate name input
	if (!name || name.length == 0)
		return [false, "Unable to have null or empty name"];

	// Validate is not duplicate flow name
	let found_occurrences = find_all_occurrences(name, "flow", hierarchy);
	for (occurrence of found_occurrences) {
		let flow = find_cell_in_graph(
			get_hierarchy_diagram(occurrence).graph_model,
			name,
			"flow"
		);

		let is_same_source =
			editor.graph.convertValueToString(cell.source) ==
			editor.graph.convertValueToString(flow.source);
		let is_returning_flow =
			editor.graph.convertValueToString(flow.source) ==
				get_active_hierarchy_item_and_name()[1] &&
			editor.graph.convertValueToString(flow.target) ==
				editor.graph.convertValueToString(flow.target);

		if (!is_same_source && !is_returning_flow)
			return [
				false,
				`A flow with the name ${name} already exists in the DFD from ${editor.graph.convertValueToString(
					flow.source
				)}.`
			];
	}

	return [true];
}

function update_hierarchy_name(sender, event) {
	/**
	 * Handles process name change. Update value is validate before executing the event.
	 * Updates the name of the process in the hierarchy data structure and hierarchy html list
	 * @param {Object} sender Sender of the event
	 * @param {Object} event Label changed event
	 */
	let previous_name = event.getProperty("old").getAttribute("label");
	let new_name = event.getProperty("value").getAttribute("label");

	// Check if process is in diagram hierarchy
	let process = null;
	try {
		process = get_hierarchy_diagram(previous_name);
	} catch {
		return;
	}

	// Update process details
	set_hierarchy_diagram(previous_name, { new_name });

	// Update hierarchy item
	let hierarchy_item_id =
		previous_name.replace(/[ ]/g, "_") + "_hierarchy_item";
	let list_item = document.getElementById(hierarchy_item_id);
	let list_item_title = list_item.getElementsByClassName(
		"hierarchy_item_title"
	)[0];
	/* update item id */
	list_item.id = new_name.replace(/[ ]/g, "_") + "_hierarchy_item";
	/* update name */
	list_item_title.innerText = new_name;
}

function rename_all_occurrences(sender, event) {
	/**
	 * Renames all occurrences of a item in the DFD
	 * @param {Object} sender Sender of the event
	 * @param {Object} event Label changed event
	 */
	let new_name = event.getProperty("value").getAttribute("label");
	let old_name = event.getProperty("old").getAttribute("label");
	let item_type = event.getProperty("cell").item_type;

	// Find all occurrences of the item
	let occurrences = find_all_occurrences(old_name, item_type, hierarchy);

	// Change name of all occurrences
	occurrences.forEach(occurrence => {
		let graph = get_hierarchy_diagram(occurrence).graph_model;
		let cell = find_cell_in_graph(graph, old_name, item_type);
		cell.value.setAttribute("label", new_name);
	});
}

function set_validation_rules() {
	/**
	 * Sets validation rules for flows and set graph validation on change listener
	 */
	// A flow can't directly connect 2 entities
	editor.graph.multiplicities.push(
		new mxMultiplicity(
			false,
			"entity",
			null,
			null,
			null,
			null,
			["entity"],
			null,
			"Data cannot move directly from a source entity to a sink entity." +
				" It must be moved by a process.",
			false
		)
	);

	// A process must have at least one in flow of data
	editor.graph.multiplicities.push(
		new mxMultiplicity(
			false,
			"process",
			null,
			null,
			1,
			null,
			null,
			"A process must have at least one in flow of data."
		)
	);

	// A process must have at least one out flow of data
	editor.graph.multiplicities.push(
		new mxMultiplicity(
			true,
			"process",
			null,
			null,
			1,
			null,
			null,
			"A process must have at least one out flow of data."
		)
	);

	// A flow can't move data from a datastore to a entity
	editor.graph.multiplicities.push(
		new mxMultiplicity(
			true,
			"datastore",
			null,
			null,
			null,
			null,
			["entity"],
			null,
			"A data flow can't move directly from a data store to a entity." +
				" This data must be moved using a process.",
			false
		)
	);

	// A flow can't move data from a entity to a datastore
	editor.graph.multiplicities.push(
		new mxMultiplicity(
			false,
			"datastore",
			null,
			null,
			null,
			null,
			["entity"],
			null,
			"A data flow can't move directly from a data store to a entity." +
				" This data must be moved using a process.",
			false
		)
	);

	// All items must have at least one connections
	mxGraph.prototype.validateCell = (cell, context) => {
		if (mxUtils.isNode(cell.value) && !cell.edges)
			return "Item needs to be connected with a flow.";
		return null;
	};

	// Validates graph on every change event
	editor.validating = true;
}

function can_add_to_context_diagram(item_type) {
	/**
	 * Validates that the item can be placed in the context diagram
	 * @param {String} item_type Type of the item being placed
	 * @return {Boolean} true if valid placement, otherwise false
	 */
	// Is placing item in Context Diagram
	if (get_active_hierarchy_item_and_name()[1] == "Context diagram")
		if (item_type == "datastore") {
			// Is item a datastore
			alert("Data stores must not appear in the Context diagram.");
			return false;
		} else if (item_type == "process") {
			// Has a process already been placed
			let cells = editor.graph.getModel().cells;
			for (let i in cells)
				if (cells[i].item_type == "process") {
					alert(
						"Only one process can be placed in the Context diagram."
					);
					return false;
				}
		}
	return true;
}
