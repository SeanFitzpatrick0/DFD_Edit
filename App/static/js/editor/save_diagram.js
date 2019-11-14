async function save_diagram_button_handler(save_url) {
    /**
     * Saves Data Flow Diagram to server
     * @param  {String} save_url URL to make PUT request to.
     */

    // Save current active graph
    let [_, active_graph_name] = get_active_hierarchy_item_and_name();
    save_current_graph(active_graph_name);

    // Serialize Data Flow Diagram
    let dfd = serialize_dfd(hierarchy);
    let title = document.getElementById('diagram_title_input').value

    // Get edit message
    let edit_message = document.getElementById('edit_message_input').value

    // Make request
    const response = await fetch(save_url, {
        method: 'PUT',
        credentials: 'same-origin',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            title: title,
            dfd: dfd,
            edit_message: edit_message
        })
    });

    // Handel response errors
    // TODO provide better error alerting
    if (response.status != 200) {
        alert('Error: Unable to save diagram');
    }
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
        children: diagram_hierarchy.children.map(
            child => serialize_dfd(child))
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