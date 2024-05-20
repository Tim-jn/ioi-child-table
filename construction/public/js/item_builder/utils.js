export const BUYING_DOCTYPES = [
	// "Purchase Invoice",
	"Purchase Order",
	"Supplier Quotation",
	// "Material Request",
	// "Purchase Receipt",
];

export function is_buying_doctype(doctype) {
	return BUYING_DOCTYPES.includes(doctype)
}
