// No se usa en esta versión, ya que se establece en el property setter del orden de la lista
frappe.listview_settings['Task'] = {
    onload: function(listview) {
        listview.sort_selector = {
            field: "custom_last_assignment_date",
            order: "ASC"
        };

        // Forzar NULL al final
        listview.page.fields_dict.sort_by.df.options = [
            { label: __("Last Assignment Date"), value: "CASE WHEN custom_last_assignment_date IS NULL THEN 1 ELSE 0 END ASC, custom_last_assignment_date ASC" }
        ];
    }
};
