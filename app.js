const API_BASE = "/api/records";

const formatRequestError = async (response) => {
  const contentType = response.headers.get("content-type");
  if (contentType && contentType.includes("application/json")) {
    const payload = await response.json();
    if (payload && payload.detail) {
      return payload.detail;
    }
  }
  return `Serverfout (${response.status})`;
};

document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("spray-form");
  const recordsBody = document.getElementById("records-body");
  const dateInput = document.getElementById("date");
  const clearButton = document.getElementById("clear-button");
  const exportButton = document.getElementById("export-button");

  const state = {
    records: [],
    loading: false,
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

  const renderMessageRow = (message) => {
    recordsBody.innerHTML = "";
    const row = document.createElement("tr");
    row.className = "empty";
    const cell = document.createElement("td");
    cell.colSpan = 6;
    cell.textContent = message;
    row.appendChild(cell);
    recordsBody.appendChild(row);
  };

  const renderRecords = () => {
    recordsBody.innerHTML = "";

    if (state.loading) {
      renderMessageRow("Data wordt geladen...");
      return;
    }

    if (!state.records.length) {
      renderMessageRow("Nog geen registraties.");
      return;
    }

    state.records.forEach((record) => {
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
      deleteButton.addEventListener("click", () => deleteRecord(record.id));
      actionsCell.appendChild(deleteButton);
      row.appendChild(actionsCell);

      recordsBody.appendChild(row);
    });
  };

  const loadRecords = async () => {
    state.loading = true;
    renderRecords();
    try {
      const response = await fetch(API_BASE);
      if (!response.ok) {
        throw new Error(await formatRequestError(response));
      }
      const data = await response.json();
      state.records = data;
    } catch (error) {
      console.error("Kan gegevens niet laden:", error);
      renderMessageRow(`Kan gegevens niet laden: ${error.message}`);
      return;
    } finally {
      state.loading = false;
    }
    renderRecords();
  };

  const createRecord = async (record) => {
    const response = await fetch(API_BASE, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(record),
    });
    if (!response.ok) {
      throw new Error(await formatRequestError(response));
    }
    return response.json();
  };

  const deleteRecord = async (id) => {
    try {
      const response = await fetch(`${API_BASE}/${id}`, { method: "DELETE" });
      if (!response.ok) {
        throw new Error(await formatRequestError(response));
      }
      state.records = state.records.filter((record) => record.id !== id);
      renderRecords();
    } catch (error) {
      alert(`Verwijderen mislukt: ${error.message}`);
    }
  };

  const deleteAllRecords = async () => {
    if (state.records.length === 0) return;
    const confirmed = confirm("Weet je zeker dat je alle registraties wilt wissen?");
    if (!confirmed) return;

    try {
      const response = await fetch(API_BASE, { method: "DELETE" });
      if (!response.ok) {
        throw new Error(await formatRequestError(response));
      }
      state.records = [];
      renderRecords();
      resetForm();
    } catch (error) {
      alert(`Wissen mislukt: ${error.message}`);
    }
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

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const formData = new FormData(form);
    const record = {
      date: formData.get("date"),
      field: formData.get("field"),
      product: formData.get("product"),
      dose: Number.parseFloat(formData.get("dose")),
      notes: formData.get("notes").trim(),
    };

    try {
      const created = await createRecord(record);
      state.records.unshift(created);
      renderRecords();
      resetForm();
    } catch (error) {
      alert(`Opslaan mislukt: ${error.message}`);
    }
  });

  clearButton.addEventListener("click", () => {
    deleteAllRecords();
  });

  exportButton.addEventListener("click", downloadCsv);

  setToday();
  loadRecords();
});
