import { TabulatorFull as Tabulator } from "tabulator-tables";
import { CQBTableEditRow, CQBTableRenderedComment, CQBTableRenderedRowButtons, CQBTableToolbarRendered } from "./events";
import { is_buying_doctype } from "./utils";
import { ButtonRibbon } from "./ButtonRibbon";

const DONOTUSE_DEFAULT_TABLE_COLUMNS = [
	"item_code",
	"item_name",
	"qty",
	"description",
	"uom",
	"last_purchase_rate",
	"gross_profit_percentage",
	"rate",
	"amount",
	"row_print_style",
];

function onControlBlur(control, callback) {
	const input = $(control.$input || control.input || control.input_area).get(0);
	if (["Date", "Datetime", "Duration"].includes(control.df.fieldtype)) {
		input.addEventListener("change", callback);
		input.addEventListener("focusout", (e) => {
			// Ignore focusout if the new focused element is inside a datepicker
			// if (e.relatedTarget?.closest(".datepickers-container")) return;
			// non-focusable elements won't ever be the relatedTarget
			if (control.datepicker?.inFocus) {
				return; // the change event will handle success/cancel.
			}
			callback();
		});
	} else {
		input.addEventListener("focusout", (e) => {
			// Ignore focusout if the new focused element is a child of the editor
			if (control.parent.contains(e.relatedTarget)) return;
			callback();
		});
	}
}

frappe.ui.form.ControlTextEditorConstruction = class ControlTextEditorConstruction extends frappe.ui.form.ControlTextEditor {
	is_quill_dirty(source) {
		return false;
	}
	is_quill_dirty_original(source) {
		return super.is_quill_dirty(source);
	}
	bind_events() {
		super.bind_events();
		this.quill.on(
			"text-change",
			frappe.utils.debounce((delta, oldDelta, source) => {
				if (source === "api") return;
				const input_value = this.get_input_value();
				this.df?.onchange?.call(this, input_value);
			}, 0)
		);
	}
}

function makeTextEditorDocField(df, row) {
	return {
		...df,
		onchange() {
			row.normalizeHeight();
			row.getTable().redraw();
		},
		fieldtype: "Text Editor Construction",
		max_height: "unset",
		theme: "bubble",
		get_toolbar_options: () => {
			return [
				// [{ header: [1, 2, 3, false] }],
				// [{ size: [10, 12, 14, 16, 20, 24, 32] }],
				["bold", "italic", "underline", "strike", "clean"],
				[{ color: [] }, { background: [] }],
				["blockquote", "code-block"],
				["link", "image"],
				[{ list: "ordered" }, { list: "bullet" }, { list: "check" }],
				[{ align: [] }],
				[{ direction: "rtl" }],
			];
		},
	};
}

function frappeTabulatorCellEditor(cell, onRendered, success, cancel, editorParams) {
	// cell - the cell component for the editable cell
	// onRendered - function to call when the editor has been rendered
	// success - function to call to pass thesuccessfully updated value to Tabulator
	// cancel - function to call to abort the edit and return to a normal cell
	// editorParams - params object passed into the editorParams column definition property

	const el = document.createElement("div");
	const cellElement = cell.getElement();
	cellElement.style.overflow = "visible";
	const initialValue = cell.getValue();
	let updatedValue = initialValue;

	let df = {
		...editorParams.df,
		input_class: "input-xs",
		onchange: () => {
			const value = control.get_value();
			if (value !== updatedValue) {
				success(value);
			}
		},
	};

	if (df.fieldtype === "Text Editor") {
		df = makeTextEditorDocField(df, cell.getRow());
	}

	const control = frappe.ui.form.make_control({
		df: df,
		parent: el,
		render_input: true,
		only_input: true,
		layout: { grid: {} },
		value: initialValue,
	});

	if (df.fieldtype === "Text Editor") {
		setTextEditorStyle(control);
	}

	// Call cancel() on blur
	onControlBlur(control, () => {
		const value = control.get_value();
		if (value !== updatedValue) {
			success(value);
		} else {
			cancel();
		}
	});

	onRendered(() => {
		control.set_focus();
	});

	return el;
}

function withTabulatorLinkEditor_mut(col, df, ref_dt) {
	col.editor = "list";
	col.editorParams = {
		// https://tabulator.info/docs/5.5/edit#editor-list
		autocomplete: true,
		placeholderLoading: __("Loading..."),
		placeholderEmpty: __("No Result"),
		valuesLookupField: "label", // search returns { value, label?, description? }
		itemFormatter(label, value, item, element) {
			let html = `<strong>${label}</strong>`;
			if (item?.description) {
				html += `<div style="line-height:1.1;font-size:var(--text-xs);">${item.description}</div>`;
			}
			return html;
		},
		async valuesLookup(cell, filterTerm) {
			const args = {
				txt: filterTerm,
				doctype: df.options,
				ignore_user_permissions: false,
				reference_doctype: ref_dt,
			};
			const res = await frappe.call({
				type: "POST",
				method: "frappe.desk.search.search_link",
				no_spinner: true,
				args: args,
			});
			return res.message.map((o) => {
				o.label ??= o.value;
				return o;
			})
		},
		filterRemote: true,
		listOnEmpty: true,
		allowEmpty: true,
		clearable: true,
	};
	return col;
}

