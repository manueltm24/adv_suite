(() => {
  var __defProp = Object.defineProperty;
  var __defNormalProp = (obj, key, value) => key in obj ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
  var __publicField = (obj, key, value) => {
    __defNormalProp(obj, typeof key !== "symbol" ? key + "" : key, value);
    return value;
  };

  // ../adv_suite/adv_suite/public/js/desk/adv_suite.js
  frappe.provide("adv_suite.utils");
  adv_suite.utils.Slider = class Slider {
    constructor() {
      __publicField(this, "AttachmentObserverManager", {
        observer: null,
        sidebarSelector: ".form-sidebar .form-attachments",
        __start(frm) {
          this.stop();
          this.observer = new MutationObserver(this.getOptimizedCallback(frm));
          const sidebar = document.querySelector(this.sidebarSelector);
          if (sidebar) {
            this.observer.observe(sidebar, { childList: true, subtree: true });
          } else {
            console.warn(`AttachmentObserverManager: Contenedor de adjuntos no encontrado para ${frm.doctype} (${frm.docname}).`);
          }
        },
        start(frm) {
          this.stop();
          const sidebar = document.querySelector(this.sidebarSelector);
          if (sidebar) {
            if (!sidebar.hasChildNodes()) {
              setTimeout(() => this.__start(frm), 100);
              return;
            }
            this.observer = new MutationObserver(this.getOptimizedCallback(frm));
            this.observer.observe(sidebar, { childList: true, subtree: true });
          } else {
            console.warn(`AttachmentObserverManager: Contenedor de adjuntos no encontrado.`);
          }
        },
        stop() {
          if (this.observer) {
            this.observer.disconnect();
            this.observer = null;
          }
        },
        getOptimizedCallback(frm) {
          const debounce = (func, delay) => {
            let timeout;
            return function(...args) {
              clearTimeout(timeout);
              timeout = setTimeout(() => func.apply(this, args), delay);
            };
          };
          return debounce((mutationsList) => {
            let shouldCheck = false;
            for (let mutation of mutationsList) {
              if (mutation.type === "childList" && (mutation.addedNodes.length > 0 || mutation.removedNodes.length > 0)) {
                shouldCheck = Array.from(mutation.addedNodes).some(
                  (node) => node.nodeType === 1 && node.classList.contains("attachment-row")
                ) || Array.from(mutation.removedNodes).some(
                  (node) => node.nodeType === 1 && node.classList.contains("attachment-row")
                );
              }
            }
            if (shouldCheck) {
              adv_suite.slider.checkAndAddViewImagesLink(frm);
              adv_suite.slider.loadImagesIntoSlider(frm);
            }
          }, 300);
        }
      });
      this.attachmentsDeleted = false;
      this.mySwiper = null;
    }
    initializeImageSlider(frm) {
      this.initializeSliderOnPageChange(frm);
      this.checkAndAddViewImagesLink(frm);
      this.AttachmentObserverManager.start(frm);
    }
    initializeSliderOnPageChange(frm) {
      if (this.mySwiper) {
        this.mySwiper.destroy(true, true);
      }
      this.initializeSwiper(frm);
    }
    initializeSwiper(frm) {
      if (!$('link[href="/assets/adv_suite/swiper/swiper-bundle.min.css"]').length) {
        $("head").append('<link rel="stylesheet" href="/assets/adv_suite/swiper/swiper-bundle.min.css">');
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
      if ($("#slider-modal").length) {
        $("#slider-modal").remove();
      }
      $("body").append(`
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
      $("head").append(`
            <style>
                .swiper-pagination-bullet {
                    background: #fafafa;
                }
                .swiper-pagination-bullet-active {
                    background: var(--dark-green-avatar-bg);
                }
            </style>
        `);
      $("#close-slider").on("click", () => {
        $("#slider-modal").hide();
        if (this.attachmentsDeleted) {
          cur_frm.reload_doc();
          this.attachmentsDeleted = false;
        }
      });
      this.loadImagesIntoSlider(frm);
    }
    loadImagesIntoSlider(frm) {
      frappe.call({
        method: "frappe.client.get_list",
        args: {
          doctype: "File",
          filters: {
            attached_to_doctype: frm.doc.doctype,
            attached_to_name: frm.doc.name
          },
          fields: ["file_name", "file_url", "creation", "name"],
          order_by: "creation asc"
        },
        callback: (response) => {
          const files = response.message || [];
          const swiperWrapper = $(".swiper-wrapper");
          if (files.length > 0) {
            swiperWrapper.empty();
            files.forEach((file) => {
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
            const loopMode = files.length > 1;
            this.mySwiper = new Swiper(".swiper-container", {
              loop: loopMode,
              pagination: {
                el: ".swiper-pagination",
                clickable: true
              },
              navigation: {
                nextEl: ".swiper-button-next",
                prevEl: ".swiper-button-prev"
              }
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
        method: "frappe.client.get_list",
        args: {
          doctype: "File",
          filters: {
            attached_to_doctype: frm.doc.doctype,
            attached_to_name: frm.doc.name
          },
          fields: ["file_name", "file_url"]
        },
        callback: (response) => {
          const files = response.message || [];
          const hasImages = files.some((file) => /\.(jpg|jpeg|png|gif|jfif|webp)$/i.test(file.file_name));
          const linkId = `view-images-link-${frm.doc.doctype.toLowerCase().replace(/\s+/g, "-")}`;
          $(`#${linkId}`).remove();
          $(".sidebar-menu-item").remove();
          if (hasImages) {
            const attachmentsSection = $(".form-sidebar .form-attachments .attachments-actions");
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
              $(document).off("click", `#${linkId}`).on("click", `#${linkId}`, (event) => {
                event.preventDefault();
                $("#slider-modal").show();
              });
            }
          }
        }
      });
    }
  };
  var slider = new adv_suite.utils.Slider();

  // ../adv_suite/adv_suite/public/js/desk/doctype_custom.js
  var CustomFrappeForm = class extends frappe.ui.form.Form {
    setup() {
      super.setup();
    }
    setup_meta() {
      super.setup_meta();
    }
    refresh(docname) {
      super.refresh(docname);
      if (cur_frm && cur_frm.meta) {
        cur_frm.meta.make_attachments_public = true;
      }
      this.initializeSliderAndObserver();
    }
    before_unload(frm) {
      super.before_unload(frm);
      slider.AttachmentObserverManager.stop();
    }
    onload_post_render(frm) {
      super.onload_post_render(frm);
      this.initializeSliderAndObserver();
    }
    initializeSliderAndObserver() {
      console.log("Initializing slider and observer for", this.doc.doctype);
      slider.AttachmentObserverManager.start(this);
      slider.initializeImageSlider(this);
      if (this.attachments) {
        this.attachments.refresh = () => {
          this.refresh();
        };
      }
    }
    setup_file_drop() {
      var me = this;
      this.$wrapper.on("dragenter dragover", false).on("drop", function(e) {
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
          make_attachments_public: true,
          on_success(file_doc) {
            me.attachments.attachment_uploaded(file_doc);
          }
        });
      });
    }
  };
  frappe.ui.form.Form = CustomFrappeForm;
  if (cur_frm)
    extend_cscript(cur_frm.cscript, new frappe.ui.form.Form({ frm: cur_frm }));
  $(document).on("click", ".delete-image-btn", function() {
    const fileName = $(this).data("file-name");
    frappe.confirm(__("Are you sure you want to delete this image?"), function() {
      frappe.call({
        method: "frappe.client.delete",
        args: {
          doctype: "File",
          name: fileName
        },
        callback: function(response) {
          if (!response.exc) {
            slider.attachmentsDeleted = true;
            if (slider.mySwiper.slides.length > 1) {
              slider.mySwiper.removeSlide(slider.mySwiper.activeIndex);
              slider.checkAndAddViewImagesLink(cur_frm);
            } else {
              slider.mySwiper.destroy(true, true);
              $("#slider-modal").hide();
              cur_frm.reload_doc();
              slider.attachmentsDeleted = false;
            }
            frappe.show_alert({ message: __("Image deleted successfully"), indicator: "green" });
          } else {
            frappe.show_alert({ message: __("Failed to delete image"), indicator: "red" });
          }
        }
      });
    });
  });

  // ../adv_suite/adv_suite/public/js/desk/assing_to_custom.js
  var CustomAssingTo = class {
    constructor(opts) {
      $.extend(this, opts);
      this.btn = this.parent.find(".add-assignment-btn").on("click", () => this.add());
      this.btn_wrapper = this.btn.parent();
      this.refresh();
    }
    refresh() {
      if (this.frm.doc.__islocal) {
        this.parent.toggle(false);
        return;
      }
      this.parent.toggle(true);
      this.render(this.frm.get_docinfo().assignments);
    }
    render(assignments) {
      this.frm.get_docinfo().assignments = assignments;
      let assignments_wrapper = this.parent.find(".assignments");
      assignments_wrapper.empty();
      let assigned_users = assignments.map((d) => d.owner);
      if (!assigned_users.length) {
        assignments_wrapper.hide();
        return;
      }
      let avatar_group = frappe.avatar_group(assigned_users, 5, {
        align: "left",
        overlap: true
      });
      assignments_wrapper.show();
      assignments_wrapper.append(avatar_group);
      avatar_group.click(() => {
        new frappe.ui.form.AssignmentDialog({
          assignments: assigned_users,
          frm: this.frm
        });
      });
    }
    add() {
      var me = this;
      if (this.frm.is_new() || this.frm.doc.__unsaved) {
        frappe.throw(__("Please save the document before assignment"));
        return;
      }
      if (!me.assign_to) {
        me.assign_to = new frappe.ui.form.AssignToDialog({
          method: "frappe.desk.form.assign_to.add",
          doctype: me.frm.doctype,
          docname: me.frm.docname,
          frm: me.frm,
          callback: function(r) {
            me.render(r.message);
          }
        });
      }
      me.assign_to.dialog.clear();
      me.assign_to.dialog.show();
    }
    remove(owner) {
      if (this.frm.is_new() || this.frm.doc.__unsaved) {
        frappe.throw(__("Please save the document before removing assignment"));
        return;
      }
      return frappe.xcall("frappe.desk.form.assign_to.remove", {
        doctype: this.frm.doctype,
        name: this.frm.docname,
        assign_to: owner
      }).then((assignments) => {
        this.render(assignments);
      });
    }
  };
  var CustomAssignToDialog = class {
    constructor(opts) {
      $.extend(this, opts);
      this.make();
      this.set_description_from_doc();
    }
    make() {
      let me = this;
      me.dialog = new frappe.ui.Dialog({
        title: __("Add to ToDo"),
        fields: me.get_fields(),
        primary_action_label: __("Add"),
        primary_action: function() {
          let args = me.dialog.get_values();
          if (args && args.assign_to) {
            me.dialog.set_message("Assigning...");
            frappe.call({
              method: me.method,
              args: $.extend(args, {
                doctype: me.doctype,
                name: me.docname,
                assign_to: args.assign_to,
                bulk_assign: me.bulk_assign || false,
                re_assign: me.re_assign || false
              }),
              btn: me.dialog.get_primary_btn(),
              callback: function(r) {
                if (!r.exc) {
                  if (me.callback) {
                    me.callback(r);
                  }
                  alert(__("Added"));
                  me.dialog && me.dialog.hide();
                } else {
                  me.dialog.clear_message();
                }
              }
            });
          }
        }
      });
    }
    assign_to_me() {
      if (this.frm.is_new() || this.frm.doc.__unsaved) {
        frappe.throw(__("Please save the document before assignment"));
        return;
      }
      let me = this;
      let assign_to = [];
      if (me.dialog.get_value("assign_to_me")) {
        assign_to.push(frappe.session.user);
      }
      me.dialog.set_value("assign_to", assign_to);
    }
    user_group_list() {
      let me = this;
      let user_group = me.dialog.get_value("assign_to_user_group");
      me.dialog.set_value("assign_to_me", 0);
      if (user_group) {
        let user_group_members = [];
        frappe.db.get_list("User Group Member", {
          parent_doctype: "User Group",
          filters: { parent: user_group },
          fields: ["user"]
        }).then((response) => {
          user_group_members = response.map((group_member) => group_member.user);
          me.dialog.set_value("assign_to", user_group_members);
        });
      }
    }
    set_description_from_doc() {
      let me = this;
      if (me.frm && me.frm.meta.title_field) {
        me.dialog.set_value("description", me.frm.doc[me.frm.meta.title_field]);
      }
    }
    get_fields() {
      let me = this;
      return [
        {
          label: __("Assign to me"),
          fieldtype: "Check",
          fieldname: "assign_to_me",
          default: 0,
          onchange: () => me.assign_to_me()
        },
        {
          label: __("Assign To User Group"),
          fieldtype: "Link",
          fieldname: "assign_to_user_group",
          options: "User Group",
          onchange: () => me.user_group_list()
        },
        {
          fieldtype: "MultiSelectPills",
          fieldname: "assign_to",
          label: __("Assign To"),
          reqd: true,
          get_data: function(txt) {
            return frappe.db.get_link_options("User", txt, {
              user_type: "System User",
              enabled: 1
            });
          }
        },
        {
          fieldtype: "Section Break"
        },
        {
          label: __("Complete By"),
          fieldtype: "Date",
          fieldname: "date"
        },
        {
          fieldtype: "Column Break"
        },
        {
          label: __("Priority"),
          fieldtype: "Select",
          fieldname: "priority",
          options: [
            {
              value: "Low",
              label: __("Low")
            },
            {
              value: "Medium",
              label: __("Medium")
            },
            {
              value: "High",
              label: __("High")
            }
          ],
          default: ["Low", "Medium", "High"].includes(
            me.frm && me.frm.doc.priority ? me.frm.doc.priority : "Medium"
          )
        },
        {
          fieldtype: "Section Break"
        },
        {
          label: __("Comment"),
          fieldtype: "Small Text",
          fieldname: "description"
        }
      ];
    }
  };
  var CustomAssignmentDialog = class {
    constructor(opts) {
      this.frm = opts.frm;
      this.assignments = opts.assignments;
      this.make();
    }
    make() {
      this.dialog = new frappe.ui.Dialog({
        title: __("Assignments"),
        size: "small",
        no_focus: true,
        fields: [
          {
            label: __("Assign a user"),
            fieldname: "user",
            fieldtype: "Link",
            options: "User",
            change: () => {
              let value = this.dialog.get_value("user");
              if (value && !this.assigning) {
                this.assigning = true;
                this.dialog.set_df_property("user", "read_only", 1);
                this.dialog.set_df_property("user", "description", __("Assigning..."));
                this.add_assignment(value).then(() => {
                  this.dialog.set_value("user", null);
                }).finally(() => {
                  this.dialog.set_df_property("user", "description", null);
                  this.dialog.set_df_property("user", "read_only", 0);
                  this.assigning = false;
                });
              }
            }
          },
          {
            fieldtype: "HTML",
            fieldname: "assignment_list"
          }
        ]
      });
      this.assignment_list = $(this.dialog.get_field("assignment_list").wrapper);
      this.assignment_list.removeClass("frappe-control");
      this.assignments.forEach((assignment) => {
        this.update_assignment(assignment);
      });
      this.dialog.show();
    }
    render(assignments) {
      this.frm && this.frm.assign_to.render(assignments);
    }
    add_assignment(assignment) {
      if (this.frm.is_new() || this.frm.doc.__unsaved) {
        frappe.throw(__("Please save the document before assignment"));
        return;
      }
      return frappe.xcall("frappe.desk.form.assign_to.add", {
        doctype: this.frm.doctype,
        name: this.frm.docname,
        assign_to: [assignment]
      }).then((assignments) => {
        this.update_assignment(assignment);
        this.render(assignments);
      });
    }
    remove_assignment(assignment) {
      if (this.frm.is_new() || this.frm.doc.__unsaved) {
        frappe.throw(__("Please save the document before assignment"));
        return;
      }
      return frappe.xcall("frappe.desk.form.assign_to.remove", {
        doctype: this.frm.doctype,
        name: this.frm.docname,
        assign_to: assignment
      });
    }
    close_assignment(assignment) {
      return frappe.xcall("frappe.desk.form.assign_to.close", {
        doctype: this.frm.doctype,
        name: this.frm.docname,
        assign_to: assignment
      });
    }
    update_assignment(assignment) {
      if (this.frm.is_new() || this.frm.doc.__unsaved) {
        frappe.throw(__("Please save the document before assignment"));
        return;
      }
      const in_the_list = this.assignment_list.find(`[data-user="${assignment}"]`).length;
      if (!in_the_list) {
        this.assignment_list.append(this.get_assignment_row(assignment));
      }
    }
    get_assignment_row(assignment) {
      const row = $(`
			<div class="dialog-assignment-row" data-user="${assignment}">
				<div class="assignee">
					${frappe.avatar(assignment)}
					${frappe.user.full_name(assignment)}
				</div>
				<div class="btn-group btn-group-sm" role="group" aria-label="Actions">
				</div>
			</div>
		`);
      const btn_group = row.find(".btn-group");
      if (assignment === frappe.session.user) {
        btn_group.append(`
				<button type="button" class="btn btn-default complete-btn" title="${__("Done")}">
					${frappe.utils.icon("tick", "xs")}
				</button>
			`);
        btn_group.find(".complete-btn").click(() => {
          this.close_assignment(assignment).then((assignments) => {
            row.remove();
            this.render(assignments);
          });
        });
      }
      if (assignment === frappe.session.user || this.frm.perm[0].write) {
        btn_group.append(`
				<button type="button" class="btn btn-default remove-btn" title="${__("Cancel")}">
				${frappe.utils.icon("close")}
				</button>
			`);
        btn_group.find(".remove-btn").click(() => {
          this.remove_assignment(assignment).then((assignments) => {
            row.remove();
            this.render(assignments);
          });
        });
      }
      return row;
    }
  };
  frappe.ui.form.AssignTo = CustomAssingTo;
  frappe.ui.form.AssignToDialog = CustomAssignToDialog;
  frappe.ui.form.AssignmentDialog = CustomAssignmentDialog;
  if (cur_frm) {
    extend_cscript(cur_frm.cscript, new frappe.ui.form.AssignTo({ frm: cur_frm }));
    extend_cscript(cur_frm.cscript, new frappe.ui.form.AssignToDialog({ frm: cur_frm }));
    extend_cscript(cur_frm.cscript, new frappe.ui.form.AssignmentDialog({ frm: cur_frm }));
  }
})();
//# sourceMappingURL=adv_suite.bundle.YO3DLDI4.js.map
