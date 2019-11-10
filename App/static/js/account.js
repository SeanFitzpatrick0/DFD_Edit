function confirm_remove_editor(editor_name, diagram_title) {
	/**
	 * Shows remove editor confirmation alert
	 * @param  {String} editor_name Name of the editor being deleted.
	 * @param  {String} diagram_title Name of the diagram being deleted from.
	 * @returns {boolean} Weather the users confirmed the removal.
	 */
	return confirm(
		`Are you sure you want to remove ${editor_name} from ${diagram_title}.`
	);
}

function confirm_delete_diagram(diagram_title) {
	/**
	 * Shows remove delete diagram confirmation alert
	 * @param  {String} diagram_title Name of the diagram being deleted from.
	 * @returns {boolean} Weather the users confirmed the deletion.
	 */
	return confirm(`Are you sure you want to delete ${diagram_title}.`);
}