function setTextEditorStyle(control) {
	control.inside_change_event = true; // force ignore onchange event
}

function frappeTabulatorCellFormatter(cell, formatterParams, onRendered) {
	const value = cell.getValue();
	const doc = cell.getRow().getData();
	const html = frappe.format(value, formatterParams.df, null, doc);
	const parsed = new DOMParser().parseFromString(html, "text/html");
	parsed.querySelectorAll("a").forEach((el) => {
		el.removeAttribute("href");
		el.removeAttribute("target");
		el.type = "span";
	});
	const cellElement = cell.getElement();
	cellElement.style.overflow = "";
	return parsed.body.innerHTML;
}

/** @this {ItemBuilderForm} */
function formatEditButton(cell, formatterParams, onRendered) {
	const el = document.createElement("div");

	onRendered(() => {
		const ribbon = new ButtonRibbon();
		el.replaceWith(ribbon.root);

		const editButton = document.createElement("button");
		editButton.type = "button";
		editButton.classList.add("btn-reset");
		editButton.innerHTML = frappe.utils.icon("edit", "sm");
		editButton.ariaLabel = __("Edit");
		editButton.title = __("Edit");
		editButton.addEventListener("click", () => {
			document.dispatchEvent(new CQBTableEditRow(this.builder, cell));
		});
		ribbon.setTrigger(editButton);

		if (this.builder.features.add_item) {
			const insertButton = document.createElement("button");
			insertButton.type = "button";
			insertButton.classList.add("dropdown-item", "text-left");
			insertButton.innerHTML = frappe.utils.icon("add", "sm");
			insertButton.append(__("Insert Below"));
			insertButton.addEventListener("click", () => {
				const insertAfterIdx = cell.getRow().getData().idx;
				this.builder.form_wrapper.get_grid().add_new_row(insertAfterIdx + 1, null, false, false);
				// const insertAfterName = cell.getRow().getData().name;
				// this.builder.form_wrapper.get_grid().get_row(insertAfterName).insert(false, true);
			});
			ribbon.appendButtons(insertButton);
		}

		document.dispatchEvent(new CQBTableRenderedRowButtons(this.builder, ribbon, cell));
	});

	return el;
}


class ItemBuilderForm {
	constructor({ frm, detach = false, builder = null } = {}) {
		this.frm = frm;
		/** @type {boolean} */
		this.detach = detach;
		/** @type {ItemBuilderTable} */
		this.builder = builder;
	}

	async setup() {
		this.settings ??= await frappe.db.get_doc("Construction App Settings");

		if (this.detach) {
			const field = this.frm.get_field("items");
			/** @type {HTMLElement} */
			const el = field.$wrapper.get(0);
			el.style.display = "none";
		}
	}

	/** @type {string[]} @readonly */ get columns() {
		if (this.settings?.quotation_builder_columns?.[0]?.fieldname) {
			return this.settings.quotation_builder_columns.map(x => x.fieldname);
		}
		return DONOTUSE_DEFAULT_TABLE_COLUMNS;
	}

	assert(condition, message) {
		if (!condition) {
			throw message || "Assertion failed";
		}
	}

	get_rows() {
		return this.frm.doc.items;
		// return JSON.parse(JSON.stringify(this.frm.doc.items));
	}

