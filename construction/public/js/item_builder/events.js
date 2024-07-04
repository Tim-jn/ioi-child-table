export class CQBTableToolbarRendered extends CustomEvent {
	static get EVENT_NAME() {
		return "quotationbuildertable-toolbar-rendered";
	}
	constructor(/** @type {import("./table").default} */ builder) {
		super(CQBTableToolbarRendered.EVENT_NAME, {
			bubbles: true,
			cancelable: true,
		});
		this._detail = { builder };
	}
	get detail() {
		return this._detail;
	}
}

export class CQBTableEditRow extends CustomEvent {
	static get EVENT_NAME() {
		return "quotationbuildertable-edit-row";
	}
	constructor(
		/** @type {import("./table").default} */ builder,
		/** @type {import("tabulator-tables").CellComponent} */ cell
	) {
		super(CQBTableEditRow.EVENT_NAME, {
			bubbles: true,
			cancelable: true,
		});
		this._detail = { builder, cell };
	}
	get detail() {
		return this._detail;
	}
}

export class CQBTableRenderedComment extends CustomEvent {
	static get EVENT_NAME() {
		return "quotationbuildertable-comment-rendered";
	}
	constructor(
		/** @type {import("./table").default} */ builder,
		control, doc, row
	) {
		super(CQBTableRenderedComment.EVENT_NAME, {
			bubbles: true,
			cancelable: true,
		});
		this._detail = { builder, control, doc, row };
	}
	get detail() {
		return this._detail;
	}
}

export class CQBTableRenderedRowButtons extends CustomEvent {
	static get EVENT_NAME() {
		return "quotationbuildertable-row-ribbon-rendered";
	}
	constructor(
		/** @type {import("./table").default} */ builder,
		/** @type {import("./ButtonRibbon").ButtonRibbon} */ ribbon,
		cell
	) {
		super(CQBTableRenderedRowButtons.EVENT_NAME, {
			bubbles: true,
			cancelable: true,
		});
		this._detail = { builder, ribbon, cell };
	}
	get detail() {
		return this._detail;
	}
}