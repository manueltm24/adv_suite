frappe.ui.form.on('Project', {
    refresh: function(frm) {
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

        // Accede directamente a .form-sidebar y verifica si existe la sección de adjuntos
        const attachmentsSection = $('.form-sidebar .form-attachments .attachments-actions');
        
        if (attachmentsSection.length && !$('#view-images-link').length) {
            attachmentsSection.append(`
                <li class="sidebar-menu-item">
                    <span class="octicon octicon-file-media"></span> <a href="#" id="view-images-link">${__("View Images")}</a>
                </li>
            `);
        }

        // Asigna el evento de clic al enlace "View Images"
        $('#view-images-link').on('click', function(event) {
            event.preventDefault();
            $('#slider-modal').show();
        });
    }
});

function initializeSwiper(frm) {
    // Elimina cualquier modal de slider existente al refrescar el formulario
    if ($('#slider-modal').length) {
        $('#slider-modal').remove();
    }

    // Inserta el modal del slider en pantalla completa con un z-index más alto
    $('body').append(`
        <div id="slider-modal" style="display: none; position: fixed; top: 0; left: 0; width: 100vw; height: 100vh; background: rgba(0, 0, 0, 0.9); z-index: 1050; justify-content: center; align-items: center;">
            <div class="swiper-container" style="width: 90%; height: 80%;">
                <div class="swiper-wrapper"></div>
                <div class="swiper-button-next" style="color: #fff;"></div>
                <div class="swiper-button-prev" style="color: #fff;"></div>
            </div>
            <button id="close-slider" style="position: absolute; top: 20px; right: 20px; background: transparent; border: none; color: white; font-size: 30px; cursor: pointer; z-index: 1100;">&times;</button>
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
                attached_to_doctype: 'Project',
                attached_to_name: frm.doc.name,
                // is_private: 0  // Opcional: si solo quieres archivos públicos
            },
            fields: ['file_name', 'file_url']
        },
        callback: function(response) {
            let files = response.message || [];

            // Filtra solo las imágenes
            let imageFiles = files.filter(file => {
                return /\.(jpg|jpeg|png|gif)$/i.test(file.file_name);
            });

            // Inserta cada imagen en el slider como un enlace
            imageFiles.forEach(file => {
                $('.swiper-wrapper').append(`
                    <div class="swiper-slide">
                        <a href="${file.file_url}" target="_blank">
                            <img src="${file.file_url}" style="width: 100%; height: 100%; object-fit: contain;" alt="${file.file_name}">
                        </a>
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
                $('.swiper-wrapper').html(`<p style='color: white; text-align: center;'>${__("No image attachments found for this project.")}</p>`);
            }
        }
    });
}