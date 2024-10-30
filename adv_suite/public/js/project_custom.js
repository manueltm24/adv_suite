function get_last_word(text, cursor_position) {
    // Dividir el texto en párrafos
    let paragraphs = text.split(/<\/?p[^>]*>/g).filter(p => p.trim() !== '');
    let char_count = 0;

    for (let paragraph of paragraphs) {
        // Limpiar el HTML del párrafo
        let clean_paragraph = paragraph.replace(/<(?!\/?p\b)[^>]+>/g, "");
        console.log('Clean paragraph:', clean_paragraph);

        // Contar los caracteres del párrafo
        char_count += clean_paragraph.length;
        console.log('Char count:', char_count);

        // Verificar si el cursor_position está en este párrafo
        if (char_count >= cursor_position) {
            // Calcular la posición del cursor dentro del párrafo
            let cursor_in_paragraph = cursor_position - (char_count - clean_paragraph.length);
            console.log('Cursor in paragraph:', cursor_in_paragraph);

            // Obtener el texto hasta la posición del cursor en el párrafo
            let text_until_cursor = clean_paragraph.substring(0, cursor_in_paragraph).trim();
            console.log('Text until cursor in paragraph:', text_until_cursor);

            // Capturar la última palabra o fracción de la última palabra
            let last_word = text_until_cursor.split(/\s+/).pop();
            console.log('Last word:', last_word);

            for (let word of text_until_cursor.split(/\s+/)) {
                console.log('Word:', word);
            }

            // Verificar si la última palabra no está vacía
            if (last_word !== '') {
                return last_word;
            } else {
                console.log('Last word is empty');
            }
        }
    }
    return '';
}

frappe.ui.form.on('Project', {
    onload: function(frm) {
    
        // Configurar el número de resultados a mostrar
        const num_results = 5;

        // Agregar un evento de escucha para el campo de notas
        frm.fields_dict.notes.$wrapper.on('keydown', function(event) {
            console.log('Keydown event detected');
            // Verificar si la tecla presionada es Tab
            if (event.key === 'Tab') {
                console.log('Tab key pressed');
                // Obtener el texto actual del campo de notas
                let notes_text = frm.fields_dict.notes.$wrapper.find('.ql-editor').html();
                console.log('Notes text:', notes_text);

                // Obtener la posición actual del cursor utilizando Quill
                let quill = frm.fields_dict.notes.quill;
                let range = quill.getSelection();
                console.log('Cursor range:', range);
                cursor_position = range ? range.index : null;
                console.log('Cursor position:', cursor_position);

                // Obtener la última palabra antes del cursor
                last_word = get_last_word(notes_text, cursor_position);
                console.log('Last word:', last_word);

                // Realizar una búsqueda en el Doctype Item
                if (last_word !== '') {
                    frappe.call({
                        method: 'adv_suite.api.search_items',
                        args: {
                            query: last_word,
                            limit: num_results
                        },
                        callback: function(r) {
                            if (r.message && r.message.length > 0) {
                                console.log('Search results:', r.message);
                                // Mostrar las sugerencias al usuario
                                show_suggestions(r.message, frm);
                            } else {
                                console.log('No search results');
                                remove_suggestions();
                            }
                        }
                    });
                } else {
                    console.log('Last word is empty');
                    remove_suggestions();
                }
            }
        });
    }
});

function insert_suggestion(frm, suggestion_text) {
    console.log('Inserting suggestion:', suggestion_text);
    let quill = frm.fields_dict.notes.quill;
    if (cursor_position !== null) {
        console.log('Deleting text:', last_word);
        let start_index = cursor_position - last_word.length;
        quill.deleteText(start_index, last_word.length);
        console.log('Inserting text:', suggestion_text);
        quill.insertText(start_index, suggestion_text, 'user');
        quill.setSelection(start_index + suggestion_text.length); // Mantener el cursor al final del texto insertado
        console.log('Text inserted');
        cursor_position = null; // Reset cursor position
    } else {
        console.log('Cursor position is null');
    }
}

function remove_suggestions() {
    $('.suggestions-container').remove();
    $(document).off('keydown.suggestions');
}

function show_suggestions(items, frm) {
    console.log('Showing suggestions:', items);
    // Crear un contenedor para las sugerencias
    let suggestions_container = $('<div class="suggestions-container"></div>');
    let suggestion_items = [];
    items.forEach((item, index) => {
        let suggestion = $('<div class="suggestion-item btn-reset dropdown-item"></div>').text(item.item_name);
        suggestion.css({
            padding: '5px',
            cursor: 'pointer',
            borderBottom: '1px solid #ccc' // Añadir borde inferior para separar las sugerencias
        });
        suggestion.on('click', function() {
            insert_suggestion(frm, item.item_name);
            suggestions_container.remove();
            $(document).off('keydown.suggestions');
        });
        suggestions_container.append(suggestion);
        suggestion_items.push(suggestion);
    });
    console.log('Suggestions container created');
    console.log(suggestions_container);

    // Obtener la posición del div con clase ql-editor
    let editor_div = frm.fields_dict.notes.$wrapper.find('.ql-editor');
    let editor_offset = editor_div.offset();
    let editor_height = editor_div.outerHeight();

    // Posicionar el contenedor de sugerencias en la esquina superior derecha del div ql-editor
    suggestions_container.css({
        position: 'absolute',
        top: editor_offset.top,
        left: editor_offset.left + editor_div.outerWidth() - suggestions_container.outerWidth(),
        zIndex: 1000,
        backgroundColor: '#fff',
        border: '1px solid #ccc',
        padding: '5px',
        borderRadius: '3px',
        boxShadow: '0 2px 5px rgba(0,0,0,0.2)',
        maxHeight: '300px', // Aumentar la altura máxima para mostrar más sugerencias
        overflowY: 'auto',
        display: 'block', // Asegurarse de que el contenedor esté visible
        width: '200px' // Establecer un ancho fijo para el contenedor
    });

    // Agregar el contenedor de sugerencias al DOM
    $('body').append(suggestions_container);
    console.log('Suggestions container added to DOM');
    console.log('Suggestions container dimensions:', suggestions_container.outerWidth(), suggestions_container.outerHeight());
    console.log('Suggestions container position v18:', suggestions_container.position());

    // Posicionar el cursor en el primer resultado si hay resultados
    if (suggestion_items.length > 0) {
        let selected_index = 0;
        suggestion_items[selected_index].addClass('selected');
        suggestion_items[selected_index].focus();

        // Manejar la navegación con las teclas de arriba y abajo
        $(document).on('keydown.suggestions', function(event) {
            if (event.key === 'ArrowDown') {
                event.preventDefault();
                suggestion_items[selected_index].removeClass('selected');
                selected_index = (selected_index + 1) % suggestion_items.length;
                suggestion_items[selected_index].addClass('selected');
                suggestion_items[selected_index].focus();
            } else if (event.key === 'ArrowUp') {
                event.preventDefault();
                suggestion_items[selected_index].removeClass('selected');
                selected_index = (selected_index - 1 + suggestion_items.length) % suggestion_items.length;
                suggestion_items[selected_index].addClass('selected');
                suggestion_items[selected_index].focus();
            } else if (event.key === 'Enter') {
                event.preventDefault();
                suggestion_items[selected_index].click();
            }
        });
    }
}