	get_columns() {
		const meta = frappe.get_meta(this.row_doctype);
		const order = this.columns.slice();

		// Append required fields to the end of the list.
		order.push(...meta.fields.filter(df => (df.reqd && !df.read_only && !df.default)).map(df => df.fieldname));

		// Grab the DocFields that are in the `order` list.
		const fields = meta.fields.filter(df => order.includes(df.fieldname));

		const sorter = (a, b) => order.indexOf(a.fieldname) - order.indexOf(b.fieldname);
		fields.sort(sorter); // sort in place

		const me = this;
		const columns = [
			{
				rowHandle: true,
				headerSort: false,
				frozen: true,
				cssClass: "item-builder-flex-center",
				formatter: "handle",
				minWidth: 16, // width and maxWidth feel useless
				get visible() { return me.frm.doc.docstatus == 0 },
				resizable: false,
			},
			{
				rowHandle: true,
				cssClass: "item-builder-flex-center",
				formatter: "rowSelection",
				titleFormatter: "rowSelection",
				hozAlign: "center",
				headerHozAlign: "center",
				headerSort: false,
				cellClick(e, cell) { cell.getRow().toggleSelect() },
				minWidth: 16, // width and maxWidth feel useless
				resizable: false,
			},
			{
				rowHandle: true,
				title: __("Sr"),
				cssClass: "item-builder-flex-center",
				formatter: "rownum",
				headerSort: false,
				minWidth: 16, // width and maxWidth feel useless
				resizable: false,
			},
			{
				rowHandle: true,
				title: "",
				field: "edit_btn",
				editor: false,
				headerSort: false,
				cssClass: "item-builder-flex-center ButtonRibbon__container",
				formatter: formatEditButton.bind(this),
				hozAlign: "center",
				headerHozAlign: "center",
				minWidth: 16, // width and maxWidth feel useless
				resizable: false,
			},
			{
				title: __("Row Type"),
				field: "row_type",
				editor: false,
				visible: false,
				headerSort: false,
			},
			{
				title: __("Row Name"),
				field: "name",
				editor: false,
				visible: false,
				headerSort: false,
			},
		];

		// Then, append the sorted fields to the columns list.
		for (const df of fields) {
			const col = {
				title: __(df.label, null, df.parent) || "",
				field: df.fieldname,
				editor: true,
				editable: () => {
					const displayStatus = frappe.perm.get_field_display_status(df, this.frm.doc);
					return displayStatus === "Write";
				},
				headerSort: false,
			}

			if (df.fieldtype === "Select") {
				col.minWidth = 120;
			}

			if (df.fieldtype === "Link") {
				const ref_dt = this.parent_doctype;
				withTabulatorLinkEditor_mut(col, df, ref_dt);
			}
			else if (df.fieldname == "description") {
				col.variableHeight = true;
				col.editor = frappeTabulatorCellEditor;
				col.editorParams = {
					df: { ...df, theme: "bubble", max_height: "unset", },
				};
				col.formatter = frappeTabulatorCellFormatter;
				col.formatterParams = { df };
				col.widthGrow = 0;
				col.widthShrink = 0;
				col.width = 300;
			} else {
				if (!df.read_only) {
					col.editor = frappeTabulatorCellEditor;
					col.editorParams = { df };
				} else {
					col.editor = false;
				}
				col.formatter = frappeTabulatorCellFormatter;
				col.formatterParams = { df };
			}

			columns.push(col);
		}

		return columns;
	}

	get_grid() {
		return this.frm.get_field("items").grid;
	}

	append_row(values, atIndex = null) {
		// idx, callback, show, copy_doc, go_to_last_page = false, go_to_first_page = false
		this.get_grid().add_new_row(atIndex, null, null, values, false, false);

		// https://frappeframework.com/docs/user/en/api/form#frm-add-child
		// this.frm.add_child("items", values);
		// this.frm.refresh_fields("items");
	}

	update_row_value(doc, key, value) {
		this.assert(doc.name, "Row doc.name is required")
		// Because Tabulator will update the value directly in the row object, we need to delete the key first.
		// This is assumed to be done by the calling function itself.
		// doc[key] = previousValue;
		frappe.model.set_value(doc.doctype, doc.name, key, value);

		// this.get_grid().get_row(String(doc.name)).refresh_field(key);
		// this.frm.refresh_fields("items");
		// this.frm.dirty();
	}

	remove_rows(names) {
		const grid = this.get_grid();
		const data = grid.get_data();

		for (const name of names) {
			const oldIndex = data.findIndex(row => row.name == name);
			data.splice(oldIndex, 1);
			// grid.grid_rows_by_docname[name]?.remove(); // NOTE: Don't do this.
		}

		// renum idx
		for (let i = 0; i < data.length; i++) {
			data[i].idx = i + 1;
		}

		grid.refresh();
		this.frm.dirty();
		this.frm.script_manager.trigger("items_delete", this.row_doctype);
	}

	move_rows(/** @type {string[]} */ names, /** @type {number} */ targetIndex) {
		if (!Number.isInteger(targetIndex)) {
			throw new Error("Item Builder move_rows: `targetIndex` must be an integer");
		}
		const grid = this.get_grid();

		/** @type {unknown[]} */
		const data = grid.get_data();

		for (const name of names) {
			const oldIndex = data.findIndex(row => row.name == name);
			const newIndex = targetIndex;
			// Remove 1 row at the old index
			const removed = data.splice(oldIndex, 1);
			// Insert it at the new index
			data.splice(newIndex, 0, ...removed);
		}

		// renum idx
		for (let i = 0; i < data.length; i++) {
			data[i].idx = i + 1;
		}

		grid.refresh();
		this.frm.dirty();
		// $(this.frm.wrapper).trigger("grid-move-row", [this.frm, row]);
	}

