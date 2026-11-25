/* Get references to DOM elements */
const categoryFilter = document.getElementById("categoryFilter");
const productSearch = document.getElementById("productSearch");
const productsContainer = document.getElementById("productsContainer");
const selectedProductsList = document.getElementById("selectedProductsList");
const clearSelectedBtn = document.getElementById("clearSelected");
const generateRoutineBtn = document.getElementById("generateRoutine");
const rtlToggleBtn = document.getElementById("rtlToggle");
const chatForm = document.getElementById("chatForm");
const userInput = document.getElementById("userInput");
const chatWindow = document.getElementById("chatWindow");

const workerUrl = "https://loreal-routine.jasmined1256.workers.dev/";

const STORAGE_KEY = "selectedProducts";
const DIRECTION_KEY = "textDirection";

/* Apply LTR or RTL layout direction and update the toggle button */
function applyTextDirection(direction) {
  const isRtl = direction === "rtl";
  document.documentElement.dir = isRtl ? "rtl" : "ltr";
  rtlToggleBtn.classList.toggle("active", isRtl);
  rtlToggleBtn.setAttribute("aria-pressed", String(isRtl));

  const label = rtlToggleBtn.querySelector("span");
  if (label) {
    label.textContent = isRtl ? "RTL Mode: On" : "RTL Mode";
  }
}

/* Load saved text direction preference from localStorage */
function loadTextDirection() {
  try {
    const saved = localStorage.getItem(DIRECTION_KEY);
    if (saved === "rtl" || saved === "ltr") {
      return saved;
    }
  } catch (error) {
    // Ignore storage errors in restricted browsing modes
  }
  return document.documentElement.dir === "rtl" ? "rtl" : "ltr";
}

applyTextDirection(loadTextDirection());

/* Toggle between LTR and RTL mode */
rtlToggleBtn.addEventListener("click", () => {
  const nextDirection =
    document.documentElement.dir === "rtl" ? "ltr" : "rtl";
  applyTextDirection(nextDirection);
  try {
    localStorage.setItem(DIRECTION_KEY, nextDirection);
  } catch (error) {
    // Ignore storage errors in restricted browsing modes
  }
});

/* Load saved product selections from localStorage */
function loadSelectedProducts() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (!saved) {
      return [];
    }
    const parsed = JSON.parse(saved);
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    return [];
  }
}

/* Save selected products to localStorage */
function saveSelectedProducts() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(selectedProducts));
  } catch (error) {
    // Ignore storage errors in restricted browsing modes
  }
}

/* Keep track of products the user has selected */
let selectedProducts = loadSelectedProducts();

/* Store the full conversation history so the AI has context for follow-up questions */
const systemPrompt =
  "You are a L'Oréal beauty advisor. Build clear, personalized step-by-step routines using the user's selected products. Only answer questions that relate to the generated routine or to topics like skincare, haircare, hair color, hair styling, makeup, suncare, men's grooming, fragrance, and other related beauty areas. If the user asks an unrelated question, do not answer it—politely state that you can only provide answers about their routine and topics like skincare, haircare, makeup, fragrance, and related beauty areas.";
let messages = [{ role: "system", content: systemPrompt }];

/* Show initial placeholder until user selects a category or searches */
function showProductsPlaceholder(message) {
  productsContainer.innerHTML = `
    <div class="placeholder-message">
      ${message}
    </div>
  `;
}

showProductsPlaceholder("Select a category or search to view products");

/* Show saved or empty state in Selected Products */
displaySelectedProducts();

/* Cache loaded products so typing in the search field stays fast */
let allProducts = [];

/* Load product data from JSON file */
async function loadProducts() {
  if (allProducts.length > 0) {
    return allProducts;
  }

  const response = await fetch("products.json");
  const data = await response.json();
  allProducts = data.products;
  return allProducts;
}

/* Check if a product is already in the selectedProducts array */
function isProductSelected(productId) {
  return selectedProducts.some((product) => product.id === productId);
}

/* Add or remove a product when its card is clicked */
function toggleProductSelection(product, cardElement) {
  const existingIndex = selectedProducts.findIndex(
    (item) => item.id === product.id
  );

  if (existingIndex === -1) {
    // Product is not selected yet — add it and mark the card
    selectedProducts.push(product);
    cardElement.classList.add("selected");
    cardElement.setAttribute("aria-pressed", "true");
  } else {
    // Product is already selected — remove it and unmark the card
    selectedProducts.splice(existingIndex, 1);
    cardElement.classList.remove("selected");
    cardElement.setAttribute("aria-pressed", "false");
  }

  // Save to localStorage and update the Selected Products section
  saveSelectedProducts();
  displaySelectedProducts();
}

