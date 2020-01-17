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
		let graph_cells = editor.graph.getModel().cells;
		let item_cells = [];
		for (cell in graph_cells)
			if (graph_cells[cell].item_type == item_type) item_cells.push(cell);
		// Filter out cells that belong to parent processes
		if (parent_id && parent_id != "0")
			item_cells = item_cells.filter(cell_index => {
				let cell = graph_cells[cell_index];
				return !is_cell_from_parent_process(cell);
			});
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
	// Update each item in the graph
	let active_graph_name = get_active_hierarchy_item_and_name()[1];
	["process", "datastore"].forEach(item_type => {
		let counter = 1;
		for (key in graph.cells) {
			let cell = graph.cells[key];
			let cell_name = editor.graph.convertValueToString(cell);
			if (
				cell.item_type == item_type &&
				!is_cell_from_parent_process(cell)
			) {
				// Update id in all occurrences
				let new_id = create_id(parent_id, counter, item_type);
				let occurrences = find_all_occurrences(
					cell_name,
					cell.item_type,
					hierarchy
				);
				occurrences.forEach(occurrence => {
					// Update id of current graph
					let process = get_hierarchy_diagram(occurrence);
					let graph =
						occurrence == active_graph_name
							? editor.graph.getModel()
							: process.graph_model;
					let cell = find_cell_in_graph(graph, cell_name, item_type);
					cell.children[0].value = new_id;

					try {
						// Update id in hierarchy data structure
						let sub_process = get_hierarchy_diagram(cell_name);
						sub_process.process_id = new_id;
						// Recursively update the id of sub processes
						update_ids(
							sub_process.process_id,
							sub_process.graph_model
						);
					} catch {}
				});
				counter++;
			}
		}
	});

	// Update changes in current graph
	editor.graph.refresh();
}

function is_cell_from_parent_process(cell) {
	/**
	 * Determines if a process id is from a parent process
	 * @param  {Object} cell The cell with an id
	 * @return {Boolean} Wether is a parent id process
	 */
	return mxUtils.isNode(cell.value) && cell.value.getAttribute("from_parent");
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
	let parent = get_process_parent(process_name, hierarchy);
	if (cell.item_type == "entity" && parent)
		add_item_to_subprocess(cell, parent.name, visited);

	// Add item to current process
	let process = get_hierarchy_diagram(process_name);
	let current_graph = process.graph_model;
	/* Skip if item is already in the graph */
	if (
		!find_cell_in_graph(
			current_graph,
			cell.value.getAttribute("label"),
			cell.item_type
		)
	) {
		/* Add item and it's children cells (ID's) */
		let parent = current_graph.getChildAt(current_graph.getRoot(), 0);
		let copy = current_graph.add(parent, cell.clone());
		(cell.children || []).forEach(child =>
			current_graph.add(copy, child.clone())
		);

		/* Set flag that is from parent */
		copy.value.setAttribute("from_parent", true);

		/* Set required in and out flows for this item in the sub process */
		let required_inflows = new Set();
		let required_outflows = new Set();
		(cell.edges || []).forEach(edge => {
			let source_name = editor.graph.convertValueToString(edge.source);
			let target_name = editor.graph.convertValueToString(edge.target);
			if (source_name == process_name) required_inflows.add(edge.value);
			else if (target_name == process_name)
				required_outflows.add(edge.value);
		});
		let cell_from_parent = find_cell_in_graph(
			current_graph,
			cell.value.getAttribute("label"),
			cell.item_type
		);
		cell_from_parent.value.setAttribute(
			"required_inflows",
			JSON.stringify([...required_inflows])
		);
		cell_from_parent.value.setAttribute(
			"required_outflows",
			JSON.stringify([...required_outflows])
		);
	}
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
	let new_name = mxUtils.isNode(event.getProperty("value"))
		? event.getProperty("value").getAttribute("label")
		: event.getProperty("value");
	let old_name = mxUtils.isNode(event.getProperty("old"))
		? event.getProperty("old").getAttribute("label")
		: event.getProperty("old");
	let item_type = event.getProperty("cell").item_type;

	// Find all occurrences of the item
	let occurrences = find_all_occurrences(old_name, item_type, hierarchy);

	// Change name of all occurrences
	occurrences.forEach(occurrence => {
		let graph = get_hierarchy_diagram(occurrence).graph_model;
		let cell = find_cell_in_graph(graph, old_name, item_type);
		mxUtils.isNode(event.getProperty("value"))
			? cell.value.setAttribute("label", new_name)
			: (cell.value = new_name);
	});
}

