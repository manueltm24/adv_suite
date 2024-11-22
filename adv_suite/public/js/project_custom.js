frappe.ui.form.on('Project', {
    refresh: function (frm) {
        AttachmentObserverManager.start(frm);
        initializeImageSlider(frm);
         frm.attachments.refresh = function () {
            frm.refresh();
        };
    },
    onload: function (frm) {
        AttachmentObserverManager.start(frm);
    },
    before_unload: function () {
        AttachmentObserverManager.stop();
    }
});

