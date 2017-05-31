function getElementAt(src) {
  return typeof src === "string" ? document.getElementById(src) : src;
}