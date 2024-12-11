(function () {
    // Esperar a que la interfaz esté lista
    const interval = setInterval(() => {
        // Verificar si cur_frm y cur_frm.meta están disponibles
        if (cur_frm && cur_frm.meta) {
            // Cambiar la propiedad `make_attachments_public`
            cur_frm.meta.make_attachments_public = true; // los establece como públicos por defecto
            console.log("Attachments set to public for:", cur_frm.docname);
            
            // Detener el intervalo
            clearInterval(interval);
        }
    }, 100); // Revisar cada 100ms
})();
