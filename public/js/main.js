document.addEventListener("DOMContentLoaded", () => {
  console.log(
    "[Init 0.1] DOMContentLoaded. Initializing Smart Garage Nexus v11.0 (Profile & Maint-CRUD)..."
  );

  // --- State & Instance Variables ---
  let garage = new Garage();
  let selectedVehicle = null;
  let currentActiveTab = null;
  let isContentSwapping = false;
  let isPublicGarageView = false;
  let notifications = [];
  let currentChatFriend = null;
  let ws = null;

  const OPENWEATHERMAP_ICON_URL_PREFIX = "https://openweathermap.org/img/wn/";

  // --- UI Element Cache ---
  const getElemById = (id) => document.getElementById(id);
  const mainNav = document.querySelector(".main-nav");
  const navLinks =
    mainNav?.querySelectorAll(".nav-link[data-tab-target]") ?? [];
  const tabContents = document.querySelectorAll(
    ".tab-content[data-tab-content]"
  );
  const garageDisplay = getElemById("garage-display");
  const publicGarageDisplay = getElemById("public-garage-display");
  const detailsContentArea = getElemById("details-content-area");
  const vehicleDetailsTemplate = getElemById("vehicle-details-template");
  const futureAppointmentsList = getElemById("future-appointments-list");
  const addVehicleForm = getElemById("add-vehicle-form");
  const vehicleTypeSelect = getElemById("vehicle-type");
  const truckSpecificFields = getElemById("truck-specific-fields");
  const profileForm = getElemById("profile-form");
  const maintEditModalBackdrop = getElemById("maintenance-edit-modal-backdrop");
  const maintEditForm = getElemById("maintenance-edit-form");
  const friendsContainer = getElemById("friends-container");
  const addFriendForm = getElemById("add-friend-form");
  const friendRequestsContainer = getElemById("friend-requests-container");
  const sharedVehiclesDisplay = getElemById("shared-vehicles-display");
  const notificationButton = getElemById("notification-button");
  const notificationCenter = getElemById("notification-center");
  const notificationList = getElemById("notification-list");
  const notificationCounter = getElemById("notification-counter");
  const shareModalBackdrop = getElemById("share-modal-backdrop");
  const shareForm = getElemById("share-form");
  const shareFriendSearch = getElemById("share-friend-search");
  const shareFriendList = getElemById("share-friend-list");
  const cancelShareButton = getElemById("cancel-share");
  const chatContainer = getElemById("chat-container");
  const chatHeader = getElemById("chat-header");
  const chatMessages = getElemById("chat-messages");
  const chatInput = getElemById("chat-input");

  // --- Initialization ---
  function initializeApp() {
    console.log("[Init 1.0] === Starting initializeApp ===");
    setupEventListeners();
    initAuth(); // from auth.js

    const userInfo = getUserInfo();
    if (userInfo && userInfo.token) {
      loadInitialData();
    } else {
      console.log("[Init 1.2] No user token found. Setting public view.");
      document.querySelectorAll(".dropdown a").forEach((link) => {
        if(link.classList.contains('immune')) return;
        if (link.dataset.protected === "true") {
          link.setAttribute("disabled", "true");
          link.style.cursor = "not-allowed";
          link.style.opacity = "0.5";
        }
      });
      const initialTab =
        getTabFromHash() === "public-garage" ? "public-garage" : "dashboard";
      setActiveTab(initialTab, true);
    }
  }

  async function loadInitialData() {
    console.log(
      "[Init 1.4] User authenticated. Loading initial data from API..."
    );
    const loadSuccess = await garage.loadFromAPI();
    if (!loadSuccess) {
      showNotification(
        "Falha ao carregar dados da garagem. Tente recarregar a página.",
        "error",
        10000
      );
    }

    console.log(`[Init 1.7] ${garage.vehicles.length} user vehicles loaded.`);
    const initialTab = getTabFromHash() || "dashboard";
    setActiveTab(initialTab, true);

    console.log("[Init 1.10] Performing initial rendering...");
    renderGarageList();
    updateAllRelevantData();
    renderDetailsAreaContent(null);

    getElemById("notification-bell").style.display = "block";

    console.log(
      "[Init COMPLETE] === Smart Garage Nexus initialization finished ==="
    );
    initWebSocket();
  }

  function initWebSocket() {
    const userInfo = getUserInfo();
    if (!userInfo || !userInfo.token) return;

    const wsProtocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const wsUrl = `${wsProtocol}//carro6222.vercel.app`;

    ws = new WebSocket(wsUrl);

    ws.onopen = () => {
      console.log("Conexão WebSocket estabelecida.");
      ws.send(JSON.stringify({ type: "AUTH", token: userInfo.token }));
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === "CHAT_MESSAGE") {
          if (
            currentChatFriend &&
            (data.payload.sender === currentChatFriend._id ||
              data.payload.recipient === currentChatFriend._id)
          ) {
            renderMessages(null, data.payload);
          }
          showNotification(
            `Nova mensagem de ${data.payload.sender.username}`,
            "info"
          );
        } else {
          handleIncomingNotification(data);
        }
      } catch (error) {
        console.error("Erro ao processar notificação:", error);
      }
    };

    ws.onclose = () => {
      console.log("Conexão WebSocket fechada. Tentando reconectar em 5s...");
      setTimeout(initWebSocket, 5000);
    };

    ws.onerror = (error) => {
      console.error("Erro no WebSocket:", error);
      ws.close();
    };
  }

  function handleIncomingNotification(notification) {
    notifications.unshift(notification); // Adiciona no início
    renderNotificationCenter();
    showNotification(notification.message, "info");

    // Atualiza a UI conforme o tipo de notificação
    if (notification.type === "FRIEND_REQUEST") {
      if (currentActiveTab === "friends") {
        renderFriendRequests();
      }
    } else if (notification.type === "FRIEND_REQUEST_ACCEPTED") {
      if (currentActiveTab === "friends") {
        renderFriendsList();
      }
    } else if (notification.type === "VEHICLE_SHARED") {
      if (currentActiveTab === "shared-vehicles") {
        renderSharedVehicles();
      }
    }
  }

  async function toggleNotificationCenter() {
    notificationCenter.classList.toggle("visible");
    if (notificationCenter.classList.contains("visible")) {
      // Mark all unread notifications as read when opening the center
      const unreadNotifications = notifications.filter(n => !n.read);
      if (unreadNotifications.length > 0) {
        try {
          await apiMarkAllNotificationsAsRead();
          notifications.forEach(n => n.read = true); // Update local state
          renderNotificationCenter();
        } catch (error) {
          console.error("Erro ao marcar todas as notificações como lidas:", error);
          showNotification("Erro ao marcar notificações como lidas.", "error");
        }
      }
    }
  }

  function renderNotificationCenter() {
    notificationList.innerHTML = "";
    const unreadCount = notifications.filter((n) => !n.read).length;
    notificationCounter.textContent = unreadCount;
    notificationCounter.style.display = unreadCount > 0 ? "flex" : "none";

    if (notifications.length === 0) {
      notificationList.innerHTML =
        '<li class="empty-message">Nenhuma notificação.</li>';
      return;
    }

    notifications.forEach((notification) => {
      const li = document.createElement("li");
      li.classList.add("notification-item");
      if (notification.read) {
        li.classList.add("read");
      }
      li.dataset.notificationId = notification._id; // Add notification ID to li

      let actions = "";
      if (notification.type === "FRIEND_REQUEST") {
        actions = `
                    <div class="actions">
                        <button class="btn btn-success btn-sm" data-id="${notification.data.requestId}">Aceitar</button>
                        <button class="btn btn-danger btn-sm" data-id="${notification.data.requestId}">Recusar</button>
                    </div>
                `;
      }

      li.innerHTML = `<p>${notification.message}</p>${actions}`;

      // Mark as read when clicked (unless it's a friend request action button)
      li.addEventListener('click', async (e) => {
        if (!notification.read && !e.target.closest('.actions')) {
          try {
            await apiMarkNotificationAsRead(notification._id);
            notification.read = true;
            renderNotificationCenter(); // Re-render to update UI
          } catch (error) {
            console.error("Erro ao marcar notificação como lida:", error);
            showNotification("Erro ao marcar notificação como lida.", "error");
          }
        }
      });

      if (notification.type === "FRIEND_REQUEST") {
        li.querySelector(".btn-success").addEventListener("click", async (e) => { // Added async
          e.stopPropagation();
          await handleAcceptFriendRequest(notification.data.requestId); // Added await
          notification.read = true;
          renderNotificationCenter();
        });
        li.querySelector(".btn-danger").addEventListener("click", async (e) => { // Added async
          e.stopPropagation();
          await handleDeclineFriendRequest(notification.data.requestId); // Added await
          notification.read = true;
          renderNotificationCenter();
        });
      }
      notificationList.appendChild(li);
    });
  }

      function setupEventListeners() {
          // Dropdown Toggles
          document.querySelectorAll('.dropdown > a').forEach(dropdownToggle => {
              dropdownToggle.addEventListener('click', (e) => {
                  e.preventDefault();
                  const parentDropdown = dropdownToggle.closest('.dropdown');
                  parentDropdown.classList.toggle('active');
              });
          });
  
          document.querySelector('.profile-dropdown > button').addEventListener('click', (e) => {
              e.preventDefault();
              const profileDropdown = document.querySelector('.profile-dropdown');
              profileDropdown.classList.toggle('active');
          });
  
          // Close dropdowns when clicking outside
          document.addEventListener('click', (e) => {
              document.querySelectorAll('.dropdown.active, .profile-dropdown.active').forEach(openDropdown => {
                  if (!openDropdown.contains(e.target)) {
                      openDropdown.classList.remove('active');
                  }
              });
          });
  
          mainNav?.addEventListener("click", (e) => {
              const link = e.target.closest(".nav-link[data-tab-target]");
              if (link) {
                  e.preventDefault();
                  if (link.hasAttribute("disabled")) {
                      showNotification(
                          "Você precisa fazer login para acessar esta área.",
                          "warning"
                      );
                      return;
                  }
                  setActiveTab(link.dataset.tabTarget);
              }
          });    
          
          const addVehicleImageInput = getElemById("vehicle-image");
          const addVehicleImagePreview = getElemById("vehicle-image-preview");

          addVehicleImageInput?.addEventListener("change", function() {
            if (this.files && this.files[0]) {
              const reader = new FileReader();
              reader.onload = function(e) {
                addVehicleImagePreview.src = e.target.result;
                addVehicleImagePreview.style.display = "block";
              };
              reader.readAsDataURL(this.files[0]);
            } else {
              addVehicleImagePreview.src = "#";
              addVehicleImagePreview.style.display = "none";
            }
          });

          vehicleTypeSelect?.addEventListener("change", (e) => {
      const showTruck = e.target.value === "Truck";
      truckSpecificFields?.classList.toggle("visible", showTruck);
      getElemById("truck-max-load").required = showTruck;
    });
    addVehicleForm?.addEventListener("submit", handleAddVehicle);
    profileForm?.addEventListener("submit", handleProfileUpdate);
    window.addEventListener("hashchange", handleHashChange);

    maintEditModalBackdrop?.addEventListener("click", (e) => {
      if (e.target === maintEditModalBackdrop) {
        closeMaintenanceEditModal();
      }
    });
    maintEditForm?.addEventListener("submit", handleUpdateMaintenance);
    getElemById("cancel-edit-maint")?.addEventListener(
      "click",
      closeMaintenanceEditModal
    );
    addFriendForm?.addEventListener("submit", handleAddFriend);
    notificationButton?.addEventListener("click", toggleNotificationCenter);
    shareModalBackdrop?.addEventListener("click", (e) => {
      if (e.target === shareModalBackdrop) {
        closeShareModal();
      }
    });
    cancelShareButton?.addEventListener("click", closeShareModal);
    shareFriendSearch?.addEventListener("input", handleFriendSearch);
    chatInput?.addEventListener("keydown", handleSendMessage);
  }

  async function handleAddVehicle(event) {
    event.preventDefault();
    const type = vehicleTypeSelect.value;
    const make = addVehicleForm.querySelector("#vehicle-make")?.value.trim();
    const model = addVehicleForm.querySelector("#vehicle-model")?.value.trim();
    const year = addVehicleForm.querySelector("#vehicle-year")?.value;
    const imageInput = addVehicleForm.querySelector("#vehicle-image");
    const maxLoad = addVehicleForm.querySelector("#truck-max-load")?.value;

    if (!type || !make || !model || !year) {
      showNotification("Preencha Tipo, Marca, Modelo e Ano.", "warning");
      return;
    }

    const formData = new FormData();
    formData.append('_type', type);

    formData.append('make', make);
    formData.append('model', model);
    formData.append('year', year);
    if (type === 'Truck') {
      formData.append('maxLoad', maxLoad);
    }
    if (imageInput && imageInput.files[0]) {
      formData.append('image', imageInput.files[0]);
    }

    try {
      const createdVehicleData = await garage.addVehicle(formData);
      if (createdVehicleData) {
        renderGarageList();
        addVehicleForm.reset();
        vehicleTypeSelect.value = "";
        truckSpecificFields?.classList.remove("visible");
        // Clear image preview
        const imagePreview = addVehicleForm.querySelector("#vehicle-image-preview");
        if (imagePreview) {
          imagePreview.src = "#";
          imagePreview.style.display = "none";
        }

        showNotification(
          `${type
            .replace(/([A-Z])/g, " $1")
            .trim()} ${make} ${model} adicionado!`,
          "success"
        );
        updateAllRelevantData();
        selectVehicle(createdVehicleData.id);
      }
    } catch (error) {
      console.error("[Event AddVehicle] Error:", error);
      showNotification(`Erro ao adicionar: ${error.message}`, "error");
    }
  }

  async function handleProfileUpdate(event) {
    event.preventDefault();
    const usernameInput = getElemById("profile-username");
    const newUsername = usernameInput.value.trim();
    const button = profileForm.querySelector(".btn-submit");

    if (!newUsername) {
      showNotification("O nome de usuário não pode estar vazio.", "warning");
      return;
    }

    setLoadingState(button, true, "Salvando...");

    try {
      const updatedUser = await apiUpdateUserProfile({ username: newUsername });

      const userInfo = getUserInfo();
      userInfo.username = updatedUser.username;
      localStorage.setItem("userInfo", JSON.stringify(userInfo));

      document.querySelector("#user-display .username").textContent =
        updatedUser.username;
      usernameInput.value = updatedUser.username;

      showNotification("Perfil atualizado com sucesso!", "success");
    } catch (error) {
      showNotification(`Erro ao atualizar perfil: ${error.message}`, "error");
    } finally {
    }
  }

  async function openChat(friend) {
    currentChatFriend = friend;
    chatContainer.style.display = "block";
    chatHeader.textContent = `Chat com ${friend.username}`;
    chatMessages.innerHTML = '<p class="placeholder-text">Carregando...</p>';

    try {
      const messages = await apiGetMessages(friend._id);
      renderMessages(messages);
    } catch (error) {
      chatMessages.innerHTML = `<p class="error-text">${error.message}</p>`;
    }
  }

  function renderMessages(messages, newMessage = null) {
    if (newMessage) {
      const messageEl = document.createElement("div");
      messageEl.classList.add("message");
      if (newMessage.sender === getUserInfo()._id) {
        messageEl.classList.add("sent");
      } else {
        messageEl.classList.add("received");
      }
      messageEl.textContent = newMessage.content;
      chatMessages.appendChild(messageEl);
    } else {
      chatMessages.innerHTML = "";
      messages.forEach((message) => {
        const messageEl = document.createElement("div");
        messageEl.classList.add("message");
        if (message.sender === getUserInfo()._id) {
          messageEl.classList.add("sent");
        } else {
          messageEl.classList.add("received");
        }
        messageEl.textContent = message.content;
        chatMessages.appendChild(messageEl);
      });
    }
    chatMessages.scrollTop = chatMessages.scrollHeight;
  }

  function handleSendMessage(event) {
    if (event.key === "Enter" && chatInput.value.trim() !== "") {
      const message = {
        type: "CHAT_MESSAGE",
        payload: {
          recipientId: currentChatFriend._id,
          content: chatInput.value.trim(),
        },
      };
      ws.send(JSON.stringify(message));
      chatInput.value = "";
    }
  }

  async function renderFriendsList() {
    try {
      const friends = await apiGetFriends();
      friendsContainer.innerHTML = "";
      if (friends.length === 0) {
        friendsContainer.innerHTML =
          '<p class="placeholder-text">Você ainda não tem amigos. Adicione um no formulário abaixo!</p>';
        return;
      }

      friends.forEach((friend) => {
        const card = document.createElement("div");
        card.className = "friend-card";
        card.innerHTML = `
                    <div class="friend-name">${
                      friend.nickname || friend.username
                    }</div>
                    ${
                      friend.nickname
                        ? `<div class="friend-username">(${friend.username})</div>`
                        : ""
                    }
                    <div class="friend-actions">
                        <button class="btn btn-secondary btn-sm">Apelido</button>
                        <button class="btn btn-danger btn-sm">Remover</button>
                    </div>
                `;
        card
          .querySelector(".btn-secondary")
          .addEventListener("click", () => handleSetNickname(friend._id));
        card
          .querySelector(".btn-danger")
          .addEventListener("click", () => handleRemoveFriend(friend._id));
        card.addEventListener("click", () => openChat(friend));
        friendsContainer.appendChild(card);
      });
    } catch (error) {
      friendsContainer.innerHTML = `<p class="error-text">${error.message}</p>`;
    }
  }

  async function renderFriendRequests() {
    try {
      const requests = await apiGetFriendRequests();
      friendRequestsContainer.innerHTML = "";
      if (requests.length === 0) {
        friendRequestsContainer.innerHTML =
          "<p>Nenhum pedido de amizade pendente.</p>";
        return;
      }

      const ul = document.createElement("ul");
      requests.forEach((request) => {
        const li = document.createElement("li");
        li.innerHTML = `
                    <span>${request.requester.username}</span>
                    <div>
                        <button class="btn btn-success btn-sm" data-id="${request._id}">Aceitar</button>
                        <button class="btn btn-danger btn-sm" data-id="${request._id}">Recusar</button>
                    </div>
                `;
        li.querySelector(".btn-success").addEventListener("click", () =>
          handleAcceptFriendRequest(request._id)
        );
        li.querySelector(".btn-danger").addEventListener("click", () =>
          handleDeclineFriendRequest(request._id)
        );
        ul.appendChild(li);
      });
      friendRequestsContainer.appendChild(ul);
    } catch (error) {
      friendRequestsContainer.innerHTML = `<p class="error-text">${error.message}</p>`;
    }
  }

  async function handleAcceptFriendRequest(requestId) {
    try {
      await apiAcceptFriendRequest(requestId);
      showNotification("Pedido de amizade aceito!", "success");
      renderFriendsList();
      renderFriendRequests();
    } catch (error) {
      showNotification(`Erro ao aceitar pedido: ${error.message}`, "error");
    }
  }

  async function handleDeclineFriendRequest(requestId) {
    try {
      await apiDeclineFriendRequest(requestId);
      showNotification("Pedido de amizade recusado.", "info");
      renderFriendRequests();
    } catch (error) {
      showNotification(`Erro ao recusar pedido: ${error.message}`, "error");
    }
  }

  async function renderSharedVehicles() {
    try {
      const vehicles = await apiGetSharedVehicles();
      renderVehicleList(vehicles, sharedVehiclesDisplay, false, true);
    } catch (error) {
      sharedVehiclesDisplay.innerHTML = `<p class="error-text">${error.message}</p>`;
    }
  }

  async function handleAddFriend(event) {
    event.preventDefault();
    const usernameInput = getElemById("friend-username");
    const username = usernameInput.value.trim();

    if (!username) {
      showNotification("Digite o nome de usuário do amigo.", "warning");
      return;
    }

    try {
      // We need an endpoint to find a user by username first.
      // This is not implemented yet, so I will assume one exists for now.
      // I will create it later.
      const user = await apiGetUserByUsername(username);
      if (!user) {
        showNotification("Usuário não encontrado.", "error");
        return;
      }

      await apiSendFriendRequest(user._id);
      showNotification(
        `Pedido de amizade enviado para ${username}.`,
        "success"
      );
      usernameInput.value = "";
    } catch (error) {}
  }

  async function handleRemoveFriend(friendId) {
    showConfirmation("Tem certeza que quer remover este amigo?", async () => {
      try {
        await apiRemoveFriend(friendId);
        showNotification("Amigo removido com sucesso.", "info");
        renderFriendsList();
      } catch (error) {
        console.log(error);
      }
    });
  }

  async function handleSetNickname(friendId) {
    const nickname = prompt("Digite o novo apelido:");
    if (nickname === null) return; // User cancelled

    try {
      await apiUpdateNickname(friendId, nickname);
      showNotification("Apelido atualizado com sucesso!", "success");
      renderFriendsList();
    } catch (error) {
      showNotification(`Erro ao atualizar apelido: ${error.message}`, "error");
    }
  }

  function handleRemoveVehicle() {
    if (!selectedVehicle || isPublicGarageView) return;
    const vehicleToRemove = selectedVehicle;
    const vehicleName = `${vehicleToRemove.make} ${vehicleToRemove.model}`;

    showConfirmation(
      `Remover ${vehicleName}? Esta ação é irreversível.`,
      async () => {
        try {
          await garage.removeVehicle(vehicleToRemove.id);
          showNotification(`${vehicleName} removido com sucesso.`, "info");
          selectVehicle(null);
          renderGarageList();
          updateAllRelevantData();
        } catch (error) {
          showNotification(
            `Erro ao remover ${vehicleName}: ${error.message}`,
            "error"
          );
        }
      }
    );
  }

  async function handleVehicleAction(action, args = []) {
    if (!selectedVehicle || isPublicGarageView) return;

    const originalState = selectedVehicle.toJSON();
    const actionResult = selectedVehicle[action](...args);
    if (!actionResult) return;

    const wrapper = getCurrentDetailsWrapper();
    if (wrapper) populateDetailsPanelContent(wrapper, selectedVehicle, false);
    updateVehicleCardStatus(
      garageDisplay.querySelector(
        `.vehicle-card[data-id="${selectedVehicle.id}"]`
      ),
      selectedVehicle
    );

    try {
      const updatedData = await apiUpdateVehicle(
        selectedVehicle.id,
        selectedVehicle.toJSON()
      );
      const index = garage.vehicles.findIndex((v) => v.id === updatedData.id);
      if (index > -1) garage.vehicles[index] = reconstructVehicle(updatedData);
      console.log(`[API Sync] Action '${action}' successfully synced.`);
    } catch (error) {
      console.error(
        `[API Sync] Failed to sync action '${action}'. Reverting UI.`,
        error
      );
      showNotification(
        `Erro de sincronização: ${error.message}. Restaurando estado.`,
        "error"
      );

      selectedVehicle = reconstructVehicle(originalState);
      const index = garage.vehicles.findIndex((v) => v.id === originalState.id);
      if (index > -1) garage.vehicles[index] = selectedVehicle;

      if (wrapper) populateDetailsPanelContent(wrapper, selectedVehicle, false);
      updateVehicleCardStatus(
        garageDisplay.querySelector(
          `.vehicle-card[data-id="${selectedVehicle.id}"]`
        ),
        selectedVehicle
      );
    }
  }

  async function handleScheduleMaintenance(event) {
    event.preventDefault();
    if (!selectedVehicle || isPublicGarageView) return;

    const form = event.target;
    const dateVal = form.querySelector(".maint-date").value;
    const typeVal = form.querySelector(".maint-type").value.trim();
    const costVal = form.querySelector(".maint-cost").value;
    const descVal = form.querySelector(".maint-desc").value.trim();

    try {
      const newMaint = new Maintenance(
        dateVal,
        typeVal,
        parseFloat(costVal),
        descVal
      );
      if (!newMaint.isValid())
        throw new Error("Dados de manutenção inválidos.");

      const updatedVehicle = await apiAddMaintenance(
        selectedVehicle.id,
        newMaint.toJSON()
      );

      const index = garage.vehicles.findIndex(
        (v) => v.id === updatedVehicle.id
      );
      if (index > -1) {
        garage.vehicles[index] = reconstructVehicle(updatedVehicle);
        selectedVehicle = garage.vehicles[index];
      }

      form.reset();
      populateDetailsPanelContent(
        getCurrentDetailsWrapper(),
        selectedVehicle,
        false
      );
      showNotification(`Manutenção "${typeVal}" registrada.`, "success");
      updateAllRelevantData();
    } catch (error) {
      console.error("[Event ScheduleMaint] Error:", error);
      showNotification(
        `Erro ao registrar manutenção: ${error.message}`,
        "error"
      );
    }
  }

  function handleDeleteMaintenance(maintId) {
    if (!selectedVehicle || !maintId) return;

    const maintenance = selectedVehicle.maintenanceHistory.find(
      (m) => m.id === maintId
    );
    if (!maintenance) return;

    showConfirmation(`Excluir o registro "${maintenance.type}"?`, async () => {
      try {
        await apiDeleteMaintenance(selectedVehicle.id, maintId);
        const vIndex = garage.vehicles.findIndex(
          (v) => v.id === selectedVehicle.id
        );
        if (vIndex > -1) {
          const mIndex = garage.vehicles[vIndex].maintenanceHistory.findIndex(
            (m) => m.id === maintId
          );
          if (mIndex > -1) {
            garage.vehicles[vIndex].maintenanceHistory.splice(mIndex, 1);
          }
        }
        showNotification("Registro de manutenção excluído.", "info");
        populateDetailsPanelContent(
          getCurrentDetailsWrapper(),
          selectedVehicle,
          false
        );
        updateAllRelevantData();
      } catch (error) {
        showNotification(`Erro ao excluir: ${error.message}`, "error");
      }
    });
  }

  function openMaintenanceEditModal(maintId) {
    if (!maintEditModalBackdrop || !maintEditForm) return;

    const maintenance = selectedVehicle.maintenanceHistory.find(
      (m) => m.id === maintId
    );
    if (!maintenance) return;

    maintEditForm.querySelector("#edit-maint-id").value = maintenance.id;
    const dateForInput = new Date(
      maintenance.date.getTime() - maintenance.date.getTimezoneOffset() * 60000
    )
      .toISOString()
      .slice(0, 16);
    maintEditForm.querySelector("#edit-maint-date").value = dateForInput;
    maintEditForm.querySelector("#edit-maint-type").value = maintenance.type;
    maintEditForm.querySelector("#edit-maint-cost").value = maintenance.cost;
    maintEditForm.querySelector("#edit-maint-desc").value =
      maintenance.description;

    maintEditModalBackdrop.style.display = "flex";
    requestAnimationFrame(() =>
      maintEditModalBackdrop.classList.add("visible")
    );
  }

  function closeMaintenanceEditModal() {
    if (!maintEditModalBackdrop) return;
    maintEditModalBackdrop.classList.remove("visible");
    const onTransitionEnd = () => {
      maintEditModalBackdrop.style.display = "none";
      maintEditForm.reset();
    };
    maintEditModalBackdrop.addEventListener("transitionend", onTransitionEnd, {
      once: true,
    });
  }

  async function handleUpdateMaintenance(event) {
    event.preventDefault();
    const maintId = maintEditForm.querySelector("#edit-maint-id").value;
    const updatedData = {
      date: maintEditForm.querySelector("#edit-maint-date").value,
      type: maintEditForm.querySelector("#edit-maint-type").value,
      cost: parseFloat(maintEditForm.querySelector("#edit-maint-cost").value),
      description: maintEditForm.querySelector("#edit-maint-desc").value,
    };

    try {
      await apiUpdateMaintenance(selectedVehicle.id, maintId, updatedData);

      const vIndex = garage.vehicles.findIndex(
        (v) => v.id === selectedVehicle.id
      );
      if (vIndex > -1) {
        const mIndex = garage.vehicles[vIndex].maintenanceHistory.findIndex(
          (m) => m.id === maintId
        );
        if (mIndex > -1) {
          garage.vehicles[vIndex].maintenanceHistory[mIndex] =
            Maintenance.fromJSON({ ...updatedData, id: maintId });
          garage.vehicles[vIndex].sortMaintenanceHistory();
        }
      }

      closeMaintenanceEditModal();
      showNotification("Manutenção atualizada!", "success");
      populateDetailsPanelContent(
        getCurrentDetailsWrapper(),
        selectedVehicle,
        false
      );
      updateAllRelevantData();
    } catch (error) {
      showNotification(`Erro ao atualizar: ${error.message}`, "error");
    }
  }

  async function handleTogglePrivacy(event) {
    if (!selectedVehicle || isPublicGarageView) return;
    const checkbox = event.target;
    const isChecked = checkbox.checked;
    const statusSpan = checkbox
      .closest(".privacy-control")
      .querySelector(".privacy-status");
    const card = garageDisplay.querySelector(
      `.vehicle-card[data-id="${selectedVehicle.id}"]`
    );

    checkbox.disabled = true;

    try {
      const result = await apiToggleVehiclePrivacy(
        selectedVehicle.id,
        isChecked
      );
      selectedVehicle.isPublic = result.isPublic;
      statusSpan.textContent = result.isPublic ? "Público" : "Privado";
      if (card) {
        const privacyIcon = card.querySelector(".privacy-icon");
        if (privacyIcon)
          privacyIcon.textContent = result.isPublic ? "🌍" : "🔒";
      }
      showNotification(
        `Visibilidade de ${selectedVehicle.model} alterada para ${
          result.isPublic ? "Público" : "Privado"
        }.`,
        "success"
      );
    } catch (error) {
      showNotification(
        `Erro ao alterar visibilidade: ${error.message}`,
        "error"
      );
      checkbox.checked = !isChecked;
    } finally {
      checkbox.disabled = false;
    }
  }

  function getCurrentDetailsWrapper() {
    return detailsContentArea?.querySelector(
      ".vehicle-details-content-wrapper"
    );
  }

  function setActiveTab(tabId, isInitialLoad = false) {
    if (
      !tabId ||
      (tabId === currentActiveTab && !isInitialLoad) ||
      isContentSwapping
    )
      return;

    if (selectedVehicle) selectVehicle(null);

    currentActiveTab = tabId;
    navLinks.forEach((link) =>
      link.classList.toggle("active", link.dataset.tabTarget === tabId)
    );
    tabContents.forEach((content) => {
      const isActive = content.dataset.tabContent === tabId;
      if (isActive) {
        content.style.display = "block";
        requestAnimationFrame(() => {
          content.classList.add("active-tab");
          triggerRenderForTab(tabId, isInitialLoad);
        });
      } else {
        content.classList.remove("active-tab");
        const hide = () => {
          if (!content.classList.contains("active-tab"))
            content.style.display = "none";
        };
        content.addEventListener("transitionend", hide, { once: true });
        setTimeout(hide, 500);
      }
    });
    if (!isInitialLoad) updateUrlHash(tabId);
  }

  function getTabFromHash() {
    return window.location.hash.substring(1);
  }
  function updateUrlHash(tabId) {
    try {
      if (window.history.pushState)
        window.history.pushState(null, "", `#${tabId}`);
      else window.location.hash = tabId;
    } catch (e) {
      window.location.hash = tabId;
    }
  }
  function handleHashChange() {
    const tabId = getTabFromHash() || "dashboard";
    if (tabId !== currentActiveTab) setActiveTab(tabId);
  }

  async function triggerRenderForTab(tabId, skipAnimation = false) {
    const tabElement = getElemById(`tab-${tabId}`);
    if (!tabElement) return;
    const sections = tabElement.querySelectorAll(
      ".card-section:not(.sticky-details), .stat-card"
    );
    applyStaggeredAnimation(sections, "visible", 0.08, skipAnimation);

    switch (tabId) {
      case "dashboard":
        renderDashboard();
        break;
      case "garage":
        renderFutureAppointmentsList();
        break;
      case "public-garage":
        await renderPublicGarageList();
        break;
      case "stats":
        renderStats();
        break;
      case "friends":
        renderFriendsList();
        renderFriendRequests();
        break;
      case "shared-vehicles":
        renderSharedVehicles();
        break;
      case "profile":
        const userInfo = getUserInfo();
        if (profileForm && userInfo) {
          profileForm.querySelector("#profile-email").value = userInfo.email;
          profileForm.querySelector("#profile-username").value =
            userInfo.username;
        }
        break;
    }
  }

  function applyStaggeredAnimation(
    elements,
    triggerClass,
    baseDelay = 0.06,
    skip = false
  ) {
    elements.forEach((el, index) => {
      el.style.transitionDelay = skip ? "0s" : `${index * baseDelay}s`;
      requestAnimationFrame(() => {
        el.classList.add(triggerClass);
        const cleanup = () => (el.style.transitionDelay = "");
        el.addEventListener("transitionend", cleanup, { once: true });
        setTimeout(cleanup, 1200 + index * baseDelay * 1000);
      });
    });
  }

  function updateAllRelevantData() {
    renderDashboard();
    renderStats();
    renderFutureAppointmentsList();
  }

  function renderDashboard() {
    if (!garage || !getUserInfo()) {
      updateStatElement("totalVehicles", "-");
      updateStatElement("vehicleTypes", "Faça login para ver");
      updateStatElement("typeDetails", "");
      updateStatElement("nextAppointment", "N/A");
      updateStatElement("appointmentDetails", "");
      updateStatElement("totalMaintCostDash", "R$ --,--");
      return;
    }
    const totalVehicles = garage.vehicles.length;
    const typeCounts = countVehicleTypes();
    const appointments = garage.getAllFutureAppointments();
    const totalCost = calculateTotalMaintenanceCost();
    updateStatElement("totalVehicles", totalVehicles);
    const typeSummary = `${typeCounts.Car || 0}C / ${
      typeCounts.SportsCar || 0
    }S / ${typeCounts.Truck || 0}T`;
    updateStatElement("vehicleTypes", typeSummary);
    updateStatElement(
      "typeDetails",
      `Carros: ${typeCounts.Car || 0} | Esportivos: ${
        typeCounts.SportsCar || 0
      } | Caminhões: ${typeCounts.Truck || 0}`
    );
    if (appointments.length > 0) {
      const nextApp = appointments[0];
      let fDate = new Date(nextApp.maintenance.date).toLocaleString("pt-BR", {
        day: "2-digit",
        month: "short",
        hour: "2-digit",
        minute: "2-digit",
      });
      updateStatElement("nextAppointment", fDate);
      updateStatElement(
        "appointmentDetails",
        `${nextApp.vehicleInfo.split("(")[0].trim()} - ${
          nextApp.maintenance.type
        }`
      );
    } else {
      updateStatElement("nextAppointment", "Nenhum");
      updateStatElement("appointmentDetails", "Sem agendamentos futuros.");
    }
    updateStatElement(
      "totalMaintCostDash",
      totalCost.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })
    );
  }

  function renderStats() {
    if (!garage || !getUserInfo()) {
      updateStatElement("totalCost", "R$ --,--");
      updateStatElement("avgCost", "R$ --,--");
      updateStatElement("mostExpensiveVehicle", "N/A");
      document.querySelector('[data-stat="mostExpensiveCost"]').textContent =
        "";
      updateTypeDistributionChart({ Car: 0, SportsCar: 0, Truck: 0 });
      return;
    }
    const numVehicles = garage.vehicles.length;
    const totalCost = calculateTotalMaintenanceCost();
    const avgCost = numVehicles > 0 ? totalCost / numVehicles : 0;
    const vehicleCosts = calculateMaintenanceCostPerVehicle();
    const typeCounts = countVehicleTypes();
    let mostExpensiveInfo = { name: "N/A", cost: -1 };
    if (numVehicles > 0) {
      const mostExpensive = Object.values(vehicleCosts).sort(
        (a, b) => b.cost - a.cost
      )[0];
      if (mostExpensive && mostExpensive.cost > 0)
        mostExpensiveInfo = mostExpensive;
    }
    updateStatElement(
      "totalCost",
      totalCost.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })
    );
    updateStatElement(
      "avgCost",
      avgCost.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })
    );
    updateStatElement("mostExpensiveVehicle", mostExpensiveInfo.name);
    const costDetailEl = document.querySelector(
      '[data-stat="mostExpensiveCost"]'
    );
    if (costDetailEl)
      costDetailEl.textContent =
        mostExpensiveInfo.cost >= 0
          ? `(${mostExpensiveInfo.cost.toLocaleString("pt-BR", {
              style: "currency",
              currency: "BRL",
            })})`
          : "";
    updateTypeDistributionChart(typeCounts);
  }

  function calculateTotalMaintenanceCost() {
    return garage.vehicles.reduce(
      (sum, v) =>
        sum + v.maintenanceHistory.reduce((mSum, m) => mSum + (m.cost || 0), 0),
      0
    );
  }
  function calculateMaintenanceCostPerVehicle() {
    const costs = {};
    garage.vehicles.forEach((v) => {
      costs[v.id] = {
        name: `${v.make} ${v.model}`,
        cost: v.maintenanceHistory.reduce((mSum, m) => mSum + (m.cost || 0), 0),
      };
    });
    return costs;
  }
  function countVehicleTypes() {
    const counts = { Car: 0, SportsCar: 0, Truck: 0 };
    garage.vehicles.forEach((v) => {
      if (counts.hasOwnProperty(v._type)) counts[v._type]++;
    });
    return counts;
  }
  function updateStatElement(statName, value) {
    document
      .querySelectorAll(`[data-stat="${statName}"]`)
      .forEach((el) => (el.textContent = value != null ? String(value) : "-"));
  }
  function updateTypeDistributionChart(typeCounts) {
    const chart = document.querySelector(".type-bar-chart");
    if (!chart) return;
    const maxCount = Math.max(...Object.values(typeCounts), 1);
    for (const type in typeCounts) {
      const barItem = chart.querySelector(`.bar-item[data-type="${type}"]`);
      if (barItem) {
        const perc = (typeCounts[type] / maxCount) * 100;
        barItem.querySelector(".bar").style.height = `${perc}%`;
        barItem.querySelector(".bar-count").textContent = typeCounts[type];
      }
    }
  }

  function renderGarageList() {
    renderVehicleList(garage.vehicles, garageDisplay, false);
  }
  async function renderPublicGarageList() {
    publicGarageDisplay.innerHTML =
      '<p class="placeholder-text">Carregando...</p>';
    await garage.loadPublicVehicles();
    renderVehicleList(garage.publicVehicles, publicGarageDisplay, true);
  }

  function renderVehicleList(
    vehicleList,
    displayElement,
    isPublic,
    isShared = false
  ) {
    displayElement.innerHTML = "";
    if (vehicleList.length === 0) {
      displayElement.innerHTML = `<p class="placeholder-text">${
        isPublic
          ? "Nenhum veículo público no momento."
          : isShared
          ? "Nenhum veículo compartilhado com você."
          : "Sua garagem está vazia."
      }</p>`;
      return;
    }
    const fragment = document.createDocumentFragment();
    vehicleList.forEach((v) => {
      if(!v) return;
      const card = createVehicleCard(v, isPublic, isShared);
      if (selectedVehicle?.id === v.id) card.classList.add("selected");
      fragment.appendChild(card);
    });
    displayElement.appendChild(fragment);
    applyStaggeredAnimation(
      displayElement.querySelectorAll(".vehicle-card"),
      "animate-in",
      0.05,
      false
    );
  }

  function createVehicleCard(vehicle, isPublic, isShared = false) {
    const card = document.createElement("div");
    card.className = "vehicle-card";
    card.dataset.id = vehicle.id;
    card.setAttribute("role", "button");
    card.setAttribute("tabindex", "0");

    const ownerInfo =
      isPublic || isShared
        ? `<p class="owner-info">Dono: ${
            vehicle.owner?.username || "Anônimo"
          }</p>`
        : "";
    const privacyIcon =
      !isPublic && !isShared
        ? `<span class="privacy-icon">${vehicle.isPublic ? "🌍" : "🔒"}</span>`
        : "";

    const vehicleImageHtml = vehicle.imageUrl
      ? `<img src="${vehicle.imageUrl}" alt="${vehicle.make} ${vehicle.model}" class="vehicle-card-image">`
      : '';

    card.innerHTML = `
      <div class="card-header-content">
        ${vehicleImageHtml}
        <div>
          <h4>${vehicle.make} ${vehicle.model}</h4>
          <p>${vehicle.year} - ${vehicle._type.replace(/([A-Z])/g, " $1").trim()}</p>
          ${ownerInfo}
        </div>
      </div>
      <div class="card-specific-info"></div>
      <div class="card-footer">
        <span class="status-icon"></span>${privacyIcon}
      </div>
    `;

    updateVehicleCardStatus(card, vehicle);
    card.addEventListener("click", () =>
      selectVehicle(vehicle.id, isPublic, isShared)
    );
    card.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        card.click();
      }
    });
    return card;
  }

  function updateVehicleCardStatus(card, vehicle) {
    if (!card || !vehicle) return;
    const statusIcon = card.querySelector(".status-icon");
    statusIcon.className = "status-icon"; // Reset
    card.classList.remove("pulse-turbo", "pulse-load");
    switch (vehicle.status) {
      case "on":
        statusIcon.classList.add("on");
        break;
      case "moving":
        statusIcon.classList.add("moving");
        break;
      default:
        statusIcon.classList.add("off");
        break;
    }
    const specificInfo = card.querySelector(".card-specific-info");
    if (vehicle instanceof SportsCar) {
      specificInfo.innerHTML = `<p class="info-turbo">Turbo: ${
        vehicle.turboOn ? "ON" : "OFF"
      }</p>`;
      if (vehicle.turboOn) card.classList.add("pulse-turbo");
    } else if (vehicle instanceof Truck) {
      specificInfo.innerHTML = `<p class="info-load">Carga: ${vehicle.currentLoad}/${vehicle.maxLoad} kg</p>`;
      if (vehicle.currentLoad > 0) card.classList.add("pulse-load");
    } else {
      specificInfo.innerHTML = "";
    }
  }

  function selectVehicle(vehicleId, isPublic = false, isShared = false) {
    document
      .querySelectorAll(".vehicle-card.selected")
      .forEach((c) => c.classList.remove("selected"));

    isPublicGarageView = isPublic;

    if (vehicleId) {
      selectedVehicle = garage.findVehicle(vehicleId, isPublic || isShared);
      const display = isPublic
        ? publicGarageDisplay
        : isShared
        ? sharedVehiclesDisplay
        : garageDisplay;
      display
        .querySelector(`.vehicle-card[data-id="${vehicleId}"]`)
        ?.classList.add("selected");
    } else {
      selectedVehicle = null;
    }
    renderDetailsAreaContent(selectedVehicle, isPublic, isShared);
  }

  async function renderDetailsAreaContent(vehicle, isPublic, isShared = false) {
    isContentSwapping = true;
    detailsContentArea.innerHTML = "";
    if (vehicle) {
      const detailsWrapper =
        vehicleDetailsTemplate.content.firstElementChild.cloneNode(true);
      populateDetailsPanelContent(detailsWrapper, vehicle, isPublic, isShared);
      detailsContentArea.appendChild(detailsWrapper);
      if (!isPublic && !isShared) {
        setupDetailsPanelEventListeners(detailsWrapper);
      }

      const checkbox = document.getElementById("privacy-toggle");
      const result = await getVehiclePrivacy(vehicle.id);
      if (!result.isPublic) {
        checkbox.checked = false;
      } else {
        checkbox.checked = result.isPublic;
      }
    } else {
      detailsContentArea.innerHTML = `<div class="details-placeholder-content"><span class="placeholder-icon" aria-hidden="true">👈</span><p>Selecione um veículo para ver os detalhes.</p></div>`;
    }
    setTimeout(() => {
      isContentSwapping = false;
    }, 50);
  }

  function populateDetailsPanelContent(
    wrapper,
    vehicle,
    isPublic,
    isShared = false
  ) {
    const setTxt = (selector, text) => {
      const el = wrapper.querySelector(selector);
      if (el) el.textContent = text;
    };
    const setHTML = (selector, html) => {
      const el = wrapper.querySelector(selector);
      if (el) el.innerHTML = html;
    };
    const setDisp = (selector, display) => {
      const el = wrapper.querySelector(selector);
      if (el) el.style.display = display;
    };
    const setDisab = (selector, isDisabled) => {
      const el = wrapper.querySelector(selector);
      if (el) el.disabled = isDisabled;
    };

    setTxt(".details-title", `${vehicle.make} ${vehicle.model}`);
    
    const vehicleInfoBlock = wrapper.querySelector(".vehicle-info");
    if (vehicleInfoBlock) {
        vehicleInfoBlock.innerHTML = ''; // Clear existing content

        if (vehicle.imageUrl) {
            const imgElement = document.createElement('img');
            imgElement.src = vehicle.imageUrl;
            imgElement.alt = `Imagem de ${vehicle.make} ${vehicle.model}`;
            imgElement.classList.add('vehicle-detail-image');
            vehicleInfoBlock.appendChild(imgElement);
        }

        let infoHTML = `<strong>Ano:</strong> ${
            vehicle.year
        }<br><strong>Tipo:</strong> ${vehicle._type
            .replace(/([A-Z])/g, " $1")
            .trim()}`;
        if (isPublic || isShared) {
            infoHTML += `<br><strong>Dono:</strong> ${
                vehicle.owner?.username || "Anônimo"
            }`;
        } else {
            infoHTML += `<br><strong title="ID: ${
                vehicle.id
            }">ID:</strong> <span class="code">...${vehicle.id.slice(-6)}</span>`;
        }
        
        const infoDiv = document.createElement('div');
        infoDiv.innerHTML = infoHTML;
        vehicleInfoBlock.appendChild(infoDiv);
    }

    const isReadOnly = isPublic || isShared;

    const interactiveSelectors = [
      ".vehicle-controls",
      ".truck-load-controls",
      ".settings-section",
      ".maintenance-area",
      ".btn-remove-vehicle",
      ".trip-planner-section",
      ".api-details-section",
    ];
    interactiveSelectors.forEach((sel) => {
      const el = wrapper.querySelector(sel);
      if (el) el.style.display = isReadOnly ? "none" : "";
    });

    if (isShared) {
      // Show read-only details for shared vehicles
      setDisp(".api-details-section", "");
      setDisp(".maintenance-area", "");
      setDisp(".btn-fetch-api-details", "none");
      setDisp(".btn-edit-api-details", "none");
      setDisp(".api-details-content-view", "block");
      wrapper.querySelector(".schedule-maintenance-form").style.display =
        "none";
    }

    setHTML(
      ".vehicle-status-indicators",
      `
            <span class="status-tag status-indicator">Status: ${
              vehicle.status
            }</span>
            <span class="status-tag speed-indicator">Veloc: ${vehicle.speed.toFixed(
              0
            )} km/h</span>
            ${
              vehicle instanceof SportsCar
                ? `<span class="status-tag turbo-indicator status-tag-turbo">Turbo: ${
                    vehicle.turboOn ? "ON" : "OFF"
                  }</span>`
                : ""
            }
            ${
              vehicle instanceof Truck
                ? `<span class="status-tag load-indicator status-tag-load">Carga: ${vehicle.currentLoad}/${vehicle.maxLoad} kg</span>`
                : ""
            }
        `
    );

    if (!isReadOnly) {
      const privacyToggle = wrapper.querySelector(".privacy-toggle-checkbox");
      const privacyStatus = wrapper.querySelector(".privacy-status");
      privacyToggle.checked = vehicle.isPublic;
      privacyStatus.textContent = vehicle.isPublic ? "Público" : "Privado";

      setDisp(
        ".btn-toggle-turbo",
        vehicle instanceof SportsCar ? "inline-flex" : "none"
      );
      setDisp(
        ".truck-load-controls",
        vehicle instanceof Truck ? "flex" : "none"
      );

      setDisab(".btn-start", vehicle.status !== "off");
      setDisab(".btn-stop", vehicle.status === "off" || vehicle.speed > 0);
      setDisab(".btn-accelerate", vehicle.status === "off");
      setDisab(".btn-brake", vehicle.status !== "moving");
    }

    populateApiDetailsView(wrapper, vehicle);
    renderMaintenanceHistory(
      wrapper.querySelector(".maintenance-list"),
      vehicle,
      isReadOnly
    );
  }

  function renderMaintenanceHistory(listElement, vehicle, isReadOnly = false) {
    listElement.innerHTML = "";
    if (
      !vehicle.maintenanceHistory ||
      vehicle.maintenanceHistory.length === 0
    ) {
      listElement.innerHTML =
        '<li class="placeholder-text">Nenhum histórico.</li>';
      return;
    }
    vehicle.maintenanceHistory.forEach((m) => {
      const li = document.createElement("li");
      li.dataset.maintId = m.id;
      li.innerHTML = `
                <span class="maint-info">${m.format()}</span>
                ${
                  !isReadOnly
                    ? `
                <div class="maint-actions">
                    <button class="btn-edit-maint" title="Editar">✏️</button>
                    <button class="btn-delete-maint" title="Excluir">🗑️</button>
                </div>
                `
                    : ""
                }
            `;
      if (!isReadOnly) {
        li.querySelector(".btn-edit-maint").addEventListener("click", () =>
          openMaintenanceEditModal(m.id)
        );
        li.querySelector(".btn-delete-maint").addEventListener("click", () =>
          handleDeleteMaintenance(m.id)
        );
      }
      listElement.appendChild(li);
    });
  }

  function renderFutureAppointmentsList() {
    if (!futureAppointmentsList) return;
    futureAppointmentsList.innerHTML = "";
    const appointments = garage.getAllFutureAppointments();
    if (appointments.length === 0) {
      futureAppointmentsList.innerHTML =
        '<li class="placeholder-text">Sem agendamentos.</li>';
      return;
    }
    appointments.forEach((app) => {
      const li = document.createElement("li");
      li.dataset.vehicleId = app.vehicleId;
      li.innerHTML = `<strong>${new Date(app.maintenance.date).toLocaleString(
        "pt-BR",
        { day: "2-digit", month: "short" }
      )}</strong>: ${app.vehicleInfo} - ${app.maintenance.type}`;
      li.addEventListener("click", handleAppointmentClick);
      futureAppointmentsList.appendChild(li);
    });
  }

  function handleAppointmentClick(event) {
    const vehicleId = event.currentTarget.dataset.vehicleId;
    if (vehicleId) {
      setActiveTab("garage");
      selectVehicle(vehicleId);
      detailsContentArea?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    }
  }

  function setupDetailsPanelEventListeners(wrapper) {
    const addListener = (sel, evt, hnd) =>
      wrapper.querySelector(sel)?.addEventListener(evt, hnd);

    addListener(".close-button", "click", () => selectVehicle(null));
    addListener(".btn-remove-vehicle", "click", handleRemoveVehicle);
    addListener(".privacy-toggle-checkbox", "change", handleTogglePrivacy);
    addListener(".btn-share-vehicle", "click", handleShareVehicle);

    addListener(".btn-start", "click", () => handleVehicleAction("start"));
    addListener(".btn-stop", "click", () => handleVehicleAction("stop"));
    addListener(".btn-accelerate", "click", () =>
      handleVehicleAction("accelerate")
    );
    addListener(".btn-brake", "click", () => handleVehicleAction("brake"));
    addListener(".btn-toggle-turbo", "click", () =>
      handleVehicleAction("toggleTurbo")
    );

    const cargoInput = wrapper.querySelector(".cargo-amount");
    addListener(".btn-load-cargo", "click", () =>
      handleVehicleAction("loadCargo", [cargoInput?.value])
    );
    addListener(".btn-unload-cargo", "click", () =>
      handleVehicleAction("unloadCargo", [cargoInput?.value])
    );

    addListener(
      ".schedule-maintenance-form",
      "submit",
      handleScheduleMaintenance
    );
    addListener(".trip-form", "submit", handleCalculateRouteAndWeather);

    wrapper
      .querySelectorAll(".trip-highlight-controls input")
      .forEach((el) => el.addEventListener("change", handleHighlightToggle));

    // Listeners for API Details Section
    addListener(".btn-fetch-api-details", "click", () =>
      toggleApiDetailsView(wrapper, true)
    );
    addListener(".btn-edit-api-details", "click", () =>
      toggleApiDetailsEditMode(wrapper, true)
    );
    addListener(".btn-cancel-edit-api-details", "click", () =>
      toggleApiDetailsEditMode(wrapper, false)
    );
    addListener(".api-details-edit-form", "submit", handleSaveVehicleDetails);

    const editVehicleImageInput = wrapper.querySelector("#edit-vehicle-image");
    const editVehicleImagePreview = wrapper.querySelector("#edit-vehicle-image-preview");

    if (editVehicleImageInput && editVehicleImagePreview) {
        editVehicleImageInput.addEventListener("change", function() {
            if (this.files && this.files[0]) {
                const reader = new FileReader();
                reader.onload = function(e) {
                    editVehicleImagePreview.src = e.target.result;
                    editVehicleImagePreview.style.display = "block";
                };
                reader.readAsDataURL(this.files[0]);
            } else {
                editVehicleImagePreview.src = "#";
                editVehicleImagePreview.style.display = "none";
            }
        });

        // Display existing image if available
        if (selectedVehicle.imageUrl) {
            editVehicleImagePreview.src = selectedVehicle.imageUrl;
            editVehicleImagePreview.style.display = "block";
        }
    }
  }

  async function handleShareVehicle() {
    if (!selectedVehicle) return;

    shareModalBackdrop.style.display = "flex";
    requestAnimationFrame(() => shareModalBackdrop.classList.add("visible"));

    try {
      const friends = await apiGetFriends();
      renderShareFriendList(friends);
    } catch (error) {
      showNotification(`Erro ao buscar amigos: ${error.message}`, "error");
    }
  }

  function closeShareModal() {
    shareModalBackdrop.classList.remove("visible");
    const onTransitionEnd = () => {
      shareModalBackdrop.style.display = "none";
      shareFriendSearch.value = "";
    };
    shareModalBackdrop.addEventListener("transitionend", onTransitionEnd, {
      once: true,
    });
  }

  async function handleFriendSearch() {
    const searchTerm = shareFriendSearch.value.toLowerCase();
    const friends = await apiGetFriends();
    const filteredFriends = friends.filter((friend) =>
      friend.username.toLowerCase().includes(searchTerm)
    );
    renderShareFriendList(filteredFriends);
  }

  function renderShareFriendList(friends) {
    shareFriendList.innerHTML = "";
    if (friends.length === 0) {
      shareFriendList.innerHTML =
        '<li class="placeholder-text">Nenhum amigo encontrado.</li>';
      return;
    }

    friends.forEach((friend) => {
      const li = document.createElement("li");
      li.innerHTML = `
                <span>${friend.username}</span>
                <button class="btn btn-primary btn-sm">Compartilhar</button>
            `;
      li.querySelector("button").addEventListener("click", async () => {
        try {
          await apiShareVehicle(selectedVehicle.id, friend._id);
          showNotification(
            `Veículo compartilhado com ${friend.username}.`,
            "success"
          );
          closeShareModal();
        } catch (error) {
          showNotification(`Erro ao compartilhar: ${error.message}`, "error");
        }
      });
      shareFriendList.appendChild(li);
    });
  }

  // --- API DETAILS LOGIC ---
  function toggleApiDetailsView(wrapper, show) {
    const view = wrapper.querySelector(".api-details-content-view");
    const button = wrapper.querySelector(".btn-fetch-api-details");
    if (show) {
      view.style.display = "block";
      button.style.display = "none";
      wrapper.querySelector(".btn-edit-api-details").style.display =
        "inline-flex";
    }
  }

  function toggleApiDetailsEditMode(wrapper, isEditing) {
    wrapper.querySelector(".api-details-content-view").style.display = isEditing
      ? "none"
      : "block";
    wrapper.querySelector(".api-details-edit-form").style.display = isEditing
      ? "block"
      : "none";
    wrapper.querySelector(".btn-edit-api-details").style.display = isEditing
      ? "none"
      : "inline-flex";
  }

  function populateApiDetailsView(wrapper, vehicle) {
    const fipeValue = vehicle.valorFipeEstimado
      ? vehicle.valorFipeEstimado.toLocaleString("pt-BR", {
          style: "currency",
          currency: "BRL",
        })
      : "Não informado";
    const recallStatus = `<span class="status-${vehicle.recallPendente}">${
      vehicle.recallPendente ? "Sim" : "Não"
    }</span>`;
    const revisionKm = vehicle.ultimaRevisaoRecomendadaKm
      ? `${vehicle.ultimaRevisaoRecomendadaKm.toLocaleString("pt-BR")} km`
      : "Não informado";
    const tip = vehicle.dicaManutencao || "";

    const contentView = wrapper.querySelector(".api-details-content");
    contentView.innerHTML = `
            <div class="api-details-grid">
                <div class="api-detail-item"><strong>Valor FIPE (Est.):</strong> <span>${fipeValue}</span></div>
                <div class="api-detail-item"><strong>Recall Pendente:</strong> ${recallStatus}</div>
                <div class="api-detail-item"><strong>Próxima Revisão (km):</strong> <span>${revisionKm}</span></div>
            </div>
        `;

    const tipSection = wrapper.querySelector(".maintenance-tip-section");
    const tipContent = wrapper.querySelector(".maintenance-tip-content");
    if (tip) {
      tipContent.textContent = tip;
      tipSection.style.display = "block";
    } else {
      tipSection.style.display = "none";
    }

    // Populate edit form as well
    const editForm = wrapper.querySelector(".api-details-edit-form");
    editForm.querySelector(".edit-fipe-value").value =
      vehicle.valorFipeEstimado || "";
    editForm.querySelector(".edit-revision-km").value =
      vehicle.ultimaRevisaoRecomendadaKm || "";
    editForm.querySelector(".edit-recall-status").value = vehicle.recallPendente
      ? "true"
      : "false";
    editForm.querySelector(".edit-maintenance-tip").value =
      vehicle.dicaManutencao || "";
  }

  async function handleSaveVehicleDetails(event) { // Renamed from handleSaveApiDetails
    event.preventDefault();
    if (!selectedVehicle) return;

    const wrapper = getCurrentDetailsWrapper();
    const form = wrapper.querySelector(".api-details-edit-form"); // This form is for API details, not general vehicle details
    const button = form.querySelector(".btn-save-api-details");

    const editVehicleImageInput = wrapper.querySelector("#edit-vehicle-image");
    const formData = new FormData();

    // Append existing vehicle data (excluding sensitive fields like owner, maintenanceHistory)
    // and new API details data
    formData.append('make', selectedVehicle.make);
    formData.append('model', selectedVehicle.model);
    formData.append('year', selectedVehicle.year);
    formData.append('_type', selectedVehicle._type);
    formData.append('status', selectedVehicle.status);
    formData.append('speed', selectedVehicle.speed);
    if (selectedVehicle._type === 'SportsCar') {
        formData.append('turboOn', selectedVehicle.turboOn);
    }
    if (selectedVehicle._type === 'Truck') {
        formData.append('maxLoad', selectedVehicle.maxLoad);
        formData.append('currentLoad', selectedVehicle.currentLoad);
    }
    formData.append('isPublic', selectedVehicle.isPublic);

    // Append API details data
    formData.append('valorFipeEstimado', form.querySelector(".edit-fipe-value").value || '');
    formData.append('ultimaRevisaoRecomendadaKm', form.querySelector(".edit-revision-km").value || '');
    formData.append('recallPendente', form.querySelector(".edit-recall-status").value);
    formData.append('dicaManutencao', form.querySelector(".edit-maintenance-tip").value.trim());

    // Append image if selected
    if (editVehicleImageInput && editVehicleImageInput.files[0]) {
      formData.append('image', editVehicleImageInput.files[0]);
    } else if (selectedVehicle.imageUrl && !editVehicleImageInput.files[0]) {
        // If there was an image but no new one is selected, keep the old one
        formData.append('imageUrl', selectedVehicle.imageUrl);
    } else if (!selectedVehicle.imageUrl && !editVehicleImageInput.files[0]) {
        // If there was no image and no new one is selected, ensure imageUrl is empty
        formData.append('imageUrl', '');
    }


    setLoadingState(button, true, "Salvando...");
    try {
      const savedVehicle = await apiUpdateVehicle(
        selectedVehicle.id,
        formData,
        null // Let fetch set Content-Type for FormData
      );

      // Update local state
      const index = garage.vehicles.findIndex((v) => v.id === savedVehicle.id);
      if (index > -1) {
        garage.vehicles[index] = reconstructVehicle(savedVehicle);
        selectedVehicle = garage.vehicles[index];
      }

      populateApiDetailsView(wrapper, selectedVehicle);
      toggleApiDetailsEditMode(wrapper, false);
      showNotification("Dados do veículo salvos com sucesso!", "success");
    } catch (error) {
      showNotification(`Erro ao salvar dados do veículo: ${error.message}`, "error");
    } finally {
      setLoadingState(button, false, "Salvar");
    }
  }

  async function handleCalculateRouteAndWeather(event) {
    event.preventDefault();
    if (!selectedVehicle) return;
    const wrapper = getCurrentDetailsWrapper();
    const destInput = wrapper.querySelector(".trip-destination-input");
    const resultsArea = wrapper.querySelector(".trip-results");
    const calcButton = wrapper.querySelector(".btn-calculate-trip");
    const destCity = destInput.value.trim();
    if (!destCity) {
      showNotification("Informe a cidade de chegada.", "warning");
      return;
    }

    setLoadingState(calcButton, true, "Buscando...");
    resultsArea.innerHTML = '<p class="placeholder-text">Buscando clima...</p>';
    try {
      const weatherData = await fetchWeatherForDestination(destCity);
      resultsArea.innerHTML = `<ul class="trip-results-list">
                <li><strong>Destino:</strong> ${weatherData.cityFound}</li>
                <li><strong>Clima:</strong> <span class="weather-description">${
                  weatherData.description
                }</span> <img src="${OPENWEATHERMAP_ICON_URL_PREFIX}${
        weatherData.icon
      }.png" class="weather-icon"></li>
                <li><strong>Temperatura:</strong> ${weatherData.temp.toFixed(
                  1
                )}°C (Sensação: ${weatherData.feelsLike.toFixed(1)}°C)</li>
            </ul>`;
      resultsArea._weatherData = weatherData;
      applyWeatherHighlights(weatherData, resultsArea, wrapper);
    } catch (error) {
      resultsArea.innerHTML = `<p class="error-text">❌ ${error.message}</p>`;
    } finally {
      setLoadingState(calcButton, false, "Calcular Rota e Clima");
    }
  }

  function handleHighlightToggle() {
    const wrapper = getCurrentDetailsWrapper();
    if (!wrapper) return;
    const resultsArea = wrapper.querySelector(".trip-results");
    if (resultsArea && resultsArea._weatherData) {
      applyWeatherHighlights(resultsArea._weatherData, resultsArea, wrapper);
    }
  }

  function applyWeatherHighlights(weatherData, resultsArea, wrapper) {
    const rainCheck = wrapper.querySelector(".trip-highlight-rain");
    const coldCheck = wrapper.querySelector(".trip-highlight-cold");
    const hotCheck = wrapper.querySelector(".trip-highlight-hot");

    resultsArea.classList.remove(
      "highlighted-rain",
      "highlighted-cold",
      "highlighted-hot"
    );

    if (
      rainCheck?.checked &&
      /rain|chuva|drizzle|garoa|tempestade|thunderstorm|shower/i.test(
        weatherData.description
      )
    ) {
      resultsArea.classList.add("highlighted-rain");
    }
    if (
      coldCheck?.checked &&
      weatherData.temp < parseFloat(coldCheck.dataset.threshold)
    ) {
      resultsArea.classList.add("highlighted-cold");
    }
    if (
      hotCheck?.checked &&
      weatherData.temp > parseFloat(hotCheck.dataset.threshold)
    ) {
      resultsArea.classList.add("highlighted-hot");
    }
  }

  function setLoadingState(button, isLoading, loadingText) {
    if (!button) return;
    const btnText = button.querySelector(".btn-text");
    const spinner = button.querySelector(".spinner");
    if (!button.dataset.originalText) {
      button.dataset.originalText = btnText.textContent;
    }
    button.disabled = isLoading;
    if (btnText)
      btnText.textContent = isLoading
        ? loadingText
        : button.dataset.originalText;
    if (spinner) spinner.style.display = isLoading ? "inline-block" : "none";
  }

  const returnHomeButton = document.querySelectorAll(".return-home");

  returnHomeButton.forEach((btn) => {
    btn.addEventListener("click", () => {
      document.location.href = "/";
    });
  });

  initializeApp();
});