/* Render the list of selected products below the grid */
function displaySelectedProducts() {
  clearSelectedBtn.disabled = selectedProducts.length === 0;

  if (selectedProducts.length === 0) {
    selectedProductsList.innerHTML = `
      <p class="empty-selection">No products selected yet. Click a product card to select it.</p>
    `;
    return;
  }

  selectedProductsList.innerHTML = selectedProducts
    .map(
      (product) => `
      <div class="selected-product-item">
        <span>${product.name}</span>
        <button
          type="button"
          class="remove-product-btn"
          data-id="${product.id}"
          aria-label="Remove ${product.name}"
        >
          &times;
        </button>
      </div>
    `
    )
    .join("");

  // Let users remove a product directly from the Selected Products list
  const removeButtons =
    selectedProductsList.querySelectorAll(".remove-product-btn");
  removeButtons.forEach((button) => {
    button.addEventListener("click", () => {
      const productId = Number(button.dataset.id);
      selectedProducts = selectedProducts.filter(
        (product) => product.id !== productId
      );

      // Remove the border from the matching card in the grid if it is visible
      const matchingCard = productsContainer.querySelector(
        `.product-card[data-id="${productId}"]`
      );
      if (matchingCard) {
        matchingCard.classList.remove("selected");
        matchingCard.setAttribute("aria-pressed", "false");
      }

      saveSelectedProducts();
      displaySelectedProducts();
    });
  });
}

/* Clear all selected products at once */
clearSelectedBtn.addEventListener("click", () => {
  selectedProducts = [];

  // Remove the selected border from any visible product cards in the grid
  const selectedCards = productsContainer.querySelectorAll(
    ".product-card.selected"
  );
  selectedCards.forEach((card) => {
    card.classList.remove("selected");
    card.setAttribute("aria-pressed", "false");
  });

  saveSelectedProducts();
  displaySelectedProducts();
});

/* Create HTML for displaying product cards */
function displayProducts(products) {
  productsContainer.innerHTML = products
    .map((product) => {
      const selected = isProductSelected(product.id);
      return `
    <div
      class="product-card ${selected ? "selected" : ""}"
      data-id="${product.id}"
      tabindex="0"
      role="button"
      aria-pressed="${selected}"
    >
      <img src="${product.image}" alt="${product.name}">
      <div class="product-info">
        <h3>${product.name}</h3>
        <p>${product.brand}</p>
        <button
          type="button"
          class="description-toggle-btn"
          aria-expanded="false"
        >
          Product Description
        </button>
        <p class="product-description" hidden>${product.description}</p>
      </div>
    </div>
  `;
    })
    .join("");

  // Add click and keyboard listeners to each product card so users can select or unselect it
  const productCards = productsContainer.querySelectorAll(".product-card");
  productCards.forEach((card) => {
    const productId = Number(card.dataset.id);
    const product = products.find((item) => item.id === productId);
    const descriptionBtn = card.querySelector(".description-toggle-btn");
    const descriptionText = card.querySelector(".product-description");

    // Toggle the product description without selecting or unselecting the card
    descriptionBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      const isHidden = descriptionText.hasAttribute("hidden");

      if (isHidden) {
        descriptionText.removeAttribute("hidden");
        descriptionBtn.classList.add("active");
        descriptionBtn.setAttribute("aria-expanded", "true");
      } else {
        descriptionText.setAttribute("hidden", "");
        descriptionBtn.classList.remove("active");
        descriptionBtn.setAttribute("aria-expanded", "false");
      }
    });

    card.addEventListener("click", () => {
      toggleProductSelection(product, card);
    });

    card.addEventListener("keydown", (e) => {
      // Only toggle selection when the card itself has focus
      if (e.target !== card) {
        return;
      }

      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        toggleProductSelection(product, card);
      }
    });
  });
}

/* Filter products by both category and search keyword */
async function filterAndDisplayProducts() {
  const selectedCategory = categoryFilter.value;
  const searchQuery = productSearch.value.trim().toLowerCase();

  // Keep the placeholder if the user hasn't picked a category or typed a search
  if (!selectedCategory && !searchQuery) {
    showProductsPlaceholder("Select a category or search to view products");
    return;
  }

  const products = await loadProducts();

  const filteredProducts = products.filter((product) => {
    const matchesCategory =
      !selectedCategory ||
      selectedCategory === "all" ||
      product.category === selectedCategory;

    const matchesSearch =
      !searchQuery ||
      product.name.toLowerCase().includes(searchQuery) ||
      product.brand.toLowerCase().includes(searchQuery) ||
      product.category.toLowerCase().includes(searchQuery) ||
      product.description.toLowerCase().includes(searchQuery);

    return matchesCategory && matchesSearch;
  });

  if (filteredProducts.length === 0) {
    showProductsPlaceholder("No matching products found.");
    return;
  }

  displayProducts(filteredProducts);
}

