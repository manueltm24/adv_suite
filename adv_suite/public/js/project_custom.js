let cursor_position = null;
let last_word = '';

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
                // Eliminar etiquetas HTML y otros caracteres no deseados
                let clean_text = notes_text.replace(/<\/?[^>]+(>|$)/g, "").trim();
                console.log('Clean text:', clean_text);

                // Obtener la posición actual del cursor
                let selection = window.getSelection();
                let range = selection.getRangeAt(0);
                let preCaretRange = range.cloneRange();
                preCaretRange.selectNodeContents(frm.fields_dict.notes.$wrapper.find('.ql-editor')[0]);
                preCaretRange.setEnd(range.endContainer, range.endOffset);
                cursor_position = preCaretRange.toString().length;
                console.log('Cursor position:', cursor_position);

                // Capturar el texto hasta la posición actual del cursor
                let text_until_cursor = clean_text.substring(0, cursor_position).trim();
                console.log('Text until cursor:', text_until_cursor);
                // Capturar la última palabra o fracción de la última palabra
                last_word = text_until_cursor.split(/\s+/).pop();
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

function show_suggestions(items, frm) {
    console.log('Showing suggestions:', items);
    // Crear un contenedor para las sugerencias
    let suggestions_container = $('<div class="suggestions-container"></div>');
    let suggestion_items = [];
    items.forEach((item, index) => {
        let suggestion = $('<div class="suggestion-item"></div>').text(item.item_name);
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

    // Posicionar el contenedor de sugerencias en la esquina superior derecha de la pantalla
    suggestions_container.css({
        position: 'fixed',
        top: '100px', // Ajustar la posición para que coincida con la esquina superior derecha de la pantalla
        right: '10px', // Ajustar la posición para que coincida con la esquina superior derecha de la pantalla
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
    console.log('Suggestions container position v15:', suggestions_container.position());

    // Posicionar el cursor en el primer resultado si hay resultados
    if (suggestion_items.length > 0) {
        let selected_index = 0;
        suggestion_items[selected_index].addClass('selected');

        // Manejar la navegación con las teclas de arriba y abajo
        $(document).on('keydown.suggestions', function(event) {
            if (event.key === 'ArrowDown') {
                event.preventDefault();
                suggestion_items[selected_index].removeClass('selected');
                selected_index = (selected_index + 1) % suggestion_items.length;
                suggestion_items[selected_index].addClass('selected');
            } else if (event.key === 'ArrowUp') {
                event.preventDefault();
                suggestion_items[selected_index].removeClass('selected');
                selected_index = (selected_index - 1 + suggestion_items.length) % suggestion_items.length;
                suggestion_items[selected_index].addClass('selected');
            } else if (event.key === 'Enter') {
                event.preventDefault();
                suggestion_items[selected_index].click();
            }
        });
    }
}

function insert_suggestion(frm, suggestion_text) {
    console.log('Inserting suggestion:', suggestion_text);
    let quill = frm.fields_dict.notes.quill;
    if (cursor_position !== null) {
        console.log('Deleting text:', last_word);
        quill.deleteText(cursor_position - last_word.length, last_word.length);
        console.log('Inserting text:', suggestion_text);
        quill.insertText(cursor_position - last_word.length, suggestion_text, 'user');
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