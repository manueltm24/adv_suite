frappe.ui.form.on('Task', {
    load: function(frm) {
        console.log("load task");
    },
    onload_post_render: function (frm) {
        console.log("onload_post_render task");
        frm.get_field("custom_project_materials").grid.set_multiple_add("item_code");
    },
    refresh: function(frm) {
        console.log("refresh task");
        // Asegura que el CSS y el JS de Swiper se carguen una sola vez
        if (!$('link[href="/assets/adv_suite/swiper/swiper-bundle.min.css"]').length) {
            $('head').append('<link rel="stylesheet" href="/assets/adv_suite/swiper/swiper-bundle.min.css">');
        }

        if (!window.Swiper) {
            $.getScript("/assets/adv_suite/swiper/swiper-bundle.min.js", function() {
                initializeSwiper(frm);
            });
        } else {
            initializeSwiper(frm);
        }

        // Verifica repetidamente si la sección de adjuntos está lista
        function checkAttachmentsSection() {
            const attachmentsSection = $('.form-sidebar .form-attachments .attachments-actions');
            if (attachmentsSection.length && !$('#view-images-link').length) {
                console.log("Adding view-images-link");
                attachmentsSection.append(`
                    <li class="sidebar-menu-item">
                        <span class="octicon octicon-file-media"></span> <a href="#" id="view-images-link">${__("View Images")}</a>
                    </li>
                `);

                // Asigna el evento de clic al enlace "View Images"
                $('#view-images-link').on('click', function(event) {
                    event.preventDefault();
                    $('#slider-modal').show();
                });
            } else {
                // Si la sección de adjuntos no está lista, verifica nuevamente después de un breve retraso
                setTimeout(checkAttachmentsSection, 100);
            }
        }

        // Inicia la verificación de la sección de adjuntos
        checkAttachmentsSection();
    }
});

frappe.ui.form.on('Project Materials', {
    item_code: function(frm, cdt, cdn) {
        let row = locals[cdt][cdn];
        if (row.item_code) {
            console.log("item_code");
            frappe.db.get_value('Item', { 'name': row.item_code }, 'item_name', (r) => {
                if (r && r.item_name) {
                    frappe.model.set_value(cdt, cdn, 'item_name', r.item_name);
                } else {
                    frappe.msgprint(__('Item Code {0} not found', [row.item_code]));
                }
            });
        }
    },
    item_name: function(frm, cdt, cdn) {
        let row = locals[cdt][cdn];
        if (row.item_name) {
            console.log("item_name");
            frappe.db.get_value('Item', { 'item_name': row.item_name }, 'name', (r) => {
                if (r && r.name) {
                    frappe.model.set_value(cdt, cdn, 'item_code', r.name);
                } else {
                    frappe.msgprint(__('Item Name {0} not found', [row.item_name]));
                }
            });
        }
    }
});

function initializeSwiper(frm) {
    // Elimina cualquier modal de slider existente al refrescar el formulario
    if ($('#slider-modal').length) {
        $('#slider-modal').remove();
    }

    // Inserta el modal del slider en pantalla completa
    $('body').append(`
        <div id="slider-modal" style="display: none; position: fixed; top: 0; left: 0; width: 100vw; height: 100vh; background: rgba(0, 0, 0, 0.9); z-index: 1050; justify-content: center; align-items: center;">
            <div class="swiper-container" style="width: 90%; height: 80%;">
                <div class="swiper-wrapper"></div>
                <div class="swiper-button-next" style="color: #fff;"></div>
                <div class="swiper-button-prev" style="color: #fff;"></div>
                <div class="swiper-pagination" style="color: #fff;"></div>
            </div>
            <button id="close-slider" style="position: absolute; top: 10px; right: 20px; background: transparent; border: none; color: white; font-size: 30px; cursor: pointer; z-index: 1100;">&times;</button>
        </div>
    `);

    // Evento para cerrar el slider
    $('#close-slider').on('click', function() {
        $('#slider-modal').hide();
    });

    // Recupera las imágenes adjuntas usando frappe.call
    frappe.call({
        method: 'frappe.client.get_list',
        args: {
            doctype: 'File',
            filters: {
                attached_to_doctype: cur_frm.doc.doctype,
                attached_to_name: frm.doc.name,
                // is_private: 0  // Opcional: si solo se quieren archivos públicos
            },
            fields: ['file_name', 'file_url']
        },
        callback: function(response) {
            let files = response.message || [];

            // Filtra solo las imágenes
            let imageFiles = files.filter(file => {
                return /\.(jpg|jpeg|png|gif|jfif)$/i.test(file.file_name);
            });

            // Inserta cada imagen en el slider como un enlace
            imageFiles.forEach(file => {
                $('.swiper-wrapper').append(`
                    <div class="swiper-slide">
                            <img src="${file.file_url}" style="width: 100%; height: 100%; object-fit: contain;" alt="${file.file_name}">
                    </div>
                `);
            });

            // Inicializa Swiper una vez que las imágenes están cargadas
            if (imageFiles.length > 0) {
                new Swiper('.swiper-container', {
                    slidesPerView: 1, // Muestra solo una imagen a la vez
                    spaceBetween: 10,
                    navigation: {
                        nextEl: '.swiper-button-next',
                        prevEl: '.swiper-button-prev',
                    },
                    pagination: {
                        el: '.swiper-pagination',
                        clickable: true,
                    },
                });
            } else {
                // Si no hay imágenes, muestra un mensaje
                $('.swiper-wrapper').html(`<p style='color: white; text-align: center;'>${__("No image attachments found for this {0}.", [__(frm.doc.doctype)])}</p>`);
            }
        }
    });
}