function update_flow_requirements(cell, old_name, new_name) {
	/**
	 * Updates the flow requirements of all occurrences of connected items to the flow
	 * @param {Object} cell The flow being updated
	 * @param {String} old_name The old name of the flow
	 * @param {String} new_name The new name of the flow
	 */
	let active_process_name = get_active_hierarchy_item_and_name()[1];
	/* Rename required flow in all occurrences */
	["source", "target"].forEach(direction => {
		/* Get all occurrences */
		let item = cell[direction];
		let item_name = editor.graph.convertValueToString(item);
		let occurrences = find_all_occurrences(
			item_name,
			item.item_type,
			get_hierarchy_diagram(active_process_name)
		);
		occurrences.forEach(occurrence => {
			/* Find cell occurrence */
			let graph = get_hierarchy_diagram(occurrence).graph_model;
			let cell = find_cell_in_graph(graph, item_name, item.item_type);
			["required_inflows", "required_outflows"].forEach(required_flow => {
				let required_flows_string = cell.value.getAttribute(
					required_flow
				);
				let required_flows = new Set(JSON.parse(required_flows_string));
				/* If cell has renamed flow, remove old name and add new */
				if (required_flows.delete(old_name)) {
					required_flows.add(new_name);
					cell.value.setAttribute(
						required_flow,
						JSON.stringify([...required_flows])
					);
				}
			});
		});
	});
}

function set_validation_rules(editor) {
	/**
	 * Sets validation rules for flows and set graph validation on change listener
	 * @param {Object} editor The editor that the rules are being added to
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
	/* excludes parent processes in sub diagrams */
	editor.graph.multiplicities.push(
		new mxMultiplicity(
			false,
			"process",
			"from_parent",
			null,
			1,
			null,
			null,
			"A process must have at least one in flow of data."
		)
	);

	// A process must have at least one out flow of data
	/* excludes parent processes in sub diagrams */
	editor.graph.multiplicities.push(
		new mxMultiplicity(
			true,
			"process",
			"from_parent",
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

	// Custom cell validation
	mxGraph.prototype.validateCell = (cell, context) => {
		let errors = "";

		/* All cells must be connected with at least one flow */
		if (
			mxUtils.isNode(cell.value) &&
			(!cell.edges || cell.edges.length == 0)
		)
			errors += "Item needs to be connected with a flow.\n";

		/* Does cell from parent process have the correct 
			in and out flows in the sub process */
		if (
			mxUtils.isNode(cell.value) &&
			cell.value.getAttribute("from_parent")
		) {
			/* Get cell in and out flows*/
			let cell_inflows = new Set();
			let cell_outflows = new Set();
			(cell.edges || []).forEach(edge => {
				if (edge.source == cell) cell_outflows.add(edge.value);
				else cell_inflows.add(edge.value);
			});

			[
				["required_inflows", "in flow"],
				["required_outflows", "out flow"]
			].forEach(([flow, title]) => {
				let required_flows = new Set(
					JSON.parse(cell.value.getAttribute(flow))
				);
				let cell_flows =
					flow == "required_inflows" ? cell_inflows : cell_outflows;

				/* Does cell have the correct number of flows */
				if (required_flows.size != cell_flows.size)
					errors += `Item needs ${required_flows.size} ${title}s but has ${cell_flows.size}\n`;

				/* Which flows is the cell missing */
				for (let required_flow of required_flows)
					if (!cell_flows.has(required_flow))
						errors += `Item needs ${title} with name ${required_flow}\n`;
			});
		}
		return errors;
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

function is_dfd_valid(hierarchy) {
	/**
	 * Validates that the DFD is valid
	 * @param {Object} hierarchy The DFD data structure
	 * @return {Boolean} If the DFD is valid
	 * @return {String}  Error message if not valid
	 */
	// Validate Context Diagram
	if (hierarchy.name == "Context diagram") {
		let result = is_valid_context_diagram(hierarchy.graph_model);
		if (!result[0]) return result;
	}

	// Validate all sub processes
	let queue = [hierarchy];
	while (queue.length > 0) {
		/* Validate sub process */
		let current_process = queue.pop();
		let current_graph = new mxGraph(null, current_process.graph_model);
		if (current_graph.validateGraph() != null)
			return [false, `Sub process ${current_process.name} is invalid.`];
		/* Add children to queue */
		queue = queue.concat(current_process.children);
	}

	return [true];
}

function is_valid_context_diagram(graph) {
	/**
	 * Validates that the Context diagram is valid
	 * @param {Object} graph graph model of the context diagram
	 * @return {Boolean} If the context diagram is valid
	 * @return {String}  Error message if not valid
	 */
	let cells = Object.keys(graph.cells).map(key => graph.cells[key]);

	// Has one process
	let process_count = cells.reduce((count, cell) => {
		if (cell.item_type == "process") return ++count;
		return count;
	}, 0);
	if (process_count != 1)
		return [
			false,
			`Context diagram needs 1 process but has ${process_count}.`
		];

	// Has diagram got a source and sink entity
	let [has_source, has_sink] = ["source", "target"].map(direction =>
		cells.some(cell => {
			/* Do any edges of the cell have a entity in that direction */
			return (cell.edges || []).some(
				edge => edge[direction].item_type == "entity"
			);
		})
	);
	if (!has_source) return [false, "Context diagram has no source entity"];
	else if (!has_sink) return [false, "Context diagram has no sink entity"];

	return [true];
}