	watch_update(fn) {
		const _doRowUpdate = (...args) => fn("row", ...args);
		const _doTableUpdate = (...args) => fn("table", ...args);

		const doRowUpdate = _doRowUpdate;
		const doTableUpdate = frappe.utils.throttle(_doTableUpdate, 16, { leading: false, trailing: true });

		const parent = this.parent_doctype;
		const child = this.row_doctype;

		// frappe.model.on(parent, "*", doTableUpdate);
		frappe.model.on(child, "*", doRowUpdate);
		frappe.ui.form.on(parent, "refresh", doTableUpdate);
		frappe.ui.form.on(child, "*", doRowUpdate);
		frappe.ui.form.on(child, "items_move", doTableUpdate);
		frappe.ui.form.on(child, "items_add", doTableUpdate);
		frappe.ui.form.on(child, "items_remove", doTableUpdate);
		frappe.ui.form.on(child, "items_delete", doTableUpdate);
	}

	get parent_doctype() { return this.frm.doctype; }
	get row_doctype() { return frappe.meta.get_field(this.parent_doctype, "items").options; }

	isRowEmpty(row) {
		return !row.name || (!row.item_code && !row.item_name && !row.description);
	}
}

export default class ItemBuilderTable {
	constructor(opts) {
		Object.assign(this, opts);
		this.frm = opts.frm;
		/** @type {ItemBuilderForm} */
		this.form_wrapper = new ItemBuilderForm({ frm: this.frm, builder: this, detach: true });
		this.ready_promise = this.make();
		this.destroyed = false;
	}

	destroy() {
		this.destroyed = true;
		this.form_wrapper = null;
		this.tabulator = null;
		this.open_form = null;

		this.observer?.disconnect();
		this.observer = null;

		if (this.show_row_form_in_dialog) {
			document.removeEventListener(CQBTableEditRow.EVENT_NAME, this.show_row_form_in_dialog);
		}
	}

	get features() {
		const write = this.frm.doc.docstatus == 0;
		const is_buying = is_buying_doctype(this.frm.doctype);
		return {
			read: 1,
			write: write,
			add_item: write,
			add_title: write && !is_buying,
			add_comment: write && !is_buying,
		}
	}

	async make() {
		await this.build_table();
		this.refresh_buttons();
		this.bind();
	}

	async refresh() {
		this.refresh_columns();
		this.refresh_buttons();
		const newRows = this.form_wrapper.get_rows();
		await this.tabulator.replaceData(newRows);
	}

	refresh_columns() {
		this.tabulator.setColumns(this.form_wrapper.get_columns());
	}

	refresh_buttons() {
		this.$table_buttons?.remove();
		this.$table_footer?.remove();

		if (this.features.write) {
			const add_item = `<button type="button" class="btn btn-xs btn-primary new-item">
				${__("Add Item", null, "Construction")}
				${frappe.utils.icon('add', 'sm')}
			</button>`

			const add_title = `<button type="button" class="btn btn-xs btn-default new-title">
				${__("Title", null, "Construction")}
				${frappe.utils.icon('add', 'sm')}
			</button>`

			const add_comment = `<button type="button" class="btn btn-xs btn-default new-text">
				${__("Comment", null, "Construction")}
				${frappe.utils.icon('add', 'sm')}
			</button>`

			this.$table_buttons = $(`<div class="d-flex flex-row flex-shrink-0 align-items-start justify-content-end item-table-buttons">
				<button class="btn btn-xs btn-danger delete-row mr-2" style="display: none;">${__("Delete")} ${frappe.utils.icon('remove', 'sm')}</button>
				<div class="btn-group flex-shrink-0 align-items-start">
					${this.features.add_item ? add_item : ""}
					${this.features.add_title ? add_title : ""}
					${this.features.add_comment ? add_comment : ""}
				</div>
			</div>`).appendTo(this.$table_wrapper);

			this.table_actions = this.$table_buttons.find(".btn-group")[0];

			this.$table_footer = $(`<div class="item-table-footer d-flex flex-row flex-shrink-0 align-items-start">
				<div class="mr-auto text-muted small item-table-footer-help"></div>
			</div>`).appendTo(this.$table_wrapper);

			// const help = this.$table_footer.find(".item-table-footer-help");
			// help.html([
			// 	__("Drag and drop rows to reorder them."),
			// 	__("Click on a row to select it."),
			// 	__("Click on the <b>Delete</b> button to delete the selected rows."),
			// 	__("Click on the <b>Add Item</b> button to add a new item."),
			// 	__("Scroll horizontally using the mouse wheel while pressing ⇧."),
			// ].join("<br>"));
		} else {
			this.$table_buttons = $("<div>");
			this.$table_footer = $("<div>");
		}

		this.$new_item_button = this.$table_buttons.find(".new-item");
		this.$delete_row_button = this.$table_buttons.find(".delete-row");
		this.$new_title_button = this.$table_buttons.find(".new-title");
		this.$new_text_button = this.$table_buttons.find(".new-text");

		this.$new_item_button.on("click", () => {
			this.form_wrapper.append_row({});
		});

		this.$new_title_button.on("click", () => {
			this.append_title_row();
		});

		this.$new_text_button.on("click", () => {
			this.append_comment_row();
		});

		this.$delete_row_button.on("click", () => {
			const selected_rows = this.tabulator.getSelectedRows()

			const names = selected_rows.map((row) => {
				const rowData = row.getData();
				return rowData.name;
			}).filter(Boolean);
			this.form_wrapper.remove_rows(names)
			this.tabulator.deselectRow();
		})

		document.dispatchEvent(new CQBTableToolbarRendered(this));
	}

