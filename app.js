document.addEventListener("DOMContentLoaded", () => {
  const STORAGE_KEY = "spray-records";
  const form = document.getElementById("spray-form");
  const recordsBody = document.getElementById("records-body");
  const dateInput = document.getElementById("date");
  const clearButton = document.getElementById("clear-button");
  const exportButton = document.getElementById("export-button");

  const loadRecords = () => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch (error) {
      console.error("Kan gegevens niet laden:", error);
      return [];
    }
  };

  const saveRecords = (records) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
  };

  const state = {
    records: loadRecords(),
  };

  const setToday = () => {
    const today = new Date();
    const formatted = today.toISOString().slice(0, 10);
    dateInput.value = formatted;
  };

  const resetForm = () => {
    form.reset();
    setToday();
  };

  const createTag = (label) => {
    const span = document.createElement("span");
    span.className = "tag";
    span.textContent = label;
    return span;
  };

  const renderRecords = () => {
    recordsBody.innerHTML = "";

    if (!state.records.length) {
      const row = document.createElement("tr");
      row.className = "empty";
      const cell = document.createElement("td");
      cell.colSpan = 6;
      cell.textContent = "Nog geen registraties.";
      row.appendChild(cell);
      recordsBody.appendChild(row);
      return;
    }

    state.records.forEach((record, index) => {
      const row = document.createElement("tr");

      const dateCell = document.createElement("td");
      dateCell.textContent = record.date;
      row.appendChild(dateCell);

      const fieldCell = document.createElement("td");
      fieldCell.appendChild(createTag(record.field));
      row.appendChild(fieldCell);

      const productCell = document.createElement("td");
      productCell.appendChild(createTag(record.product));
      row.appendChild(productCell);

      const doseCell = document.createElement("td");
      doseCell.textContent = `${record.dose} L/ha`;
      row.appendChild(doseCell);

      const notesCell = document.createElement("td");
      notesCell.textContent = record.notes || "-";
      row.appendChild(notesCell);

      const actionsCell = document.createElement("td");
      const deleteButton = document.createElement("button");
      deleteButton.type = "button";
      deleteButton.textContent = "Verwijderen";
      deleteButton.className = "ghost-button";
      deleteButton.addEventListener("click", () => deleteRecord(index));
      actionsCell.appendChild(deleteButton);
      row.appendChild(actionsCell);

      recordsBody.appendChild(row);
    });
  };

  const deleteRecord = (index) => {
    state.records.splice(index, 1);
    saveRecords(state.records);
    renderRecords();
  };

  const downloadCsv = () => {
    if (!state.records.length) {
      alert("Geen data om te exporteren.");
      return;
    }

    const header = ["Datum", "Perceel", "Middel", "Dosering (L/ha)", "Opmerkingen"];
    const rows = state.records.map((record) => [
      record.date,
      record.field,
      record.product,
      record.dose,
      record.notes?.replace(/\n/g, " ") || "",
    ]);
    const csv = [header, ...rows]
      .map((line) => line.map((value) => `"${String(value).replace(/"/g, '""')}"`).join(","))
      .join("\n");

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "bespuitingen.csv";
    link.click();
    URL.revokeObjectURL(url);
  };

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    const formData = new FormData(form);
    const record = {
      date: formData.get("date"),
      field: formData.get("field"),
      product: formData.get("product"),
      dose: Number(formData.get("dose")),
      notes: formData.get("notes").trim(),
    };

    state.records.unshift(record);
    saveRecords(state.records);
    renderRecords();
    resetForm();
  });

  clearButton.addEventListener("click", () => {
    if (state.records.length === 0) return;
    const confirmed = confirm("Weet je zeker dat je alle registraties wilt wissen?");
    if (!confirmed) return;
    state.records = [];
    saveRecords(state.records);
    renderRecords();
    resetForm();
  });

  exportButton.addEventListener("click", downloadCsv);

  setToday();
  renderRecords();
});
