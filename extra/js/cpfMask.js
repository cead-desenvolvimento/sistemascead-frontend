(function () {
  const attached = new WeakSet();

  function mask(value) {
    const digits = (value || "").replace(/\D/g, "").slice(0, 11);
    const p1 = digits.slice(0, 3);
    const p2 = digits.slice(3, 6);
    const p3 = digits.slice(6, 9);
    const p4 = digits.slice(9, 11);
    let out = p1;
    if (p2) out += "." + p2;
    if (p3) out += "." + p3;
    if (p4) out += "-" + p4;
    return out;
  }

  function unmask(value) {
    return (value || "").replace(/\D/g, "");
  }

  function attach(input) {
    if (!input || attached.has(input)) return;
    attached.add(input);

    input.setAttribute("inputmode", input.getAttribute("inputmode") || "numeric");
    input.setAttribute("maxlength", input.getAttribute("maxlength") || "14");
    input.autocomplete = input.autocomplete || "username";

    const onInput = () => {
      const sel = input.selectionStart ?? input.value.length;
      input.value = mask(input.value);
      // tenta manter o cursor próximo ao final
      input.selectionStart = input.selectionEnd = Math.min(input.value.length, sel + 1);
    };

    input.addEventListener("input", onInput);
    input.addEventListener("paste", (e) => {
      e.preventDefault();
      const text = (e.clipboardData || window.clipboardData).getData("text");
      input.value = mask(text);
      input.dispatchEvent(new Event("input"));
    });

    // aplica máscara no load se já houver valor
    if (input.value) input.value = mask(input.value);
  }

  function init(root = document) {
    root.querySelectorAll('input[data-cpf-mask]').forEach(attach);
  }

  // API pública
  window.CPFMask = { mask, unmask, attach, init };
})();