	bind() {
		this.bind_events();
		this.bind_form();
		this.bind_edit();
		this.bind_observer();
	}

	bind_edit() {
		this.show_row_form_in_dialog = (/** @type {CQBTableEditRow} */ event) => {
			if (event.detail.builder !== this) {
				return;
			}
			if (this.destroyed) {
				return;
			}
			const cell = event.detail.cell;
			const row = cell.getRow();
			const rowData = row.getData();
			const doc = this.frm.doc.items.find(x => x.name === rowData.name);

			const dialog = new frappe.ui.Dialog({
				size: "large",
				fields: frappe.get_meta(this.frm.doctype + " Item").fields,
				frm: this.frm,
				doc: this.frm.doc,
				grid: this.frm.get_field("items").grid,
				title: __("Edit"),
				primary_action_label: __("Close"),
				primary_action: () => {
					dialog.hide();
				},
				onhide: () => {
					this.open_form = null;
				},
			});
			dialog.refresh(doc);
			dialog.show();
			this.open_form = dialog;
		};
		document.addEventListener(CQBTableEditRow.EVENT_NAME, this.show_row_form_in_dialog);
	}

	bind_observer() {
		const do_later = requestIdleCallback || setTimeout;

		/** @type {IntersectionObserverCallback} */
		const callback = (entries, observer) => {
			if (!entries[0]?.isIntersecting) {
				return; // Not visible
			}

			const height = entries[0].boundingClientRect.height;
			if (height > 120) {
				return; // The table is big enough, thus it has some rows = it has been drawn.
			}
			// Implicit else case: It's acceptable to redraw the table even if it has visible rows when it is small.

			do_later(() => {
				// We force the redraw because the table was not visible (maybe), thus its rows were not drawn.
				// We add the `true` parameter to force the redraw because, on refresh, the data has changed,
				// and has been redrawn while the table was not visible.
				this.tabulator.redraw(true);
			});
		}

		// Using default values for IntersectionObserver options
		// https://developer.mozilla.org/en-US/docs/Web/API/Intersection_Observer_API
		this.observer = new IntersectionObserver(callback, {});
		this.observer.observe(this.tabulator_wrapper);
	}

	async on_update(what, ...args) {
		if (this.destroyed) {
			return;
		}

		if (what === "row" && typeof args[2]?.name === "string") {
			// Is a single row update
			const doc = args[2];
			const row = this.tabulator.getRow(doc.name);
			if (row) {
				row.update(doc);
				this.tabulator.redraw();
				return this.after_update();
			}
		}

		// Is a full table update
		const newRows = this.form_wrapper.get_rows();
		await this.tabulator.replaceData(newRows);
		return this.after_update();
	}

	async after_update() {
		if (this.open_form) {
			const dialog = this.open_form;
			const item = this.frm.doc.items.find(x => x.name === dialog.doc.name)
			if (item) {
				dialog.refresh(item);
			}
		}

		/* const rows = this.tabulator.getData();
		if (!rows?.length) {
			// Last row deleted, do nothing
		} else if (this.form_wrapper.isRowEmpty(rows[rows.length - 1])) {
			// Last row is empty, do nothing
		} else {
			// Append empty row when the last row is not empty
			return await this.form_wrapper.append_row({});
		} */
	}

	bind_form() {
		this.form_wrapper.watch_update(this.on_update.bind(this));
		this.after_update();
	}

