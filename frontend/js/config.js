// Client-side configuration for NORDIC.
// Loaded before js/main.js on the contact page.
//
// contactEndpoint — the POST endpoint that accepts JSON { name, email, message }.
//   - ''        (default): no backend is connected. The form stays visible but
//     reports that it is not yet wired to a delivery service instead of faking
//     a successful send.
//   - <url>     (production): messages are POSTed and success/failure is shown.
//     The URL is intentionally public (it receives submissions). Never place
//     API keys, tokens, or private credentials in this file.
//
// The production build (scripts/build.mjs) injects the value of the
// CONTACT_ENDPOINT environment variable when present; leaving the variable
// unset keeps this development behaviour.
window.NORDIC_CONFIG = {
  contactEndpoint: ''
};