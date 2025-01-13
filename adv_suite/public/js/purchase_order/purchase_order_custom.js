frappe.ui.form.on('Purchase Order', {
    onload: function(frm) {
        console.log('onload');
        $(frm.fields_dict.custom_notes.wrapper).find('textarea').css('height', '75px');
    },
    onload_post_render: function(frm) {        
        // Ajustar la altura del campo custom_notes
        $(frm.fields_dict.custom_notes.wrapper).find('textarea').css('height', '75px');

    },
    refresh: function(frm) {
        $(frm.fields_dict.custom_notes.wrapper).find('textarea').css('height', '75px');
    }
});