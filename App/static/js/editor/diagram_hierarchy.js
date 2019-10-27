function create_hierarchy() {
	/**
	 * Initializes diagram hierarchy.
	 */

	// Add starting diagram
	let starting_diagram_name = "Contextual diagram";
	add_to_hierarchy(starting_diagram_name);

	// Set starting diagram as active
	document
		.getElementById("Contextual_diagram_hierarchy_item")
		.classList.add("diagram_active");
}

function add_to_hierarchy(name, parent_name) {
	/**
	 * Adds new diagram to hierarchy data structure and html diagram list.
	 * @param  {String} name Name of diagram to add.
	 * @param  {String} parent_name Name of parent diagram.
	 *                              Null if adding first diagram.
	 * @throws exception if diagram name already in hierarchy or if name is empty.
	 */

	// Validate inputs
	/* Check name not empty */
	if (!name || name.length == 0)
		throw "Error: Can't add a diagram with no name to hierarchy.";
	/* Check if diagram is already in hierarchy */
	let found_diagram = false;
	try {
		let existing_diagram = get_hierarchy_diagram(name);
		found_diagram = true;
	} catch {
	} finally {
		if (found_diagram)
			throw `Error: Diagram ${name} already exists in hierarchy.`;
	}

	// Add entry to hierarchy
	let empty_graph_model = new mxGraph().getModel();
	let entry = {
		name: name,
		graph_model: empty_graph_model,
		children: []
	};
	let parent_id;
	if (!parent_name || name.length == 0) {
		// Create starting hierarchy
		hierarchy = entry;
		parent_id = "hierarchy_list";
	} else {
		// Add entry to parents children
		let parent_hierarchy = get_hierarchy_diagram(parent_name);
		parent_hierarchy.children.push(entry);
		parent_id = `${parent_name}_hierarchy_item`;
		parent_id = parent_id.replace(/[ ]/g, "_"); // replace spaces with underscore
	}

	// Add diagram to html hierarchy list
	/* create html element */
	let id_name = name.replace(/[ ]/g, "_"); // replace spaces with underscore
	let hierarchy_item_html = `
		<li id="${id_name}_hierarchy_item" class="list-group-item">
			<p class="hierarchy_item_title">${name}</p>
			<ul id="${id_name}_children"></ul>
		</li>
	`;
	/* add element to html document */
	let parent_element = document.getElementById(parent_id);
	parent_element.innerHTML += hierarchy_item_html;

	// Add event listener to hierarchy list item
	let added_item = document.getElementById(`${id_name}_hierarchy_item`);
	added_item.addEventListener("click", switch_graph);
}

function get_hierarchy_diagram(name) {
	/**
	 * Gets diagram from hierarchy.
	 * @param  {String} name Name of diagram to get.
	 * @returns The found diagram.
	 * @throws exception if diagram not in hierarchy.
	 */

	let search_hierarchy = _get_hierarchy_diagram_helper(hierarchy, name);
	if (!search_hierarchy)
		throw `Error: Couldn't find ${name} in diagram hierarchy.`;

	return search_hierarchy;
}

function set_hierarchy_diagram(name, { new_name = null, new_model = null }) {
	/**
	 * Gets new values for diagram in hierarchy.
	 * @param  {String} name Name of diagram to set.
	 * @param  {String} new_name (Optional) New name to set.
	 * @param  {Object} new_model (Optional) New graph to set.
	 * @throws exception if diagram not in hierarchy.
	 */
	let search_hierarchy = get_hierarchy_diagram(name);

	// Validate new values
	if (new_name != null)
		if (new_name.length > 0) search_hierarchy.name = new_name;
		else throw "Error: New diagram name cant be empty.";

	if (new_model != null) search_hierarchy.graph_model = new_model;
}

function _get_hierarchy_diagram_helper(sub_hierarchy, name) {
	/**
	 * Recursive helper to search for diagram in hierarchy.
	 * @param  {Object} sub_hierarchy Hierarchy being searched.
	 * @param  {String} name Name of diagram being searched for.
	 * @returns Diagram entry if found otherwise null.
	 */

	// Check for match
	if (name == sub_hierarchy.name) return sub_hierarchy;

	// Search each child
	let search_result = null;
	sub_hierarchy.children.forEach(child => {
		let search = _get_hierarchy_diagram_helper(child, name);
		if(search != null) search_result = search;
	});

	return search_result;
}

function switch_graph(event) {
	/**
	 * Diagram hierarchy list click event handler.
	 * Switch's the editing diagram with the one selected.
	 * @param  {Object} event On click event.
	 */

	// Prevent event bubbling to outer elements
	event.stopPropagation();

	// Get hierarchy items
	let target_hierarchy_item = event.target;
	/* get list item if title clicked */
	if (target_hierarchy_item.classList.contains("hierarchy_item_title"))
		target_hierarchy_item = target_hierarchy_item.parentElement;
	let current_hierarchy_item = document.getElementsByClassName("diagram_active")[0];

	// Break if target item is already active
	if (target_hierarchy_item.classList.contains("diagram_active")) return;

	// Get active and target items names
	let current_graph_name = current_hierarchy_item.getElementsByClassName(
		"hierarchy_item_title"
	)[0].innerText;
	let target_graph_name = target_hierarchy_item.getElementsByClassName(
		"hierarchy_item_title"
	)[0].innerText;

	// Update editor graph
	/* Get current and target graph */
	let current_graph = editor.graph;
	let target_graph = get_hierarchy_diagram(target_graph_name).graph_model;

	/* Save current graph */
	/* Deep copy current graph */
	let save_graph = new mxGraph();
	save_graph.addCells(
		current_graph.cloneCells(
			current_graph.getChildCells(current_graph.getDefaultParent())
		)
	);
	save_graph = save_graph.getModel();
	set_hierarchy_diagram(current_graph_name, { new_model: save_graph });

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

	// Swap active class
	current_hierarchy_item.classList.remove("diagram_active");
	target_hierarchy_item.classList.add("diagram_active");
}

function add_diagram_button_handler() {
	/**
	 * Add sub-diagram button handler.
	 * Adds new sub-diagram for selected process.
	 */

	// Get item name
	let item_name = document.getElementById("item_configurations_title")
		.innerText;
	// Get parent name
	let parent_name = document
		.getElementsByClassName("diagram_active")[0]
		.getElementsByClassName("hierarchy_item_title")[0].innerText;
	// Add to hierarchy
	add_to_hierarchy(item_name, parent_name);
}
