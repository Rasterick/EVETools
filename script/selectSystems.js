let systemIdInput;
let systemNamesDatalist;
let loadSystemButton;

// Function to populate the datalist
function populateDatalist(names) {
  // Ensure systemNamesDatalist is available before populating
  if (!systemNamesDatalist) {
    systemNamesDatalist = document.getElementById("systemNamesDatalist");
  }

  if (systemNamesDatalist) {
    systemNamesDatalist.innerHTML = ""; // Clear existing options
    names.forEach((name) => {
      const option = document.createElement("option");
      option.value = name;
      systemNamesDatalist.appendChild(option);
    });
  } else {
    console.warn(
      "systemNamesDatalist element not found. Datalist cannot be populated."
    );
  }
}

document.addEventListener("DOMContentLoaded", function () {
  systemIdInput = document.getElementById("systemIdInput");
  loadSystemButton = document.getElementById("loadSystemButton");

  // Event listener for input changes to filter the datalist
  systemIdInput.addEventListener("input", function () {
    if (typeof systemNamesArray !== "undefined") {
      const inputValue = systemIdInput.value.toLowerCase();
      const filteredNames = systemNamesArray.filter((name) =>
        name.toLowerCase().startsWith(inputValue)
      );
      populateDatalist(filteredNames.slice(0, 6)); // Limit to 6 entries
    } else {
      console.warn("systemNamesArray array not found. Cannot filter datalist.");
    }
  });

  // Event listener for the Load System button (if needed for validation/action)
  loadSystemButton.addEventListener("click", function () {
    const inputValue = systemIdInput.value.trim();
    if (
      typeof systemNamesArray !== "undefined" &&
      systemNamesArray.includes(inputValue)
    ) {
      console.log(`Loading system: ${inputValue}`);
      // Add your logic to load the system here
      // For example, redirect or fetch data for the system
    } else {
      alert("Please select a valid system from the dropdown list.");
      systemIdInput.value = ""; // Clear invalid input
    }
  });
});
