function getElementAt(src) {
  return typeof src === "string" ? getElementAt(src) : src;
}