/* Filter and display products when category changes or user types in search */
categoryFilter.addEventListener("change", filterAndDisplayProducts);
productSearch.addEventListener("input", filterAndDisplayProducts);

/* Helper to send a messages array to the Cloudflare Worker and return the reply or an error */
async function requestCompletion(messageList) {
  try {
    const response = await fetch(workerUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "gpt-4.1",
        messages: messageList,
      }),
    });

    const rawText = await response.text();
    let data = {};
    if (rawText) {
      try {
        data = JSON.parse(rawText);
      } catch (parseError) {
        data = {};
      }
    }

    if (!response.ok) {
      return {
        errorMessage:
          data.error?.message ||
          `Request failed with status ${response.status}.`,
      };
    }

    if (data.error?.message) {
      return {
        errorCode: data.error.code || "",
        errorMessage: data.error.message,
      };
    }

    const choice = data.choices?.[0];
    const text = choice?.message?.content;

    if (!text) {
      return {
        errorMessage: "No reply returned from the API.",
      };
    }

    return {
      text,
      finishReason: choice.finish_reason,
    };
  } catch (error) {
    return {
      errorMessage: "Could not reach the advisor service. Please try again.",
    };
  }
}

/* Add a message safely to the chat window */
function addChatMessage(sender, text, isLoading = false) {
  const messageElement = document.createElement("div");
  messageElement.classList.add("chat-message", sender);

  if (isLoading) {
    messageElement.classList.add("loading");
  }

  const label = document.createElement("strong");
  label.textContent = sender === "user" ? "You: " : "Advisor: ";

  const content = document.createElement("span");
  content.dir = "auto";
  content.textContent = text;

  messageElement.appendChild(label);
  messageElement.appendChild(content);
  chatWindow.appendChild(messageElement);

  // Scroll down so the newest message is visible
  chatWindow.scrollTop = chatWindow.scrollHeight;
  return messageElement;
}

/* Show a welcome message in the chat window */
addChatMessage(
  "assistant",
  "Select your products above and click Generate Routine, or ask me a question below."
);

/* Generate a personalized routine when the user clicks "Generate Routine" */
generateRoutineBtn.addEventListener("click", async () => {
  if (selectedProducts.length === 0) {
    addChatMessage(
      "assistant",
      "Please select at least one product before generating a routine."
    );
    return;
  }

  // Format the selected products so the AI knows what to include
  const productDetails = selectedProducts
    .map(
      (product) =>
        `- ${product.brand} ${product.name} (${product.category}): ${product.description}`
    )
    .join("\n");

  const routinePrompt = `Build a personalized step-by-step routine using these selected products:\n${productDetails}`;

  // Start a fresh conversation for the new routine
  messages = [
    { role: "system", content: systemPrompt },
    { role: "user", content: routinePrompt },
  ];

  chatWindow.innerHTML = "";
  addChatMessage("user", "Generate a routine for my selected products.");
  const loadingMessage = addChatMessage(
    "assistant",
    "Building your personalized routine...",
    true
  );
  generateRoutineBtn.disabled = true;

  const result = await requestCompletion(messages);
  loadingMessage.remove();
  generateRoutineBtn.disabled = false;

  if (result.errorMessage) {
    messages.pop();
    addChatMessage("assistant", `Sorry, ${result.errorMessage}`);
    return;
  }

  // Save the assistant's routine in history so follow-up questions have context
  messages.push({ role: "assistant", content: result.text });
  addChatMessage("assistant", result.text);
});

/* Handle follow-up questions in the chat form */
const sendBtn = document.getElementById("sendBtn");

chatForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  const question = userInput.value.trim();
  if (!question) {
    return;
  }

  userInput.value = "";
  addChatMessage("user", question);

  // If the user has selected products but hasn't generated a routine yet, include them as context
  let userMessageContent = question;
  if (messages.length === 1 && selectedProducts.length > 0) {
    const selectedNames = selectedProducts
      .map((product) => `${product.brand} ${product.name}`)
      .join(", ");
    userMessageContent = `Selected products: ${selectedNames}\n\nQuestion: ${question}`;
  }

  messages.push({ role: "user", content: userMessageContent });
  const loadingMessage = addChatMessage("assistant", "Thinking...", true);
  sendBtn.disabled = true;

  const result = await requestCompletion(messages);
  loadingMessage.remove();
  sendBtn.disabled = false;

  if (result.errorMessage) {
    messages.pop();
    addChatMessage("assistant", `Sorry, ${result.errorMessage}`);
    return;
  }

  // Save the assistant's reply in history for future follow-up questions
  messages.push({ role: "assistant", content: result.text });
  addChatMessage("assistant", result.text);
});
