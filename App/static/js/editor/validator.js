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
			if (edge.source.item_title == "entity")
				entities.push(edge.source);
			else if (edge.target.item_title == "entity")
				entities.push(edge.target);
		});

	// Add those entities to the sub process graph
	let sub_graph = get_hierarchy_diagram(process_name).graph_model;
	let parent = sub_graph.getChildAt(sub_graph.getRoot(), 0);
	entities.forEach(entity => sub_graph.add(parent, entity.clone()));
}