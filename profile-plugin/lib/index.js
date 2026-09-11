/**
 * Desktop pet — node half.
 *
 * The empty apply gives the Loader a host-side row for this package; the browser
 * half ships through exports["./client"] and is composed by the client module
 * system. The pet is pure browser UI, so the Host contributes nothing.
 */
function apply() {}

export { apply }
