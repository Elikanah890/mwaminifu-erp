let counter = 0;
function next() {
  counter += 1;
  return `test-uuid-${counter}`;
}
module.exports = {
  __esModule: true,
  v4: next,
  v1: next,
  default: { v4: next, v1: next },
};
