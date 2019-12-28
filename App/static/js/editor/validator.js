function create_process_id(parent_id, id_ending) {
	/**
	 * Creates the ID for a new process
	 * @param  {String} parent_id ID of the parent graph.
	 *                          Null if creating ID for system process.
	 * @param  {Integer} id_ending (Optional) The number ending for the ID.
	 * @return {String} New Process ID.
	 */
	// ID for the system process
	if (parent_id == null) return "0";

	// If no ending, increment number of processes
	if (typeof id_ending === "undefined") {
		let current_graph = editor.graph.getModel();
		let graph_cells = current_graph.cells;
		let process_cells = [];
		for (cell in graph_cells)
			if (graph_cells[cell].item_type == "process")
				process_cells.push(cell);
		id_ending = process_cells.length + 1;
	}

	if (parent_id == "0") return id_ending.toString();
	else return `${parent_id}.${id_ending}`;
}

function update_process_ids(parent_id, graph) {
	/**
	 * Updates the process id's for each process and its sub processes
	 * @param  {String} parent_id ID of the parent graph.
	 * @param  {Object} graph MxGraph model to update
	 */
	let process_counter = 1;

	// Update each process in the graph
	for (key in graph.cells) {
		let cell = graph.cells[key];
		if (cell.item_type && cell.item_type == "process") {
			let new_id = create_process_id(parent_id, process_counter);

			// Update process id in graph model
			cell.children[0].value = new_id;

			// Update process id in hierarch data structure
			try {
				let process_name = cell.value;
				let process = get_hierarchy_diagram(process_name);
				process.process_id = new_id;

				// Recursively update the ids of sub processes
				update_process_ids(process.process_id, process.graph_model);
			} catch {}
			process_counter++;
		}
	}

	// Update changes
	editor.graph.refresh();
}

function add_entity(entity_cell, process_name, visited) {
	/**
	 * Adds a entity to all parent processes and connected sub processes
	 * @param  {Object} entity_cell The entity cell being added
	 * @param  {String} process_name The name of the process the entity is being added to
	 * @param  {Set} visited Set of the names of already visited processes
	 * 					Used to prevent cycles when traversing the DFD
	 */

	// Check if already visited
	if (visited.has(process_name)) return;
	visited.add(process_name);

	// Add entity in parent process
	let process = get_hierarchy_diagram(process_name);
	if (process.parent_name)
		add_entity(entity_cell, process.parent_name, visited);

	// Add entity to all connected sub processes
	let sub_processes = find_connecting_cells(entity_cell, "process");

	sub_processes.forEach(process => {
		// Add entity to subprocess if exists
		try {
			get_hierarchy_diagram(process.value);
			add_entity(entity_cell, process.value, visited);
		} catch {}
	});

	// Add entity to process
	let current_graph = process.graph_model;

	/* Check if entity is already in the graph */
	if (find_cell_in_graph(current_graph, entity_cell.value, "entity")) return;

	let parent = current_graph.getChildAt(current_graph.getRoot(), 0);
	current_graph.add(parent, entity_cell.clone());
}

function remove_entity(entity_name, process_name, visited) {
	/**
	 * Recursively removes all occurrences of an entity in the DFD
	 * @param  {String} entity_name Name of the entity to remove
	 * @param  {String} process_name Name of the process to remove the entity from
	 * @param  {Set}    visited Set of the names of already visited processes
	 * 				Used to prevent cycles when traversing the DFD
	 */

	// Exit is already visited process
	if (visited.has(process_name)) return;
	visited.add(process_name);

	// Remove entity from parent process
	let process = get_hierarchy_diagram(process_name);
	if (process.parent_name)
		remove_entity(entity_name, process.parent_name, visited);

	// Remove entity from children processes
	/* find entity cell in graph */
	let current_graph = process.graph_model;
	let entity_cell = find_cell_in_graph(current_graph, entity_name, "entity");

	/* find all connected processes */
	let connected_processes = find_connecting_cells(entity_cell, "process");
	connected_processes.forEach(process => {
		try {
			get_hierarchy_diagram(process.value); // Check if has sub process
			remove_entity(entity_name, process.value, visited);
		} catch {}
	});

	// Remove entity from current process
	let remove_graph = new mxGraph(null, current_graph);
	try {
		remove_graph.getModel().beginUpdate();
		if (remove_graph.getModel().isVertex(entity_cell))
			remove_graph.removeCells([entity_cell]);
	} catch {
	} finally {
		remove_graph.getModel().endUpdate();
	}
	set_hierarchy_diagram(process_name, {
		new_model: remove_graph.getModel()
	});
}

function validate_cell_type(cell_type) {
	/**
	 * Validates cell type
	 * @param {String} cell_type Type of cell
	 * @throws Exception if invalid cell type
	 */
	let valid_cell_types = ["entity", "process", "datastore"];
	if (!valid_cell_types.includes(cell_type))
		throw `Invalid cell_type: ${cell_type}. Must be in ${valid_cell_types}.`;
}
