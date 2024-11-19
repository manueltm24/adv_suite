function initializeImageSlider(frm) {
    initializeSliderOnPageChange(frm);
    checkAndAddViewImagesLink(frm);
    observeAttachments(frm);
}

function initializeSliderOnPageChange(frm) {
    if (typeof mySwiper !== 'undefined') {
        mySwiper.destroy(true, true); // Destruir cualquier instancia previa
    }

    initializeSwiper(frm);
}

function initializeSwiper(frm) {
    // Cargar CSS y JS de Swiper si no están cargados
    if (!$('link[href="/assets/adv_suite/swiper/swiper-bundle.min.css"]').length) {
        $('head').append('<link rel="stylesheet" href="/assets/adv_suite/swiper/swiper-bundle.min.css">');
    }

    if (!window.Swiper) {
        $.getScript("/assets/adv_suite/swiper/swiper-bundle.min.js", function() {
            createSliderModal(frm);
        });
    } else {
        createSliderModal(frm);
    }
}

function createSliderModal(frm) {
    // Elimina cualquier modal de slider existente al refrescar el formulario
    if ($('#slider-modal').length) {
        $('#slider-modal').remove();
    }

    // Inserta el modal del slider en pantalla completa
    $('body').append(`
        <div id="slider-modal" style="display: none; position: fixed; top: 0; left: 0; width: 100vw; height: 100vh; background: rgba(0, 0, 0, 0.9); z-index: 1050; justify-content: center; align-items: center;">
            <div class="swiper-container" style="width: 100%; height: 90%;">
                <div class="swiper-wrapper"></div>
                <div class="swiper-button-next" style="color: #fff;"></div>
                <div class="swiper-button-prev" style="color: #fff;"></div>
                <div class="swiper-pagination" style="color: #fff;"></div>
            </div>
            <button id="close-slider" style="position: absolute; top: 10px; right: 20px; background: transparent; border: none; color: white; font-size: 30px; cursor: pointer; z-index: 1100;">&times;</button>
        </div>
    `);

    // Añadir CSS personalizado para los puntos de paginación
    $('head').append(`
        <style>
            .swiper-pagination-bullet {
                background: #fafafa;
            }
            .swiper-pagination-bullet-active {
                background: var(--dark-green-avatar-bg);
            }
        </style>
    `);
    
    // Evento para cerrar el slider
    $('#close-slider').on('click', function () {
        $('#slider-modal').hide();
    });

    // Inicializar el slider vacío
    loadImagesIntoSlider(frm);
}

function loadImagesIntoSlider(frm) {
    frappe.call({
        method: 'frappe.client.get_list',
        args: {
            doctype: 'File',
            filters: {
                attached_to_doctype: frm.doc.doctype,
                attached_to_name: frm.doc.name,
            },
            fields: ['file_name', 'file_url', 'creation'],
            order_by: 'creation asc'
        },
        callback: function (response) {
            const files = response.message || [];
            const swiperWrapper = $('.swiper-wrapper');
            console.log(files);
            if (files.length > 0) {
                swiperWrapper.empty(); // Vaciar el contenedor
                
                files.forEach(file => {
                    if (/\.(jpg|jpeg|png|gif|jfif|webp)$/i.test(file.file_name)) {
                        swiperWrapper.append(`
                            <div class="swiper-slide" style="display: flex; justify-content: center; align-items: center;">
                                <img src="${file.file_url}" alt="${file.file_name}" style="width: auto; height: 100%; max-height: 90vh; object-fit: contain;">
                            </div>
                        `);
                    }
                });

                const loopMode = files.length > 1; // Habilitar el modo de bucle solo si hay más de una diapositiva
                mySwiper = new Swiper('.swiper-container', {
                    loop: loopMode,
                    pagination: {
                        el: '.swiper-pagination',
                        clickable: true,
                    },
                    navigation: {
                        nextEl: '.swiper-button-next',
                        prevEl: '.swiper-button-prev',
                    },
                });
            } else {
                swiperWrapper.html(`<p style='color: white; text-align: center;'>${__("No image attachments found for this {0}.", [__(frm.doc.doctype)])}</p>`);
            }
        }
    });
}

function checkAndAddViewImagesLink(frm) {
    if (!frm.doc.doctype || !frm.doc.name) {
        return;
    }

    frappe.call({
        method: 'frappe.client.get_list',
        args: {
            doctype: 'File',
            filters: {
                attached_to_doctype: frm.doc.doctype,
                attached_to_name: frm.doc.name,
            },
            fields: ['file_name', 'file_url']
        },
        callback: function (response) {
            const files = response.message || [];
            const hasImages = files.some(file => /\.(jpg|jpeg|png|gif|jfif|webp)$/i.test(file.file_name));
            
            console.log("hasImages");
            console.log(hasImages);

            // Elimina enlaces previos
            const linkId = `view-images-link-${frm.doc.doctype.toLowerCase()}`;
            $(`#${linkId}`).remove();
            $('.sidebar-menu-item').remove();

            if (hasImages) {
                const attachmentsSection = $('.form-sidebar .form-attachments .attachments-actions');
                if (attachmentsSection.length) {
                    attachmentsSection.append(`
                        <li class="sidebar-menu-item">
                            <span>
                                <svg class="icon icon-sm">
                                    <use xlink:href="/assets/frappe/icons/timeless/icons.svg#icon-image"></use>
                                </svg>
                            </span>
                            <a href="#" id="${linkId}">${__("View Images")}</a>
                        </li>
                    `);

                    // Asignar evento al enlace
                    $(document).off('click', `#${linkId}`).on('click', `#${linkId}`, function (event) {
                        event.preventDefault();
                        $('#slider-modal').show();
                    });
                }
            }
        }
    });
}

function observeAttachments(frm) {
    const sidebar = document.querySelector('.form-sidebar .form-attachments');
    if (sidebar) {
        // Desconectar cualquier observador previo
        if (window.attachmentObserver) {
            window.attachmentObserver.disconnect();
        }

        // Crear un nuevo observador
        window.attachmentObserver = new MutationObserver((mutationsList) => {
            let shouldCheck = false;
            for (let mutation of mutationsList) {
                if (mutation.type === 'childList' && (mutation.addedNodes.length > 0 || mutation.removedNodes.length > 0)) {
                    // Verificar si el nodo agregado o eliminado es un adjunto
                    for (let node of mutation.addedNodes) {
                        if (node.nodeType === 1 && node.classList.contains('attachment-row')) {
                            shouldCheck = true;
                            break;
                        }
                    }
                    for (let node of mutation.removedNodes) {
                        if (node.nodeType === 1 && node.classList.contains('attachment-row')) {
                            shouldCheck = true;
                            break;
                        }
                    }
                }
            }
            if (shouldCheck) {

                checkAndAddViewImagesLink(frm);
                loadImagesIntoSlider(frm);

            }
        });

        window.attachmentObserver.observe(sidebar, { childList: true, subtree: true });
    }
}