	async build_table() {
		await this.form_wrapper.setup();

		const tabulator_options = {
			data: [],
			index: "name",
			columns: this.form_wrapper.get_columns(),
			maxHeight: "unset",
			debugInvalidOptions: false,
			resizableRows: false,
			reactiveData: false,
			movableRows: true,
			rowFormatter: this.rowFormatter.bind(this),

			langs: {
				"default": {
					"pagination": {
						"page_size": __("Page Size"),
						"page_title": __("Show Page"),
						"first": __("First"),
						"first_title": __("First Page"),
						"last": __("Last"),
						"last_title": __("Last Page"),
						"prev": __("Prev"),
						"prev_title": __("Prev Page"),
						"next": __("Next"),
						"next_title": __("Next Page"),
						"all": __("All"),
						"counter": {
							"showing": __("Showing"),
							"of": __("of"),
							"rows": __("rows"),
							"pages": __("pages"),
						}
					},
				}
			},
			...this._get_pagination_config(),
		}
		this.tabulator = new Tabulator(this.tabulator_wrapper, tabulator_options);

		await new Promise((resolve) => {
			this.tabulator.on("tableBuilt", () => {
				resolve();
			});
		});

		// let lastScrollTop = 0;
		// this.tabulator.on("renderStarted", () => {
		// 	lastScrollTop = window.scrollY || lastScrollTop;
		// });
		// this.tabulator.on("renderComplete", () => {
		// 	window.scrollTo(0, lastScrollTop);
		// });
	}

	get tabulator_wrapper() {
		return this.$table_wrapper.find(".tabulator-table")[0];
	}

	_get_pagination_config() {
		if (frappe.is_mobile()) {
			return {}; // Hide pagination on mobile, until we make it responsive
		}

		let default_page_size = frappe.boot?.construction_app_settings?.default_table_page_size;
		if (default_page_size === "All") {
			default_page_size = true;
		} else if (default_page_size === "None") {
			default_page_size = false;
		} else if (default_page_size) {
			default_page_size = parseInt(default_page_size);
		} else {
			default_page_size = 0;
		}

		if (default_page_size) {
			return {
				pagination: "local",
				paginationCounter: "rows",
				paginationSize: default_page_size,
				paginationSizeSelector: [20, 100, true],
			}
		}
		return {};
	}

	rowFormatter(row) {
		// https://tabulator.info/examples/5.5#nested-tables
		const doc = row.getData();

		if (doc?.row_type?.startsWith?.("title")) {
			this.rowFormatterForTitle(doc, row);
		} else if (doc?.row_type == "text") {
			this.rowFormatterForText(doc, row);
		}
	}

	makeCheckbox(doc, fieldname, label) {
		const checkboxWrapper = document.createElement("label");
		checkboxWrapper.classList.add("m-0");
		checkboxWrapper.innerHTML = `<div class="switch text-muted"><input type="checkbox"><span class="slider round"></span></div>`;
		const checkbox = checkboxWrapper.querySelector("input");
		checkbox.type = "checkbox";
		checkbox.checked = doc[fieldname];

		if (doc.docstatus > 0) {
			checkbox.disabled = true;
		} else {
			checkbox.addEventListener("change", (e) => {
				this.form_wrapper.update_row_value(doc, fieldname, e.target.checked);
			});
		}

		checkboxWrapper.append("\xa0", label);
		return checkboxWrapper;
	}

	/* makeSelect(doc, df) {
		const selectWrapper = document.createElement("label");
		selectWrapper.classList.add("m-0");
		const control = frappe.ui.form.make_control({
			df: {
				...df,
				input_class: "input-xs",
				onchange: () => {
					const value = control.get_value();
					this.form_wrapper.update_row_value(doc, df.fieldname, value);
				},
			},
			parent: selectWrapper,
			render_input: true,
			only_input: true,
			value: doc[df.fieldname],
		});
		// selectWrapper.prepend(df.label, "\xa0");
		return selectWrapper;
	} */

	rowFormatterForTitle(doc, row) {
		const wrapper = this._buildWrapperInRow(row);

		// Parse title level
		const level = parseInt(doc.row_type.replace("title", ""));

		const header_wrapper = document.createElement("div");
		//header_wrapper.classList.add("d-flex");
		const element = document.createElement(`h${level + 2}`);
		header_wrapper.appendChild(element);
		wrapper.appendChild(header_wrapper);
		element.classList.add("m-0", "chantier-heading", "chantier-heading-" + level);

		// Add checkbox
		header_wrapper.appendChild(this.makeCheckbox(doc, "with_subtotal", __("Compute Subtotal")));
		// wrapper.appendChild(this.makeSelect(doc, {
		// 	...frappe.get_meta(this.form_wrapper.row_doctype).fields.find(x => x.fieldname === "row_print_style"),
		// 	label: __("Print Style"),
		// }));

		const counter = document.createElement("label");
		element.appendChild(counter);
		counter.classList.add("chantier-counter", "m-0");

		if (doc.docstatus == 0) {
			const select = document.createElement("select");
			for (let i = 1; i <= 3; i++) {
				const option = document.createElement("option");
				option.value = `title${i}`;
				const txt = `Heading ${i}`;
				option.text = __(txt) // "1.".repeat(i);
				if (i == level) {
					option.selected = true;
				}
				select.appendChild(option);
			}
			counter.appendChild(select);
			select.classList.add("btn-reset");
			select.addEventListener("change", () => {
				this.form_wrapper.update_row_value(doc, "row_type", select.value);
			});
			const icon = document.createElement("span");
			icon.innerHTML = frappe.utils.icon("es-line-select", "md");
			counter.appendChild(icon);
		} else {
			element.disabled = true;
		}

		const input = document.createElement("input");
		element.append(" ", input);
		input.classList.add("btn-reset");
		input.style.width = "60vw";
		input.style.font = "inherit";

		const KEY = "item_name";
		input.value = doc[KEY];

		if (doc.docstatus > 0) {
			input.readOnly = true;
		} else {
			input.addEventListener("change", (e) => {
				this.form_wrapper.update_row_value(doc, KEY, e.target.value);
			});
		}
	}

