frappe.provide("adv_suite.utils");

adv_suite.utils.Slider = class Slider {
    constructor() {
        this.attachmentsDeleted = false;
        this.mySwiper = null; // Asegurarse de que mySwiper esté accesible en toda la clase
    }

    initializeImageSlider(frm) {
        this.initializeSliderOnPageChange(frm);
        this.checkAndAddViewImagesLink(frm);
        this.AttachmentObserverManager.start(frm);
    }

    initializeSliderOnPageChange(frm) {
        if (this.mySwiper) {
            this.mySwiper.destroy(true, true); // Destruir cualquier instancia previa
        }

        this.initializeSwiper(frm);
    }

    initializeSwiper(frm) {
        // Cargar CSS y JS de Swiper si no están cargados
        if (!$('link[href="/assets/adv_suite/swiper/swiper-bundle.min.css"]').length) {
            $('head').append('<link rel="stylesheet" href="/assets/adv_suite/swiper/swiper-bundle.min.css">');
        }

        if (!window.Swiper) {
            $.getScript("/assets/adv_suite/swiper/swiper-bundle.min.js", () => {
                this.createSliderModal(frm);
            });
        } else {
            this.createSliderModal(frm);
        }
    }

    createSliderModal(frm) {
        // Elimina cualquier modal de slider existente al refrescar el formulario
        if ($('#slider-modal').length) {
            $('#slider-modal').remove();
        }

        // Inserta el modal del slider en pantalla completa
        $('body').append(`
            <div id="slider-modal" style="display: none; position: fixed; top: 0; left: -5px; width: 100vw; height: 100vh; background: rgba(0, 0, 0, 0.9); z-index: 1050; justify-content: center; align-items: center;">
                <div class="swiper-container" style="width: 100%; height: 90%;">
                    <div class="swiper-wrapper"></div>
                    <div class="swiper-button-next" style="color: #fff;"></div>
                    <div class="swiper-button-prev" style="color: #fff;"></div>
                    <div class="swiper-pagination" style="color: #fff;"></div>
                </div>
                <button id="close-slider" class="btn btn-modal-close btn-link" style="position: absolute; top: 0px; right: 30px; background: transparent; border: none; color: white; font-size: 30px; cursor: pointer; z-index: 1100;">
                    <svg class="icon icon-md" aria-hidden="true">
                        <use class="close-alt" href="#icon-close-swiper"></use>
                    </svg>
                </button>
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
        $('#close-slider').on('click', () => {
            $('#slider-modal').hide();
            if (this.attachmentsDeleted) {
                cur_frm.reload_doc(); // Recargar el documento para actualizar los adjuntos
                this.attachmentsDeleted = false; // Restablecer la variable
            }    
        });

        // Inicializar el slider vacío
        this.loadImagesIntoSlider(frm);
    }

    loadImagesIntoSlider(frm) {
        frappe.call({
            method: 'frappe.client.get_list',
            args: {
                doctype: 'File',
                filters: {
                    attached_to_doctype: frm.doc.doctype,
                    attached_to_name: frm.doc.name,
                },
                fields: ['file_name', 'file_url', 'creation', 'name'],
                order_by: 'creation asc'
            },
            callback: (response) => {
                const files = response.message || [];
                const swiperWrapper = $('.swiper-wrapper');
                if (files.length > 0) {
                    swiperWrapper.empty(); // Vaciar el contenedor
                    
                    files.forEach(file => {
                        if (/\.(jpg|jpeg|png|gif|jfif|webp)$/i.test(file.file_name)) {
                            swiperWrapper.append(`
                                <div class="swiper-slide" style="display: flex; justify-content: center; align-items: center; position: relative;">
                                    <img src="${file.file_url}" alt="${file.file_name}" style="width: auto; height: 100%; max-height: 90vh; object-fit: contain;">
                                    <button class="delete-image-btn" data-file-name="${file.name}" class="btn muted" style="position: absolute; top: 15px; right: 70px; background: rgba(14, 8, 8, 1); color: white; border: none; border-radius: 50%; width: 30px; height: 30px; cursor: pointer;">
                                        <svg class="icon  icon-md" style="stroke:#fff" aria-hidden="true">
                                            <use class="" href="#icon-delete"></use>
                                        </svg>
                                    </button>                                
                                </div>
                            `);
                        }
                    });
                    
                    const loopMode = files.length > 1; // Habilitar el modo de bucle solo si hay más de una diapositiva
                    this.mySwiper = new Swiper('.swiper-container', {
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

    checkAndAddViewImagesLink(frm) {
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
            callback: (response) => {
                const files = response.message || [];
                const hasImages = files.some(file => /\.(jpg|jpeg|png|gif|jfif|webp)$/i.test(file.file_name));
                
                // Elimina enlaces previos
                const linkId = `view-images-link-${frm.doc.doctype.toLowerCase().replace(/\s+/g, '-')}`;            
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
                        $(document).off('click', `#${linkId}`).on('click', `#${linkId}`, (event) => {
                            event.preventDefault();
                            $('#slider-modal').show();
                        });
                    }
                }
            }
        });
    }

    AttachmentObserverManager = {
        observer: null,
        sidebarSelector: '.form-sidebar .form-attachments',

        /**
         * Inicia el observador en el contenedor de adjuntos
         * @param {Object} frm - El formulario Frappe
         */
        __start(frm) {
            // Detén cualquier observador previo
            this.stop();

            // Crear un nuevo observador
            this.observer = new MutationObserver(this.getOptimizedCallback(frm));

            // Seleccionar el contenedor de adjuntos
            const sidebar = document.querySelector(this.sidebarSelector);
            if (sidebar) {
                this.observer.observe(sidebar, { childList: true, subtree: true });
                // console.log(`AttachmentObserverManager: Observador iniciado para ${frm.doctype} (${frm.docname}).`);
            } else {
                console.warn(`AttachmentObserverManager: Contenedor de adjuntos no encontrado para ${frm.doctype} (${frm.docname}).`);
            }
        },
        start(frm) {
            this.stop(); // Detiene cualquier observador previo
        
            const sidebar = document.querySelector(this.sidebarSelector);
        
            if (sidebar) {
                // Observa si el nodo está cargado dinámicamente
                if (!sidebar.hasChildNodes()) {
                    // console.warn(`AttachmentObserverManager: Contenedor vacío. Reintentando en 100ms...`);
                    setTimeout(() => this.__start(frm), 100);
                    return;
                }
        
                this.observer = new MutationObserver(this.getOptimizedCallback(frm));
                this.observer.observe(sidebar, { childList: true, subtree: true });
                // console.log(`AttachmentObserverManager: Observador iniciado para ${frm.doctype} (${frm.docname}).`);
            } else {
                console.warn(`AttachmentObserverManager: Contenedor de adjuntos no encontrado.`);
            }
        },
        
        /**
         * Detiene y limpia el observador activo
         */
        stop() {
            if (this.observer) {
                this.observer.disconnect();
                this.observer = null;
                // console.log("AttachmentObserverManager: Observador detenido.");
            }
        },

        /**
         * Retorna un callback optimizado para manejar mutaciones
         * @param {Object} frm - El formulario Frappe
         * @returns {Function} - Callback optimizado
         */
        getOptimizedCallback(frm) {
            const debounce = (func, delay) => {
                let timeout;
                return function (...args) {
                    clearTimeout(timeout);
                    timeout = setTimeout(() => func.apply(this, args), delay);
                };
            };

            return debounce((mutationsList) => {
                let shouldCheck = false;
                for (let mutation of mutationsList) {
                    if (
                        mutation.type === 'childList' &&
                        (mutation.addedNodes.length > 0 || mutation.removedNodes.length > 0)
                    ) {
                        // Detecta cambios relevantes en nodos adjuntos
                        shouldCheck = Array.from(mutation.addedNodes).some(node =>
                            node.nodeType === 1 && node.classList.contains('attachment-row')
                        ) || Array.from(mutation.removedNodes).some(node =>
                            node.nodeType === 1 && node.classList.contains('attachment-row')
                        );
                    }
                }
                if (shouldCheck) {
                    // console.log(`AttachmentObserverManager: Cambios detectados en ${frm.doctype} (${frm.docname}).`);
                    adv_suite.slider.checkAndAddViewImagesLink(frm);
                    adv_suite.slider.loadImagesIntoSlider(frm);
                }
            }, 300); // 300ms de debounce
        }
    }
}

// Exportar una instancia de la clase Slider
export const slider = new adv_suite.utils.Slider();