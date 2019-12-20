function create_process_id(parent_id) {
	/**
	 * Creates the ID for a new process
	 * @param  {String} parent_id ID of the parent graph.
     *                          Null if creating ID for system process.
	 * @return  {String} New Process ID.
	 */
	if (parent_id == null) return "0";
	
	let current_graph = editor.graph.getModel();
	let graph_cells = current_graph.cells;
    let process_cells = [];
    for (cell in graph_cells)
	if (graph_cells[cell].item_type == "process") process_cells.push(cell);
	let new_id = process_cells.length + 1;

	if (parent_id == "0") return new_id.toString();
	else return `${parent_id}.${new_id}`;
}