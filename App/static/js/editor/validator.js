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
	if (typeof (id_ending) === 'undefined') {
		let current_graph = editor.graph.getModel();
		let graph_cells = current_graph.cells;
		let process_cells = [];
		for (cell in graph_cells)
			if (graph_cells[cell].item_type == "process") process_cells.push(cell);
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

function add_entities(process_name, parent_name) {
	/**
	 * Adds a processes connected entities into its sub diagram
	 * @param  {String} process_name Name of sub process being created
	 * @param  {String} parent_name Name of parent process
	 */
	// Search for connected entities in graph model
	let entities = [];
	let parent_graph = get_hierarchy_diagram(parent_name).graph_model
	let process_cell = null;
	/* find sub process being created in parent graph */
	for (key in parent_graph.cells)
		if (parent_graph.cells[key].value == process_name)
			process_cell = parent_graph.cells[key];

	/* find all connected entities */
	if (process_cell.edges)
		process_cell.edges.forEach(edge => {
			if (edge.source.item_type == "entity")
				entities.push(edge.source);
			else if (edge.target.item_type == "entity")
				entities.push(edge.target);
		});

	// Add those entities to the sub process graph
	let sub_graph = get_hierarchy_diagram(process_name).graph_model;
	let parent = sub_graph.getChildAt(sub_graph.getRoot(), 0);
	entities.forEach(entity => sub_graph.add(parent, entity.clone()));
}

function remove_entity(entity_name, process_name, visited) {
	/**
	 * Recursively removes all occurrences of an entity in the DFD
	 * @param  {String} entity_name Name of the entity to remove
	 * @param  {String} process_name Name of the process to remove the entity from
	 * @param  {Set}    visited Set of the names of already visited processes
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
	let entity_cell = null;
	for (key in current_graph.cells)
		if (current_graph.cells[key].value == entity_name)
			entity_cell = current_graph.cells[key];

	/* find all connected processes */
	let connected_processes = [];
	if (entity_cell.edges)
		entity_cell.edges.forEach(edge => {
			if (edge.source.item_type == "process")
				connected_processes.push(edge.source);
			else if (edge.target.item_type == "process")
				connected_processes.push(edge.target);
		});

	connected_processes.forEach((process) => {
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
	} catch {} finally {
		remove_graph.getModel().endUpdate();
	}
	set_hierarchy_diagram(process_name, {
		new_model: remove_graph.getModel()
	});
}