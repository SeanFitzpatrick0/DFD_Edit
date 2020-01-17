function show_save_modal() {
	/**
	 * Opens save model if DFD has title or alerts users to add title if not
	 */
	let title = document.getElementById("diagram_title_input").value;
	if (!title) alert("Please give DFD a title before saving.");
	else $("#save_modal").modal("toggle");
}

async function save_diagram_button_handler(save_url, save_method) {
	/**
	 * Saves Data Flow Diagram to server
	 * @param  {String} save_url URL to make PUT request to.
	 * @param  {String} save_method The HTTP request method to use.
	 *      POST when creating a new graph, PUT updating an existing graph
	 */
	// Save current active graph
	let active_graph_name = get_active_hierarchy_item_and_name()[1];
	save_current_graph(active_graph_name);

	// Serialize Data Flow Diagram
	let dfd = serialize_dfd(hierarchy);
	let title = document.getElementById("diagram_title_input").value;

	// Get edit message
	let edit_message = document.getElementById("edit_message_input").value;

	// Make save request
	fetch(save_url, {
		method: save_method,
		credentials: "same-origin",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({
			title: title,
			dfd: dfd,
			edit_message: edit_message
		})
	})
		.then(response => {
			if (response.status != 200) alert("Error: Unable to save diagram");
			else return response.json();
		})
		.then(json => {
			// Redirect if created new diagram
			if (json.success && json.diagram_url)
				window.location.href = json.diagram_url;
		});
}

function serialize_dfd(diagram_hierarchy) {
	/**
	 * Recursively serialize diagram hierarchy. Graph models are encoded as xml.
	 * @param  {Object} sub_hierarchy Hierarchy being serialized.
	 * @returns Serialized Diagram
	 */
	// Serialize diagram to xml
	let encoder = new mxCodec();
	let result = encoder.encode(diagram_hierarchy.graph_model);
	let xml = mxUtils.getXml(result);

	return {
		title: diagram_hierarchy.name,
		xml_model: xml,
		children: diagram_hierarchy.children.map(child => serialize_dfd(child))
	};
}

function save_current_graph(active_graph_name) {
	/**
	 * Saves currently edited graph to diagram hierarchy.
	 * @param  {String} active_graph_name Name of edit graph
	 */
	let current_graph = editor.graph;
	/* Deep copy current graph */
	let save_graph = new mxGraph();
	save_graph.addCells(
		current_graph.cloneCells(
			current_graph.getChildCells(current_graph.getDefaultParent())
		)
	);
	save_graph = save_graph.getModel();
	set_hierarchy_diagram(active_graph_name, {
		new_model: save_graph
	});
}

async function export_diagram_button_handler() {
	/**
	 * Makes export request and download of turtle RDF representation of DFD
	 */
	// Confirm DFD is valid
	let validation_result = is_dfd_valid(hierarchy);
	if (!validation_result[0]) {
		alert(`Error: ${validation_result[1]}`);
		return;
	}

	// Serialize Data Flow Diagram
	let dfd = serialize_dfd(hierarchy);

	// Make export request
	const export_url = "/diagram/export";
	await fetch(export_url, {
		method: "POST",
		credentials: "same-origin",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({ dfd })
	})
		.then(response => {
			if (response.status != 200) alert("Error: Unable to export DFD");
			else return response.json();
		})
		.then(json => {
			// Download turtle rdf
			if (json.success && json.rdf) {
				let title = document.getElementById("diagram_title_input")
					.value;
				title = title.length > 0 ? title : "DFD";
				download(`${title}.ttl`, json.rdf);
			}
		});
}

function download(filename, text) {
	/**
	 * Downloads file containing text content
	 * @param  {String} filename Download filename.
	 * @param  {String} text Content of the file.
	 */
	// Create download link
	var link = document.createElement("a");
	link.setAttribute(
		"href",
		"data:text/plain;charset=utf-8," + encodeURIComponent(text)
	);
	link.setAttribute("download", filename);

	// Download
	link.click();
}
