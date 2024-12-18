class CustomFrappeForm  extends frappe.ui.form.Form {
    setup() {
        super.setup();
    }
    setup_meta() {
        super.setup_meta();
    }
    refresh(docname) {
        super.refresh(docname);
            // Verificar si cur_frm y cur_frm.meta están disponibles    
            if (cur_frm && cur_frm.meta) {
                // Cambiar la propiedad `make_attachments_public`
                cur_frm.meta.make_attachments_public = true; // los establece como públicos por defecto
                // console.log("Attachments set to public for:", cur_frm.docname);
        }
        this.initializeSliderAndObserver();

    }
    before_unload(frm) {
        super.before_unload(frm);
        AttachmentObserverManager.stop();
    }
    onload_post_render(frm) {
        super.onload_post_render(frm);
        this.initializeSliderAndObserver();
    }

    initializeSliderAndObserver() {
        console.log("Initializing slider and observer for", this.doc.doctype);
        AttachmentObserverManager.start(this);
        initializeImageSlider(this);
        if (this.attachments) {
            this.attachments.refresh = () => {
                this.refresh();
            };
        }
    }

    setup_file_drop() {
        var me = this;
        this.$wrapper.on("dragenter dragover", false).on("drop", function (e) {
            var dataTransfer = e.originalEvent.dataTransfer;
            if (!(dataTransfer && dataTransfer.files && dataTransfer.files.length > 0)) {
                return;
            }

            e.stopPropagation();
            e.preventDefault();

            if (me.doc.__islocal) {
                frappe.msgprint(__("Please save before attaching."));
                throw "attach error";
            }

            new frappe.ui.FileUploader({
                doctype: me.doctype,
                docname: me.docname,
                frm: me,
                files: dataTransfer.files,
                folder: "Home/Attachments",
                make_attachments_public: true, // los establece como públicos por defecto
                on_success(file_doc) {
                    me.attachments.attachment_uploaded(file_doc);
                },
            });
        });
    }
}

// Asignar la nueva clase a frappe.ui.form.Form
frappe.ui.form.Form = CustomFrappeForm;

// Aplicar la nueva clase al formulario actual
if (cur_frm)
    extend_cscript(cur_frm.cscript, new frappe.ui.form.Form({ frm: cur_frm }));



frappe.ui.form.on('*', {
    refresh: function (frm) {
        AttachmentObserverManager.start(frm);
        initializeImageSlider(frm);
        if (frm.attachments) {
            frm.attachments.refresh = function () {
                frm.refresh();
            };
        }
    },
    onload: function (frm) {
        AttachmentObserverManager.start(frm);
    },
    before_unload: function () {
        AttachmentObserverManager.stop();
    }
});