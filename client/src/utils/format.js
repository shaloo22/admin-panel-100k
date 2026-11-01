const currency = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0,
});

export const formatCurrency = (value) => currency.format(Number(value));
export const formatDate = (value) =>
  value ? new Date(value).toLocaleDateString("en-IN") : "Never";