	rowFormatterForText(doc, row) {
		const wrapper = this._buildWrapperInRow(row);
		const rowDt = this.form_wrapper.row_doctype;
		const rowDf = frappe.meta.get_docfield(rowDt, "description");

		const control = frappe.ui.form.make_control({
			df: makeTextEditorDocField(rowDf, row),
			parent: wrapper,
			render_input: true,
			only_input: true,
			value: doc.description,
			disabled: doc.docstatus > 0
		});
		setTextEditorStyle(control);
		onControlBlur(control, () => {
			const value = control.get_value();
			this.form_wrapper.update_row_value(doc, "description", value);
		});

		document.dispatchEvent(new CQBTableRenderedComment(this, control, doc, row));
	}

	_buildWrapperInRow(row) {
		const wrapper = document.createElement("div");
		const rowEl = row.getElement();
		// Remove all children except the first two (drag handle and checkbox)
		for (const child of rowEl.children) {
			if (child.classList.contains("tabulator-row-handle")) {
				continue;
			} else if (child.classList.contains("tabulator-col-resize-handle")) {
				continue;
			} else if (child.querySelector(":scope > [type='checkbox']")) {
				continue;
			} else if (child.getAttribute("tabulator-field") === "edit_btn") {
				continue;
			} else if (child.getAttribute("tabulator-field") === "_text_editor") {
				// Always remove the old editor
			}
			child.style.display = "none";
		}
		rowEl.appendChild(wrapper);
		wrapper.classList.add("tabulator-cell");
		wrapper.setAttribute("tabulator-field", "_text_editor");
		wrapper.style.overflow = "visible";
		wrapper.style.width = "60vw";
		return wrapper;
	}

	bind_events() {
		if (!this.$table_buttons) {
			return;
		}

		const toggle_delete_row_button = () => {
			if (this.tabulator.getSelectedRows().length) {
				this.$delete_row_button.show()
			} else {
				this.$delete_row_button.hide()
			}
		}
		this.tabulator.on("rowSelected", () => {
			toggle_delete_row_button()
		});
		this.tabulator.on("rowDeselected", () => {
			toggle_delete_row_button()
		});

		this.tabulator.on("cellEdited", (cell) => {
			this.sync_item_cell(cell)
		});

		this.tabulator.on("rowMoved", (row) => {
			const newIndex = row.getPosition() - 1; // 1-based index (0 is the header row)
			const name = row.getData().name;
			this.form_wrapper.move_rows([name], newIndex);
		});
	}

	scrollToBottom() {
		this.$table_buttons.get(0).scrollIntoView({ block: "end" });
	}

	async _append_text_row_no_dialog(row_type, text = "", atIndex = null) {
		let description = "";
		let item_name = "";
		switch (row_type) {
			case "title1":
			case "title2":
			case "title3":
				description = "";
				item_name = text;
				break;
			case "text":
				description = text;
				item_name = __("Comment");
				break;
		}
		this.form_wrapper.append_row({
			"row_type": row_type,
			"item_name": item_name,
			"qty": 1,
			"uom": (await this.get_default_stock_uom()) || __("Unit"),
			"rate": 0,
			"description": description,
		}, atIndex);
	}

	/**
	 * Append a comment row to the table.
	 *
	 * @param {Object} [options] - Optional parameters.
	 * @param {number} [options.atIndex] - The index at which to append the row.
	 * @param {string} [options.text] - The text to display in the row.
	 * @return {Promise<void>}
	 */
	async append_comment_row({ atIndex = null, text = null } = {}) {
		await this._append_text_row_no_dialog("text", text || "", atIndex);
	}

