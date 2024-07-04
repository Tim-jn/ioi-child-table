export class ButtonRibbon {
	constructor() {
		this.root = document.createElement("div");
		this.trigger = document.createElement("div");
		this.ribbon = document.createElement("div");

		this.root.append(this.trigger, this.ribbon);

		this.root.classList.add("ButtonRibbon");
		this.trigger.classList.add("ButtonRibbon__trigger");
		this.ribbon.classList.add("ButtonRibbon__ribbon");
	}

	clear() {
		this.trigger.replaceChildren();
		this.ribbon.replaceChildren();
	}

	setTrigger(/** @type {HTMLElement[]} */ ...nodes) {
		this.trigger.replaceChildren(...nodes);
		// this.ribbon.append(...nodes);
	}

	appendButtons(/** @type {HTMLElement[]} */ ...nodes) {
		this.ribbon.append(...nodes);
	}
}