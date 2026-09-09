/** Shared formatting and event-object helpers. */
var ProjectTimeUtils = (function() {
  'use strict';

  function escapeHtml(value) {
    return String(value == null ? '' : value)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
  }

  function formatDuration(milliseconds) {
    var totalMinutes = Math.max(0, Math.round(milliseconds / 60000));
    var hours = Math.floor(totalMinutes / 60);
    var minutes = totalMinutes % 60;
    if (hours && minutes) return hours + 'h ' + pad2(minutes) + 'm';
    if (hours) return hours + 'h 00m';
    return minutes + 'm';
  }

  function pad2(number) {
    return number < 10 ? '0' + number : String(number);
  }

  function clampInteger(value, minimum, maximum, fallback) {
    var number = parseInt(value, 10);
    return isFinite(number) ? Math.max(minimum, Math.min(maximum, number)) : fallback;
  }

  function formValues(event, fieldName) {
    var common = event && event.commonEventObject;
    var input = common && common.formInputs && common.formInputs[fieldName];
    var values = input && input.stringInputs && input.stringInputs.value;
    if (values) return values.slice();

    var legacy = event && event.formInputs && event.formInputs[fieldName];
    if (legacy && legacy.length) return legacy.slice();
    var single = event && event.formInput && event.formInput[fieldName];
    return single == null ? [] : [String(single)];
  }

  function firstFormValue(event, fieldName, fallback) {
    var values = formValues(event, fieldName);
    return values.length ? values[0] : fallback;
  }

  function hasFormValue(event, fieldName, expected) {
    return formValues(event, fieldName).indexOf(expected) !== -1;
  }

  function actionParameter(event, name, fallback) {
    var common = event && event.commonEventObject;
    var parameters = common && common.parameters || event && event.parameters || {};
    return parameters[name] == null ? fallback : String(parameters[name]);
  }

  function stableHash(text) {
    var hash = 2166136261;
    for (var i = 0; i < text.length; i += 1) {
      hash ^= text.charCodeAt(i);
      hash += (hash << 1) + (hash << 4) + (hash << 7) +
          (hash << 8) + (hash << 24);
    }
    return (hash >>> 0).toString(36);
  }

  function safeColor(value) {
    return /^#[0-9a-f]{6}$/i.test(value || '') ? value : '#9E9E9E';
  }

  return {
    actionParameter: actionParameter,
    clampInteger: clampInteger,
    escapeHtml: escapeHtml,
    firstFormValue: firstFormValue,
    formValues: formValues,
    formatDuration: formatDuration,
    hasFormValue: hasFormValue,
    safeColor: safeColor,
    stableHash: stableHash
  };
})();
