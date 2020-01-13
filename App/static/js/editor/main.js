/* This is an mxEditor. It is initialized in main(). */
var editor;

/* This is the data structure holding information on the created DFD.
    This contains values in the form:
    {
        id:     'X.X',
        title:  'X',
        graph_model: (A mxGraph object representing the graph of that process)
        children:   [ (List of children processes in the same form) ]
    }
    Processes that don't have a sub process are not added to this hierarchy
    This hierarchy is initialized in the create_hierarchy() function in main()
*/
var hierarchy = {};

/* Constants used for cell styles */
const ID_PERMISSION =
	"editable=0;movable=0;resizable=0;cloneable=0;deletable=0;";
const CONTAINER_STYLE =
	"fillColor=white;strokeColor=#343a40;fontColor=#343a40;rounded=1;foldable=0;";
const ID_STYLE =
	"fillColor=#343a40;fontColor=white;strokeColor=#343a40;rounded=1;" +
	ID_PERMISSION;
const EDGE_STYLE = "edgeStyle=topToBottomEdgeStyle;";
const ENTITY_DIMENSIONS = {
	width: 100,
	height: 80
};
const PROCESS_DIMENSIONS = {
	width: 120,
	height: 120
};
const DATASTORE_DIMENSIONS = {
	width: 140,
	height: 60
};

function main(editor_path, loaded_hierarchy) {
	/**
	 * Initializes editor. Creates editor, toolbar and diagram hierarchy.
	 * Displays error message if browser is not supported.
	 * @param  {String} editor_path Path to editor directory.
	 * @param  {Object} loaded_hierarchy Existing Diagram hierarchy loaded from server.
	 *		This is loaded into the hierarchy global data structure.
	 		Null if creating a new DFD. New hierarchy will be created in this case 
	 */

	// Checks if browser is supported
	if (!mxClient.isBrowserSupported()) {
		mxUtils.error("This browser is not supported.", 200, false);
	} else {
		// Create Editor
		let graph_container = document.getElementById("graph");
		let toolbar_container = document.getElementById("toolbar_items");

		editor = create_editor(
			`${editor_path}/config/keyhandler-commons.xml`,
			graph_container
		);

		create_toolbar(
			editor.graph,
			toolbar_container,
			`${editor_path}/images`
		);

		create_hierarchy(loaded_hierarchy);
	}
}