	/**
	 * Append a title row to the table.
	 *
	 * @param {Object} [options] - Optional parameters.
	 * @param {number} [options.atIndex] - The index at which to append the row.
	 * @param {number} [options.level] - The level of the heading, from 1 to 3.
	 * @param {string} [options.text] - The text to display in the row.
	 * @return {Promise<void>}
	 */
	async append_title_row({ atIndex = null, level = null, text = null } = {}) {
		if (!level) {
			level = 1;
			const rows = this.form_wrapper.get_rows()
			const prevRow = rows.length ? rows[(atIndex ?? rows.length) - 1] : null;
			if (prevRow?.row_type?.startsWith?.("title")) {
				level = parseInt(prevRow.row_type.replace("title", "")) + 1;
			}
		}
		level = Math.max(1, Math.min(3, level));
		await this._append_text_row_no_dialog("title" + level, text ?? __("Heading " + level), atIndex);
	}

	show_text_title_dialog(row_type) {
		const getTitle = (row_type) => (row_type == "text") ? __("Add Comment") : __("Add Heading");

		const dialog = new frappe.ui.Dialog({
			title: getTitle(row_type),
			primary_action_label: getTitle(row_type),
			doc: { row_type, title: "", comment: "" },
			fields: [
				{
					"label": __("Type"),
					"fieldname": "row_type",
					"fieldtype": "Select",
					"options": [
						{
							label: __("Heading 1"),
							value: "title1",
						},
						{
							label: __("Heading 2"),
							value: "title2",
						},
						{
							label: __("Heading 3"),
							value: "title3",
						},
						{
							label: __("Comment"),
							value: "text",
						},
					],
					"onchange": () => {
						const title = getTitle(dialog.get_value("row_type"));
						dialog.get_primary_btn().text(title);
						dialog.set_title(title);
					},
				},
				{
					"label": __("Title"),
					"fieldname": "title",
					"fieldtype": "Data",
					"depends_on": "eval:doc.row_type?.startsWith?.('title')",
					"mandatory_depends_on": "eval:doc.row_type?.startsWith?.('title')",
				},
				{
					"label": __("Compute Subtotal"),
					"fieldname": "with_subtotal",
					"fieldtype": "Check",
					"depends_on": "eval:doc.row_type?.startsWith?.('title')",
				},
				{
					"label": __("Comment"),
					"fieldname": "comment",
					"fieldtype": "Text Editor",
					"depends_on": "eval:doc.row_type == 'text'",
					"mandatory_depends_on": "eval:doc.row_type == 'text'",
				},
			],
			primary_action: async () => {
				const values = dialog.get_values()
				const row_type = values.row_type;

				let content = "";
				let item_name = "";
				switch (row_type) {
					case "title1":
						content = `<div class="ql-editor read-mode"><h1>${values.title}</h1></div>`;
						item_name = row_type;
						break;
					case "title2":
						content = `<div class="ql-editor read-mode"><h2>${values.title}</h2></div>`;
						item_name = row_type;
						break;
					case "title3":
						content = `<div class="ql-editor read-mode"><h3>${values.title}</h3></div>`;
						item_name = row_type;
						break;
					case "text":
						content = values.comment;
						item_name = __("Comment");
						break;
				}

				this.form_wrapper.append_row({
					"row_type": row_type,
					"item_name": item_name,
					"qty": 1,
					"uom": (await this.get_default_stock_uom()) || __("Unit"),
					"rate": 0,
					"description": content,
				})
				dialog.hide();
			},
		});
		dialog.show();
	}

	sync_item_cell(cell) {
		const row = cell.getRow();

		const doc = row.getData();
		const fieldname = cell.getField();
		const oldValue = cell.getOldValue();
		const newValue = cell.getValue();

		// Because Tabulator did update the value directly in the row object, we need to REVERT the value first
		doc[fieldname] = oldValue;
		this.form_wrapper.update_row_value(doc, fieldname, newValue);
	}

	async get_default_stock_uom() {
		if (!this._get_default_stock_uom_memo) {
			this._get_default_stock_uom_memo = await this._get_default_stock_uom();
		}
		return this._get_default_stock_uom_memo;
	}

	async _get_default_stock_uom() {
		const default_uom = frappe.boot.sysdefaults.stock_uom;
		if (default_uom) {
			return default_uom;
		}

		// @deprecated
		console.warn("construction: Please define a default Stock UOM in Stock Settings");
		const prom = new Promise((resolve, reject) => {
			const dialog = new frappe.ui.Dialog({
				title: __("Default Stock UOM"),
				fields: [
					{
						fieldtype: "Link",
						fieldname: "stock_uom",
						options: "UOM",
						label: __("Stock UOM"),
						reqd: 1,
					},
				],
				primary_action_label: __("Set"),
				primary_action: (values) => {
					resolve(values.stock_uom);
					dialog.hide();
				},
			});
			dialog.show();
		});
		return prom;
	}
}
