/**
 * Connections Canvas Interaction Engine
 * Paper Design: 1G-0 ("connector's side")
 */

document.addEventListener('DOMContentLoaded', () => {
  const canvas = document.getElementById('canvas-1G-0');
  const cards = Array.from(document.querySelectorAll('.network-card'));
  const dynamicSvgGroup = document.getElementById('dynamic-connections');
  const dialog = document.getElementById('connection-dialog');
  const dialogReasonInput = document.getElementById('dialog-reason-input');
  const dialogConnectBtn = document.getElementById('dialog-connect-btn');
  const toast = document.getElementById('toast');
  const btnConnect = document.getElementById('btn-connect');
  const btnShare = document.getElementById('btn-share');
  const btnReset = document.getElementById('btn-reset-layout');
  const btnFit = document.getElementById('btn-zoom-fit');
  const btnZoomIn = document.getElementById('btn-zoom-in');
  const btnZoomOut = document.getElementById('btn-zoom-out');
  const viewportWrapper = document.querySelector('.viewport-wrapper');

  // Keep track of initial positions for reset
  const initialPositions = new Map();
  cards.forEach(card => {
    initialPositions.set(card.id, {
      left: parseFloat(card.style.left),
      top: parseFloat(card.style.top),
      width: parseFloat(card.style.width) || card.offsetWidth,
      height: parseFloat(card.style.height) || card.offsetHeight
    });
  });

  // Canvas Viewport Pan & Scale Management
  let panX = 0;
  let panY = 0;
  let currentScale = 1;
  let isFitMode = true;
  let isScreenPanning = false;
  let panStartX = 0;
  let panStartY = 0;
  let panInitX = 0;
  let panInitY = 0;
  let isSpacePressed = false;
  let currentActiveTab = 'view-canvas';

  function applyCanvasTransform(smooth = false) {
    if (!canvas) return;
    if (smooth) {
      canvas.style.transition = 'transform 0.25s cubic-bezier(0.2, 0.9, 0.3, 1)';
    } else {
      canvas.style.transition = 'none';
    }
    canvas.style.transform = `translate(${panX}px, ${panY}px) scale(${currentScale})`;
  }

  function updateCanvasScale(smooth = true) {
    if (!isFitMode) {
      applyCanvasTransform(smooth);
      return;
    }

    const availW = window.innerWidth;
    const availH = window.innerHeight;
    const scaleX = availW / 1512;
    const scaleY = availH / 982;
    currentScale = Math.max(scaleX, scaleY);

    applyCanvasTransform(smooth);
  }

  window.addEventListener('resize', () => {
    if (currentActiveTab === 'view-canvas') {
      updateCanvasScale(false);
    } else {
      updatePlayfulCanvasScale(false);
    }
  });
  updateCanvasScale(false);

  if (btnZoomIn) {
    btnZoomIn.addEventListener('click', () => {
      isFitMode = false;
      currentScale = Math.min(2.5, currentScale * 1.2);
      applyCanvasTransform(true);
      showToast(`Zoom: ${Math.round(currentScale * 100)}%`);
    });
  }

  if (btnZoomOut) {
    btnZoomOut.addEventListener('click', () => {
      isFitMode = false;
      currentScale = Math.max(0.3, currentScale / 1.2);
      applyCanvasTransform(true);
      showToast(`Zoom: ${Math.round(currentScale * 100)}%`);
    });
  }

  btnFit.addEventListener('click', () => {
    isFitMode = true;
    panX = 0;
    panY = 0;
    updateCanvasScale(true);
    showToast('Canvas fitted to screen');
  });

  btnReset.addEventListener('click', () => {
    panX = 0;
    panY = 0;
    isFitMode = true;
    updateCanvasScale(true);
    cards.forEach(card => {
      const pos = initialPositions.get(card.id);
      if (pos) {
        card.style.left = `${pos.left}px`;
        card.style.top = `${pos.top}px`;
      }
    });
    dynamicSvgGroup.innerHTML = '';
    document.querySelectorAll('.dynamic-badge, .dynamic-dot').forEach(el => el.remove());
    dialog.style.display = 'none';
    showToast('Layout and screen position reset');
  });

  // Spacebar pan mode detection
  window.addEventListener('keydown', (e) => {
    if (['INPUT', 'TEXTAREA'].includes(document.activeElement?.tagName)) return;
    if (e.code === 'Space' && !e.repeat) {
      isSpacePressed = true;
      document.body.classList.add('space-pan-active');
    }
  });

  window.addEventListener('keyup', (e) => {
    if (e.code === 'Space') {
      isSpacePressed = false;
      document.body.classList.remove('space-pan-active');
    }
  });

  // Screen panning pointer events
  function handleScreenPanStart(e) {
    if (e.button !== 0 && e.button !== 1) return;

    const isMiddleClick = e.button === 1;

    // Check if clicked an interactive UI or card element when not spacebar/middle-click
    if (!isSpacePressed && !isMiddleClick) {
      if (e.target.closest('.network-card, .tarot-commuter-card, .playful-card, .bottom-dock-bar, .canvas-controls, .top-nav-switcher, #connection-dialog, #playful-match-dialog, #user-share-flow-overlay, button, input, textarea')) {
        return;
      }
    }

    isScreenPanning = true;
    panStartX = e.clientX;
    panStartY = e.clientY;

    if (currentActiveTab === 'view-redesign') {
      panInitX = playfulPanX;
      panInitY = playfulPanY;
    } else {
      panInitX = panX;
      panInitY = panY;
    }

    document.body.classList.add('is-screen-panning');
    e.preventDefault();
  }

  function handleScreenPanMove(e) {
    if (!isScreenPanning) return;
    const dx = e.clientX - panStartX;
    const dy = e.clientY - panStartY;

    if (currentActiveTab === 'view-redesign') {
      playfulPanX = panInitX + dx;
      playfulPanY = panInitY + dy;
      applyPlayfulCanvasTransform(false);
    } else {
      panX = panInitX + dx;
      panY = panInitY + dy;
      applyCanvasTransform(false);
    }
  }

  function handleScreenPanEnd() {
    if (!isScreenPanning) return;
    isScreenPanning = false;
    document.body.classList.remove('is-screen-panning');
  }

  window.addEventListener('pointerdown', handleScreenPanStart);
  window.addEventListener('pointermove', handleScreenPanMove);
  window.addEventListener('pointerup', handleScreenPanEnd);
  window.addEventListener('pointercancel', handleScreenPanEnd);

  // Trackpad 2-finger pan & pinch zoom
  window.addEventListener('wheel', (e) => {
    if (e.target.closest('#user-share-flow-overlay .paper-modal, #connection-dialog textarea, #playful-match-dialog textarea')) {
      return;
    }

    e.preventDefault();

    if (e.ctrlKey || e.metaKey) {
      // Pinch zoom
      const zoomFactor = e.deltaY < 0 ? 1.05 : 0.95;
      if (currentActiveTab === 'view-redesign') {
        isPlayfulFit = false;
        playfulScale = Math.min(Math.max(playfulScale * zoomFactor, 0.3), 2.5);
        applyPlayfulCanvasTransform(false);
      } else {
        isFitMode = false;
        currentScale = Math.min(Math.max(currentScale * zoomFactor, 0.3), 2.5);
        applyCanvasTransform(false);
      }
    } else {
      // 2-finger pan
      if (currentActiveTab === 'view-redesign') {
        playfulPanX -= e.deltaX;
        playfulPanY -= e.deltaY;
        applyPlayfulCanvasTransform(false);
      } else {
        panX -= e.deltaX;
        panY -= e.deltaY;
        applyCanvasTransform(false);
      }
    }
  }, { passive: false });

  // Double-click to re-center
  window.addEventListener('dblclick', (e) => {
    if (e.target.closest('.network-card, .tarot-commuter-card, .playful-card, .bottom-dock-bar, .canvas-controls, .top-nav-switcher, #connection-dialog, #playful-match-dialog, #user-share-flow-overlay, button, input, textarea')) {
      return;
    }
    if (currentActiveTab === 'view-redesign') {
      playfulPanX = 0;
      playfulPanY = 0;
      isPlayfulFit = true;
      updatePlayfulCanvasScale(true);
      showToast('Canvas view re-centered');
    } else {
      panX = 0;
      panY = 0;
      isFitMode = true;
      updateCanvasScale(true);
      showToast('Canvas view re-centered');
    }
  });

  // Card Selection & Drag Engine
  let activeDragCard = null;
  let dragOffset = { x: 0, y: 0 };
  let potentialTargetCard = null;
  let pendingConnection = null;

  cards.forEach(card => {
    card.addEventListener('pointerdown', (e) => {
      // Don't drag card if space-panning or middle click
      if (isSpacePressed || e.button === 1) return;

      // Don't drag if clicking buttons inside
      if (e.target.closest('button')) return;

      // Select card
      cards.forEach(c => c.classList.remove('is-selected'));
      card.classList.add('is-selected');

      activeDragCard = card;
      card.classList.add('is-dragging');
      card.setPointerCapture(e.pointerId);

      const canvasRect = canvas.getBoundingClientRect();
      const pointerCanvasX = (e.clientX - canvasRect.left) / currentScale;
      const pointerCanvasY = (e.clientY - canvasRect.top) / currentScale;

      const cardLeft = parseFloat(card.style.left);
      const cardTop = parseFloat(card.style.top);

      dragOffset.x = pointerCanvasX - cardLeft;
      dragOffset.y = pointerCanvasY - cardTop;

      e.preventDefault();
      e.stopPropagation();
    });

    card.addEventListener('pointermove', (e) => {
      if (!activeDragCard || activeDragCard !== card) return;

      const canvasRect = canvas.getBoundingClientRect();
      const pointerCanvasX = (e.clientX - canvasRect.left) / currentScale;
      const pointerCanvasY = (e.clientY - canvasRect.top) / currentScale;

      const newLeft = pointerCanvasX - dragOffset.x;
      const newTop = pointerCanvasY - dragOffset.y;

      card.style.left = `${newLeft}px`;
      card.style.top = `${newTop}px`;

      // Check collision/proximity with other cards
      potentialTargetCard = null;
      cards.forEach(other => {
        other.classList.remove('is-target');
        if (other === card) return;

        const otherLeft = parseFloat(other.style.left);
        const otherTop = parseFloat(other.style.top);
        const otherW = other.offsetWidth || 220;
        const otherH = other.offsetHeight || 160;

        const cardW = card.offsetWidth || 220;
        const cardH = card.offsetHeight || 160;

        const centerX1 = newLeft + cardW / 2;
        const centerY1 = newTop + cardH / 2;
        const centerX2 = otherLeft + otherW / 2;
        const centerY2 = otherTop + otherH / 2;

        const dist = Math.hypot(centerX1 - centerX2, centerY1 - centerY2);

        // Near distance threshold for connection formation
        if (dist < 260) {
          potentialTargetCard = other;
          other.classList.add('is-target');
        }
      });
    });

    card.addEventListener('pointerup', (e) => {
      if (!activeDragCard || activeDragCard !== card) return;

      card.releasePointerCapture(e.pointerId);
      card.classList.remove('is-dragging');

      if (potentialTargetCard) {
        // Trigger connection dialog!
        showConnectionDialog(card, potentialTargetCard);
        potentialTargetCard.classList.remove('is-target');
      }

      activeDragCard = null;
      potentialTargetCard = null;
    });
  });

  // Connection Dialog Handling
  function showConnectionDialog(sourceCard, targetCard) {
    pendingConnection = { source: sourceCard, target: targetCard };

    const srcLeft = parseFloat(sourceCard.style.left);
    const srcTop = parseFloat(sourceCard.style.top);
    const tgtLeft = parseFloat(targetCard.style.left);
    const tgtTop = parseFloat(targetCard.style.top);

    // Place dialog nicely between or near cards
    const midX = (srcLeft + tgtLeft) / 2 + 30;
    const midY = (srcTop + tgtTop) / 2 - 40;

    // Constrain within canvas bounds
    const dialogX = Math.max(40, Math.min(1150, midX));
    const dialogY = Math.max(40, Math.min(780, midY));

    dialog.style.left = `${dialogX}px`;
    dialog.style.top = `${dialogY}px`;
    dialog.style.display = 'block';

    // Generate context-aware reason suggestion based on the paired commuters
    const a1 = sourceCard.dataset.author || '';
    const a2 = targetCard.dataset.author || '';
    const t1 = sourceCard.dataset.topic || '';
    const t2 = targetCard.dataset.topic || '';

    let suggestedReason = `${a1} and ${a2} commute along the same shared transit space!`;
    if ((a1.includes('Jackie') || a1.includes('Sora')) && (a2.includes('Jackie') || a2.includes('Sora'))) {
      suggestedReason = 'both of your thoughts on books and reading resonate';
    } else if ((a1.includes('Claire') || a1.includes('Harris')) && (a2.includes('Claire') || a2.includes('Harris'))) {
      suggestedReason = 'Harris baked fresh cookies and Claire has sweet cravings! 🍪';
    } else if ((a1.includes('Maya') || a1.includes('Devon')) && (a2.includes('Maya') || a2.includes('Devon'))) {
      suggestedReason = 'cozy coffee corner study session with a city pop playlist ☕🎵';
    } else if ((a1.includes('Elena') || a1.includes('Marcus')) && (a2.includes('Elena') || a2.includes('Marcus'))) {
      suggestedReason = 'shared love for visual arts and street sketching 🎨📷';
    } else if (t1 && t1 === t2) {
      suggestedReason = `both of you share a mutual interest in ${t1}`;
    }

    if (dialogReasonInput) {
      dialogReasonInput.value = suggestedReason;
      setTimeout(() => {
        dialogReasonInput.focus();
        dialogReasonInput.select();
      }, 50);
    }
  }

  // Handle Enter to submit (Shift+Enter for newline)
  if (dialogReasonInput) {
    dialogReasonInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        dialogConnectBtn.click();
      }
    });
  }

  dialogConnectBtn.addEventListener('click', () => {
    if (!pendingConnection) return;

    const customReason = (dialogReasonInput ? dialogReasonInput.value.trim() : '') || 'both of your thoughts on books seem to resonate';

    createConnectionCurve(pendingConnection.source, pendingConnection.target, customReason);
    dialog.style.display = 'none';
    showToast(`Connected ${pendingConnection.source.dataset.author} and ${pendingConnection.target.dataset.author}`);
    pendingConnection = null;
  });

  // Close dialog when clicking outside
  document.addEventListener('pointerdown', (e) => {
    if (dialog.style.display !== 'none' && !dialog.contains(e.target) && !e.target.closest('.network-card')) {
      dialog.style.display = 'none';
      pendingConnection = null;
    }
  });

  function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  // Dynamic Connection Curve Generator
  function createConnectionCurve(c1, c2, reasonText) {
    const x1 = parseFloat(c1.style.left) + c1.offsetWidth / 2;
    const y1 = parseFloat(c1.style.top) + c1.offsetHeight / 2;
    const x2 = parseFloat(c2.style.left) + c2.offsetWidth / 2;
    const y2 = parseFloat(c2.style.top) + c2.offsetHeight / 2;

    const dx = x2 - x1;
    const dy = y2 - y1;
    const cx1 = x1 + dx * 0.25 - dy * 0.2;
    const cy1 = y1 + dy * 0.25 + dx * 0.2;
    const cx2 = x1 + dx * 0.75 + dy * 0.2;
    const cy2 = y1 + dy * 0.75 - dx * 0.2;

    const pathData = `M ${x1} ${y1} C ${cx1} ${cy1}, ${cx2} ${cy2}, ${x2} ${y2}`;

    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    path.setAttribute('d', pathData);
    path.setAttribute('stroke', '#4299E1');
    path.setAttribute('stroke-width', '2');
    path.setAttribute('fill', 'none');
    path.setAttribute('filter', 'url(#arc-shadow)');
    path.style.transition = 'stroke-dashoffset 0.8s ease';

    dynamicSvgGroup.appendChild(path);

    // Create anchor pink dots on both ends
    createAnchorDot(x1, y1);
    createAnchorDot(x2, y2);

    // Add connection badge with the typed reason
    if (reasonText) {
      const midX = (x1 + x2) / 2;
      const midY = (y1 + y2) / 2;
      const badge = document.createElement('div');
      badge.className = 'connection-badge dynamic-badge';
      badge.style.left = `${Math.max(20, midX - 100)}px`;
      badge.style.top = `${Math.max(20, midY - 17)}px`;
      badge.innerHTML = `<span class="badge-prefix">&lt;&gt;</span> ${escapeHtml(reasonText)}`;
      canvas.appendChild(badge);
    }
  }

  function createAnchorDot(x, y) {
    const dot = document.createElement('div');
    dot.className = 'anchor-dot dynamic-dot';
    dot.style.left = `${x}px`;
    dot.style.top = `${y}px`;
    canvas.appendChild(dot);
  }

  // ============================================================
  // Normal User Share Flow (Paper Artboards: J6-0 -> NX-0 -> K5-0)
  // ============================================================
  const shareOverlay = document.getElementById('user-share-flow-overlay');
  const shareStepJ6 = document.getElementById('share-step-j6');
  const shareStepNX = document.getElementById('share-step-nx');
  const shareStepK5 = document.getElementById('share-step-k5');

  const btnCloseJ6 = document.getElementById('btn-close-j6');
  const btnCloseNX = document.getElementById('btn-close-nx');
  const btnCloseK5 = document.getElementById('btn-close-k5');

  const btnJ6Later = document.getElementById('btn-j6-later');
  const btnJ6ViewConnections = document.getElementById('btn-j6-view-connections');
  const userBioSnippetInput = document.getElementById('user-bio-snippet-input');

  const btnNXBack = document.getElementById('btn-nx-back');
  const btnNXShare = document.getElementById('btn-nx-share');
  const userDailySnippetInput = document.getElementById('user-daily-snippet-input');
  const transitChips = Array.from(document.querySelectorAll('.transit-chip'));

  const btnK5Edit = document.getElementById('btn-k5-edit');
  const btnK5Return = document.getElementById('btn-k5-return');
  const k5LiveTransit = document.getElementById('k5-live-transit');
  const k5LiveSnippetText = document.getElementById('k5-live-snippet-text');

  let selectedTransit = 'Manhattan Line A, 5:20PM';

  // Handle transit chips in NX-0
  transitChips.forEach(chip => {
    chip.addEventListener('click', () => {
      transitChips.forEach(c => c.classList.remove('active'));
      chip.classList.add('active');
      selectedTransit = chip.dataset.transit;
    });
  });

  function openShareFlow() {
    if (!shareOverlay) return;
    shareOverlay.style.display = 'flex';
    shareStepJ6.classList.add('active');
    shareStepNX.classList.remove('active');
    shareStepK5.classList.remove('active');

    // Update bottom dock bar button states to match J6-0 / NX-0
    btnShare.classList.add('is-active-tab');
    btnConnect.classList.add('is-inactive-tab');

    setTimeout(() => {
      if (userBioSnippetInput) userBioSnippetInput.focus();
    }, 100);
  }

  function closeShareFlow() {
    if (!shareOverlay) return;
    shareOverlay.style.display = 'none';
    btnShare.classList.remove('is-active-tab');
    btnConnect.classList.remove('is-inactive-tab');
  }

  function goToStepNX() {
    shareStepJ6.classList.remove('active');
    shareStepNX.classList.add('active');
    shareStepK5.classList.remove('active');
    setTimeout(() => {
      if (userDailySnippetInput) userDailySnippetInput.focus();
    }, 100);
  }

  function goToStepJ6() {
    shareStepNX.classList.remove('active');
    shareStepJ6.classList.add('active');
    shareStepK5.classList.remove('active');
    setTimeout(() => {
      if (userBioSnippetInput) userBioSnippetInput.focus();
    }, 100);
  }

  function submitShareSnippet() {
    const dailyText = userDailySnippetInput.value.trim() || 'I went to the bookstore to look for something new to read on my train commute...';

    // Update K5-0 live summary
    if (k5LiveTransit) k5LiveTransit.textContent = selectedTransit;
    if (k5LiveSnippetText) k5LiveSnippetText.textContent = dailyText;

    // Transition to K5-0 confirmation
    shareStepNX.classList.remove('active');
    shareStepJ6.classList.remove('active');
    shareStepK5.classList.add('active');

    // Add user's new commuter snippet card onto the canvas
    addUserSnippetCardToCanvas(dailyText, selectedTransit);

    showToast('✨ Snippet published! You are now live in the commuter matching pool.');
  }

  function addUserSnippetCardToCanvas(snippetText, transitLocation) {
    if (document.getElementById('card-user-snippet')) {
      const existingQuote = document.querySelector('#card-user-snippet .card-quote');
      const existingLoc = document.querySelector('#card-user-snippet .location-text');
      if (existingQuote) existingQuote.textContent = snippetText;
      if (existingLoc) existingLoc.textContent = transitLocation;
      return;
    }

    const cardsContainer = document.getElementById('cards-container');
    if (!cardsContainer) return;

    const userCard = document.createElement('article');
    userCard.className = 'network-card is-selected';
    userCard.id = 'card-user-snippet';
    userCard.dataset.id = 'card-user-snippet';
    userCard.dataset.author = 'You';
    userCard.dataset.topic = 'reading';
    userCard.style.left = '640px';
    userCard.style.top = '220px';
    userCard.style.width = '248px';
    userCard.style.border = '2px solid #6750A4';
    userCard.style.boxShadow = '0 8px 24px rgba(103, 80, 164, 0.35)';

    userCard.innerHTML = `
      <div class="card-inner">
        <div class="card-top">
          <div style="display: flex; align-items: center; justify-content: space-between;">
            <h2 class="card-author" style="color: #6750A4;">You (Live Snippet)</h2>
            <span style="font-size: 10px; background: #E8DEF8; color: #21005D; padding: 2px 6px; border-radius: 4px; font-weight: 600;">ACTIVE</span>
          </div>
          <p class="card-quote">${snippetText}</p>
        </div>
        <div class="card-bottom">
          <div class="card-location">
            <svg class="location-icon" viewBox="0 0 12 15" width="12" height="15" fill="#6750A4">
              <path d="M6.000 7.500C6.413 7.500 6.766 7.353 7.059 7.059C7.353 6.766 7.500 6.413 7.500 6.000C7.500 5.587 7.353 5.234 7.059 4.941C6.766 4.647 6.413 4.500 6.000 4.500C5.587 4.500 5.234 4.647 4.941 4.941C4.647 5.234 4.500 5.587 4.500 6.000C4.500 6.413 4.647 6.766 4.941 7.059C5.234 7.353 5.587 7.500 6.000 7.500ZM6.000 15.000C3.987 13.287 2.484 11.697 1.491 10.228C0.497 8.759 0.000 7.400 0.000 6.150C0.000 4.275 0.603 2.781 1.809 1.669C3.016 0.556 4.413 0.000 6.000 0.000C7.587 0.000 8.984 0.556 10.191 1.669C11.397 2.781 12.000 4.275 12.000 6.150C12.000 7.400 11.503 8.759 10.509 10.228C9.516 11.697 8.013 13.287 6.000 15.000Z" />
            </svg>
            <span class="location-text">${transitLocation}</span>
          </div>
          <div class="card-social-context" style="color: #6750A4; font-weight: 500;">Ready to connect!</div>
        </div>
      </div>
    `;

    cardsContainer.appendChild(userCard);
    cards.push(userCard);
    initialPositions.set(userCard.id, { left: 640, top: 220, width: 248, height: 160 });

    // Enable drag on new card
    bindCardDrag(userCard);
  }

  function bindCardDrag(card) {
    card.addEventListener('pointerdown', (e) => {
      if (isSpacePressed || e.button === 1) return;
      if (e.target.closest('button')) return;
      cards.forEach(c => c.classList.remove('is-selected'));
      card.classList.add('is-selected');

      activeDragCard = card;
      card.classList.add('is-dragging');
      card.setPointerCapture(e.pointerId);

      const canvasRect = canvas.getBoundingClientRect();
      const pointerCanvasX = (e.clientX - canvasRect.left) / currentScale;
      const pointerCanvasY = (e.clientY - canvasRect.top) / currentScale;

      const cardLeft = parseFloat(card.style.left);
      const cardTop = parseFloat(card.style.top);

      dragOffset.x = pointerCanvasX - cardLeft;
      dragOffset.y = pointerCanvasY - cardTop;
      e.preventDefault();
      e.stopPropagation();
    });

    card.addEventListener('pointermove', (e) => {
      if (!activeDragCard || activeDragCard !== card) return;

      const canvasRect = canvas.getBoundingClientRect();
      const pointerCanvasX = (e.clientX - canvasRect.left) / currentScale;
      const pointerCanvasY = (e.clientY - canvasRect.top) / currentScale;

      const newLeft = pointerCanvasX - dragOffset.x;
      const newTop = pointerCanvasY - dragOffset.y;

      card.style.left = `${newLeft}px`;
      card.style.top = `${newTop}px`;

      potentialTargetCard = null;
      cards.forEach(other => {
        other.classList.remove('is-target');
        if (other === card) return;

        const otherLeft = parseFloat(other.style.left);
        const otherTop = parseFloat(other.style.top);
        const otherW = other.offsetWidth || 220;
        const otherH = other.offsetHeight || 160;
        const cardW = card.offsetWidth || 220;
        const cardH = card.offsetHeight || 160;

        const centerX1 = newLeft + cardW / 2;
        const centerY1 = newTop + cardH / 2;
        const centerX2 = otherLeft + otherW / 2;
        const centerY2 = otherTop + otherH / 2;

        const dist = Math.hypot(centerX1 - centerX2, centerY1 - centerY2);
        if (dist < 260) {
          potentialTargetCard = other;
          other.classList.add('is-target');
        }
      });
    });

    card.addEventListener('pointerup', (e) => {
      if (!activeDragCard || activeDragCard !== card) return;
      card.releasePointerCapture(e.pointerId);
      card.classList.remove('is-dragging');

      if (potentialTargetCard) {
        showConnectionDialog(card, potentialTargetCard);
        potentialTargetCard.classList.remove('is-target');
      }

      activeDragCard = null;
      potentialTargetCard = null;
    });
  }

  // Hook up event listeners for Bottom Dock Bar
  btnShare.addEventListener('click', (e) => {
    e.stopPropagation();
    openShareFlow();
  });

  btnConnect.addEventListener('click', () => {
    // If share overlay is currently open, clicking Connect exits back to matchmaker mode!
    if (shareOverlay && shareOverlay.style.display === 'flex') {
      closeShareFlow();
      showToast('Returned to matchmaker mode');
      return;
    }
    const unselected = cards.find(c => !c.classList.contains('is-selected'));
    const selected = cards.find(c => c.classList.contains('is-selected')) || cards[0];
    if (selected && unselected) {
      showConnectionDialog(selected, unselected);
    }
  });

  // Step J6 Actions (Paper J6-0)
  if (btnJ6ViewConnections) btnJ6ViewConnections.addEventListener('click', goToStepNX);
  if (btnJ6Later) {
    btnJ6Later.addEventListener('click', () => {
      showToast('Bio snippet skipped. Enter today\'s transit snippet next!');
      goToStepNX();
    });
  }
  if (btnCloseJ6) btnCloseJ6.addEventListener('click', closeShareFlow);

  // Step NX Actions (Paper NX-0)
  if (btnNXBack) btnNXBack.addEventListener('click', goToStepJ6);
  if (btnNXShare) btnNXShare.addEventListener('click', submitShareSnippet);
  if (btnCloseNX) btnCloseNX.addEventListener('click', closeShareFlow);

  // Step K5 Actions (Paper K5-0)
  if (btnK5Edit) btnK5Edit.addEventListener('click', goToStepNX);
  if (btnK5Return) {
    btnK5Return.addEventListener('click', () => {
      closeShareFlow();
      showToast('Welcome to the commuter pool! Matchmakers can connect your card now.');
    });
  }
  if (btnCloseK5) btnCloseK5.addEventListener('click', closeShareFlow);

  // ============================================================
  // Tab Switcher Handling
  // ============================================================
  const tabButtons = document.querySelectorAll('.nav-tab-btn');
  const tabPanels = document.querySelectorAll('.tab-panel');

  tabButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      const targetId = btn.dataset.tab;
      currentActiveTab = targetId;

      tabButtons.forEach(b => {
        b.classList.remove('active');
        b.setAttribute('aria-selected', 'false');
      });
      tabPanels.forEach(p => p.classList.remove('active'));

      btn.classList.add('active');
      btn.setAttribute('aria-selected', 'true');

      const targetPanel = document.getElementById(targetId);
      if (targetPanel) {
        targetPanel.classList.add('active');
      }

      if (targetId === 'view-canvas') {
        updateCanvasScale();
      } else if (targetId === 'view-redesign') {
        updatePlayfulCanvasScale();
      }
    });
  });

  // ============================================================
  // Tab 2: Playful Daily Tarot & Transit Matchmaker Canvas Engine
  // ============================================================
  const playfulCanvas = document.getElementById('canvas-playful');
  const playfulCards = Array.from(document.querySelectorAll('.tarot-commuter-card, .playful-card'));
  const playfulDynamicSvg = document.getElementById('playful-dynamic-threads');
  const playfulDialog = document.getElementById('playful-match-dialog');
  const playfulDialogClose = document.getElementById('playful-dialog-close');
  const playfulSparkBtn = document.getElementById('playful-spark-btn');
  const playfulReasonInput = document.getElementById('playful-reason-input');
  const vibePlatonicBtn = document.getElementById('btn-vibe-platonic');
  const vibeRomanticBtn = document.getElementById('btn-vibe-romantic');
  const labelVibePrompt = document.getElementById('label-vibe-prompt');
  const dialogMatchTitle = document.getElementById('dialog-match-title');
  const dialogTarotImg1 = document.getElementById('dialog-tarot-img-1');
  const dialogTarotImg2 = document.getElementById('dialog-tarot-img-2');
  const dialogTarotNum1 = document.getElementById('dialog-tarot-num-1');
  const dialogTarotNum2 = document.getElementById('dialog-tarot-num-2');
  const dialogName1 = document.getElementById('dialog-name-1');
  const dialogName2 = document.getElementById('dialog-name-2');
  const dialogTarotName1 = document.getElementById('dialog-tarot-name-1');
  const dialogTarotName2 = document.getElementById('dialog-tarot-name-2');
  const synergyPercentText = document.getElementById('synergy-percent-text');
  const dialogTransitSynergy = document.getElementById('dialog-transit-synergy');
  const coupleSparkIcon = document.getElementById('couple-spark-icon');
  const statPlatonic = document.getElementById('stat-platonic-count');
  const statRomantic = document.getElementById('stat-romantic-count');
  const btnRandomMatch = document.getElementById('btn-random-match');
  const btnShuffleTarot = document.getElementById('btn-shuffle-tarot');
  const btnResetPlayful = document.getElementById('btn-reset-playful');
  const btnPlayfulFit = document.getElementById('btn-playful-fit');
  const btnPlayfulZoomIn = document.getElementById('btn-playful-zoom-in');
  const btnPlayfulZoomOut = document.getElementById('btn-playful-zoom-out');
  const btnPlayfulPanReset = document.getElementById('btn-reset-playful-pan');

  let platonicCount = 1;
  let romanticCount = 1;
  let currentVibe = 'platonic'; // 'platonic' | 'romantic'
  let pendingPlayfulMatch = null;

  // Initial playful positions
  const initialPlayfulPositions = new Map();
  playfulCards.forEach(card => {
    initialPlayfulPositions.set(card.id, {
      left: parseFloat(card.style.left),
      top: parseFloat(card.style.top)
    });
  });

  // Playful Scale & Pan Management
  let playfulScale = 1;
  let isPlayfulFit = true;
  let playfulPanX = 0;
  let playfulPanY = 0;

  function applyPlayfulCanvasTransform(smooth = false) {
    if (!playfulCanvas) return;
    if (smooth) {
      playfulCanvas.style.transition = 'transform 0.25s cubic-bezier(0.2, 0.9, 0.3, 1)';
    } else {
      playfulCanvas.style.transition = 'none';
    }
    playfulCanvas.style.transform = `translate(${playfulPanX}px, ${playfulPanY}px) scale(${playfulScale})`;
  }

  function updatePlayfulCanvasScale(smooth = true) {
    if (!playfulCanvas) return;
    if (!isPlayfulFit) {
      applyPlayfulCanvasTransform(smooth);
      return;
    }
    const availW = window.innerWidth;
    const availH = window.innerHeight;
    const scaleX = availW / 1512;
    const scaleY = availH / 982;
    playfulScale = Math.max(scaleX, scaleY);
    applyPlayfulCanvasTransform(smooth);
  }

  if (btnPlayfulZoomIn) {
    btnPlayfulZoomIn.addEventListener('click', () => {
      isPlayfulFit = false;
      playfulScale = Math.min(2.5, playfulScale * 1.2);
      applyPlayfulCanvasTransform(true);
      showToast(`Zoom: ${Math.round(playfulScale * 100)}%`);
    });
  }
  if (btnPlayfulZoomOut) {
    btnPlayfulZoomOut.addEventListener('click', () => {
      isPlayfulFit = false;
      playfulScale = Math.max(0.3, playfulScale / 1.2);
      applyPlayfulCanvasTransform(true);
      showToast(`Zoom: ${Math.round(playfulScale * 100)}%`);
    });
  }
  if (btnPlayfulPanReset) {
    btnPlayfulPanReset.addEventListener('click', () => {
      playfulPanX = 0;
      playfulPanY = 0;
      isPlayfulFit = true;
      updatePlayfulCanvasScale(true);
      showToast('Playful canvas view reset');
    });
  }

  if (btnPlayfulFit) {
    btnPlayfulFit.addEventListener('click', () => {
      isPlayfulFit = true;
      playfulPanX = 0;
      playfulPanY = 0;
      updatePlayfulCanvasScale(true);
      showToast('Playful canvas fitted to screen');
    });
  }

  // Vibe Toggle Selector
  if (vibePlatonicBtn && vibeRomanticBtn) {
    vibePlatonicBtn.addEventListener('click', () => {
      currentVibe = 'platonic';
      vibePlatonicBtn.classList.add('active');
      vibeRomanticBtn.classList.remove('active');
      if (coupleSparkIcon) coupleSparkIcon.textContent = '☕';
      if (labelVibePrompt) labelVibePrompt.textContent = 'Your Platonic Matchmaker Reading (edit freely): ☕';
      if (playfulSparkBtn) {
        playfulSparkBtn.style.background = 'linear-gradient(135deg, #EAA153 0%, #E28834 100%)';
        playfulSparkBtn.textContent = 'Spark Coffee & Book Connection! ☕✨';
      }
      if (pendingPlayfulMatch) {
        updateMatchmakerReason(pendingPlayfulMatch.card1, pendingPlayfulMatch.card2, 'platonic');
      }
    });

    vibeRomanticBtn.addEventListener('click', () => {
      currentVibe = 'romantic';
      vibeRomanticBtn.classList.add('active');
      vibePlatonicBtn.classList.remove('active');
      if (coupleSparkIcon) coupleSparkIcon.textContent = '💘';
      if (labelVibePrompt) labelVibePrompt.textContent = 'Your Romantic Matchmaker Reading (edit freely): 💘';
      if (playfulSparkBtn) {
        playfulSparkBtn.style.background = 'linear-gradient(135deg, #FF5D8F 0%, #FF8A65 100%)';
        playfulSparkBtn.textContent = 'Spark Romance & Chemistry! 💘✨';
      }
      if (pendingPlayfulMatch) {
        updateMatchmakerReason(pendingPlayfulMatch.card1, pendingPlayfulMatch.card2, 'romantic');
      }
    });
  }

  // Playful Cards Drag & Drop Engine
  let activePlayfulCard = null;
  let playfulDragOffset = { x: 0, y: 0 };
  let potentialPlayfulTarget = null;

  playfulCards.forEach(card => {
    card.addEventListener('pointerdown', (e) => {
      if (isSpacePressed || e.button === 1) return;
      if (e.target.closest('button') || e.target.closest('input') || e.target.closest('textarea')) return;

      playfulCards.forEach(c => c.classList.remove('is-active'));
      card.classList.add('is-active');

      activePlayfulCard = card;
      card.classList.add('is-dragging');
      card.setPointerCapture(e.pointerId);

      const canvasRect = playfulCanvas.getBoundingClientRect();
      const pointerX = (e.clientX - canvasRect.left) / playfulScale;
      const pointerY = (e.clientY - canvasRect.top) / playfulScale;

      const cardLeft = parseFloat(card.style.left);
      const cardTop = parseFloat(card.style.top);

      playfulDragOffset.x = pointerX - cardLeft;
      playfulDragOffset.y = pointerY - cardTop;

      e.preventDefault();
      e.stopPropagation();
    });

    card.addEventListener('pointermove', (e) => {
      if (!activePlayfulCard || activePlayfulCard !== card) return;

      const canvasRect = playfulCanvas.getBoundingClientRect();
      const pointerX = (e.clientX - canvasRect.left) / playfulScale;
      const pointerY = (e.clientY - canvasRect.top) / playfulScale;

      const newLeft = pointerX - playfulDragOffset.x;
      const newTop = pointerY - playfulDragOffset.y;

      card.style.left = `${newLeft}px`;
      card.style.top = `${newTop}px`;

      // Check proximity with other playful cards
      potentialPlayfulTarget = null;
      playfulCards.forEach(other => {
        other.classList.remove('is-target');
        if (other === card) return;

        const otherLeft = parseFloat(other.style.left);
        const otherTop = parseFloat(other.style.top);
        const otherW = other.offsetWidth || 270;
        const otherH = other.offsetHeight || 320;

        const cardW = card.offsetWidth || 270;
        const cardH = card.offsetHeight || 320;

        const cx1 = newLeft + cardW / 2;
        const cy1 = newTop + cardH / 2;
        const cx2 = otherLeft + otherW / 2;
        const cy2 = otherTop + otherH / 2;

        const dist = Math.hypot(cx1 - cx2, cy1 - cy2);

        if (dist < 310) {
          potentialPlayfulTarget = other;
          other.classList.add('is-target');
        }
      });
    });

    card.addEventListener('pointerup', (e) => {
      if (!activePlayfulCard || activePlayfulCard !== card) return;

      card.releasePointerCapture(e.pointerId);
      card.classList.remove('is-dragging');

      if (potentialPlayfulTarget) {
        showPlayfulMatchDialog(card, potentialPlayfulTarget);
        potentialPlayfulTarget.classList.remove('is-target');
      }

      activePlayfulCard = null;
      potentialPlayfulTarget = null;
    });
  });

  // Open Playful Tarot Matchmaker Dialog
  function showPlayfulMatchDialog(c1, c2) {
    pendingPlayfulMatch = { card1: c1, card2: c2 };

    const name1 = c1.dataset.author || 'Commuter 1';
    const name2 = c2.dataset.author || 'Commuter 2';
    const tarot1 = c1.dataset.tarot || 'Tarot Card 1';
    const tarot2 = c2.dataset.tarot || 'Tarot Card 2';
    const transit1 = c1.dataset.transit || 'Line A';
    const transit2 = c2.dataset.transit || 'Line A';

    const img1 = c1.querySelector('.tarot-art-img')?.src || '';
    const img2 = c2.querySelector('.tarot-art-img')?.src || '';

    const num1 = c1.querySelector('.tarot-roman-title')?.textContent?.split('•')[0]?.trim() || '✦';
    const num2 = c2.querySelector('.tarot-roman-title')?.textContent?.split('•')[0]?.trim() || '✦';

    const tname1 = c1.querySelector('.tarot-roman-title')?.textContent?.split('•')[1]?.trim() || tarot1;
    const tname2 = c2.querySelector('.tarot-roman-title')?.textContent?.split('•')[1]?.trim() || tarot2;

    if (dialogTarotImg1) dialogTarotImg1.src = img1;
    if (dialogTarotImg2) dialogTarotImg2.src = img2;
    if (dialogTarotNum1) dialogTarotNum1.textContent = num1;
    if (dialogTarotNum2) dialogTarotNum2.textContent = num2;
    if (dialogName1) dialogName1.textContent = name1;
    if (dialogName2) dialogName2.textContent = name2;
    if (dialogTarotName1) dialogTarotName1.textContent = tname1;
    if (dialogTarotName2) dialogTarotName2.textContent = tname2;
    if (dialogMatchTitle) dialogMatchTitle.textContent = `${name1} & ${name2}`;

    // Transit calculation
    let sharedTransit = '📍 Shared Commute: Line A (5:20PM)';
    if (transit1.includes('Madison') || transit2.includes('Madison')) {
      sharedTransit = '📍 Transit Crossing: Line A ✕ Madison Sq';
    }
    if (dialogTransitSynergy) dialogTransitSynergy.textContent = sharedTransit;

    // Synergy Score calculation
    let score = 94;
    if ((name1.includes('Jackie') && name2.includes('Claire')) || (name2.includes('Jackie') && name1.includes('Claire'))) {
      score = 98;
    } else if ((name1.includes('Harris') && name2.includes('Claire L.')) || (name2.includes('Harris') && name1.includes('Claire L.'))) {
      score = 99;
    } else if ((name1.includes('Leo') && name2.includes('Maya')) || (name2.includes('Leo') && name1.includes('Maya'))) {
      score = 96;
    } else {
      score = 92 + Math.floor(Math.random() * 6);
    }
    if (synergyPercentText) synergyPercentText.textContent = `${score}% Synergy`;

    // Populate tailored matchmaker note
    updateMatchmakerReason(c1, c2, currentVibe);

    // Position dialog centered or near cards
    const x1 = parseFloat(c1.style.left);
    const y1 = parseFloat(c1.style.top);
    const x2 = parseFloat(c2.style.left);
    const y2 = parseFloat(c2.style.top);

    const midX = (x1 + x2) / 2 + 10;
    const midY = (y1 + y2) / 2 - 80;

    const boundedX = Math.max(50, Math.min(1020, midX));
    const boundedY = Math.max(40, Math.min(580, midY));

    playfulDialog.style.left = `${boundedX}px`;
    playfulDialog.style.top = `${boundedY}px`;
    playfulDialog.style.display = 'flex';

    setTimeout(() => {
      playfulReasonInput.focus();
      playfulReasonInput.select();
    }, 60);
  }

  // Generate intelligent Tarot + Transit matchmaking insight
  function updateMatchmakerReason(c1, c2, vibe) {
    const name1 = c1.dataset.author || '';
    const name2 = c2.dataset.author || '';
    const tarot1 = c1.dataset.tarot || '';
    const tarot2 = c2.dataset.tarot || '';

    let text = '';
    const isBookworm = (name1 === 'Jackie' || name1 === 'Claire') && (name2 === 'Jackie' || name2 === 'Claire');
    const isCookieDuo = (name1 === 'Claire L.' || name1 === 'Harris') && (name2 === 'Claire L.' || name2 === 'Harris');
    const isCafeArtDuo = (name1 === 'Leo' || name1 === 'Maya') && (name2 === 'Leo' || name2 === 'Maya');

    if (vibe === 'platonic') {
      if (isBookworm) {
        text = `The Hermit meets The Star! Jackie and Claire both pulled introspective book cards today and commute side-by-side on Line A. A quiet coffee chat and book recommendation will spark a lifelong friendship! ☕📖`;
      } else if (isCookieDuo) {
        text = `The Empress meets The Magician! Claire L. manifested sweet cravings and Harris baked 12 fresh chocolate cookies on Line A. A friendly cookie tasting session is destined! ☕🍪`;
      } else if (isCafeArtDuo) {
        text = `The Coffee Ritualist meets The Visual Dreamer! Leo's pour-over craft paired with Maya's subway sketches around Madison Square makes for an inspiring afternoon creative session! ☕🎨`;
      } else {
        text = `${name1} (${tarot1}) and ${name2} (${tarot2}) share aligned transit timing and complementary daily tarot energies. Perfect for a morning coffee & chat on Line A! ☕✨`;
      }
    } else {
      if (isCookieDuo) {
        text = `The Empress meets The Magician! Claire L. manifested chocolate cookies this morning, and Harris baked 12 fresh molten cookies on Line A. The cosmic baker-sweet tooth chemistry is undeniable! 💘🍪`;
      } else if (isBookworm) {
        text = `The Hermit and The Star! Sparks fly over shared quiet corners, mutual book obsessions, and glancing across the Line A train car every evening at 5:20PM! 💘📚`;
      } else if (isCafeArtDuo) {
        text = `Single-origin coffee meets intimate portrait sketches! Leo and Maya cross paths at Madison Square at golden hour. Romance brewed to perfection! 💘☕`;
      } else {
        text = `Cosmic chemistry between ${name1} and ${name2}! Their daily tarot draws (${tarot1} & ${tarot2}) spark an undeniable magnetic pull on their daily commute! 💘✨`;
      }
    }

    if (playfulReasonInput) {
      playfulReasonInput.value = text;
    }
  }

  if (playfulDialogClose) {
    playfulDialogClose.addEventListener('click', () => {
      playfulDialog.style.display = 'none';
      pendingPlayfulMatch = null;
    });
  }

  // Spark Connection Button
  if (playfulSparkBtn) {
    playfulSparkBtn.addEventListener('click', () => {
      if (!pendingPlayfulMatch) return;

      const reason = playfulReasonInput.value.trim() || 'A sweet cosmic match made on Line A!';
      createPlayfulConnection(pendingPlayfulMatch.card1, pendingPlayfulMatch.card2, currentVibe, reason);

      playfulDialog.style.display = 'none';
      const name1 = pendingPlayfulMatch.card1.dataset.author;
      const name2 = pendingPlayfulMatch.card2.dataset.author;
      showToast(`🎉 Sparked ${currentVibe === 'romantic' ? '💘 Romance' : '☕ Friendship'} between ${name1} & ${name2}!`);

      pendingPlayfulMatch = null;
    });
  }

  // Draw colorful curved ribbon/thread with Tarot details
  function createPlayfulConnection(c1, c2, vibe, reason) {
    const x1 = parseFloat(c1.style.left) + c1.offsetWidth / 2;
    const y1 = parseFloat(c1.style.top) + c1.offsetHeight / 2;
    const x2 = parseFloat(c2.style.left) + c2.offsetWidth / 2;
    const y2 = parseFloat(c2.style.top) + c2.offsetHeight / 2;

    const dx = x2 - x1;
    const dy = y2 - y1;
    const curvature = vibe === 'romantic' ? 0.35 : 0.25;
    const cx1 = x1 + dx * 0.3 - dy * curvature;
    const cy1 = y1 + dy * 0.3 + dx * curvature;
    const cx2 = x1 + dx * 0.7 + dy * curvature;
    const cy2 = y1 + dy * 0.7 - dx * curvature;

    const pathData = `M ${x1} ${y1} C ${cx1} ${cy1}, ${cx2} ${cy2}, ${x2} ${y2}`;

    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    path.setAttribute('d', pathData);
    path.setAttribute('fill', 'none');
    path.setAttribute('stroke-width', '4.5');
    path.setAttribute('stroke-linecap', 'round');

    if (vibe === 'romantic') {
      path.setAttribute('stroke', 'url(#grad-romantic)');
      path.setAttribute('filter', 'url(#romantic-glow)');
      romanticCount++;
      if (statRomantic) statRomantic.textContent = romanticCount;
    } else {
      path.setAttribute('stroke', 'url(#grad-platonic)');
      path.setAttribute('stroke-dasharray', '10 7');
      path.setAttribute('filter', 'url(#platonic-glow)');
      platonicCount++;
      if (statPlatonic) statPlatonic.textContent = platonicCount;
    }

    playfulDynamicSvg.appendChild(path);

    // Create Ribbon Badge
    const midX = (x1 + x2) / 2;
    const midY = (y1 + y2) / 2;

    const tname1 = c1.querySelector('.tarot-roman-title')?.textContent?.split('•')[1]?.trim() || c1.dataset.author;
    const tname2 = c2.querySelector('.tarot-roman-title')?.textContent?.split('•')[1]?.trim() || c2.dataset.author;

    const badge = document.createElement('div');
    badge.className = `playful-badge ${vibe === 'romantic' ? 'badge-romantic' : 'badge-platonic'} dynamic-playful-badge`;
    badge.style.left = `${Math.max(20, midX - 110)}px`;
    badge.style.top = `${Math.max(20, midY - 20)}px`;
    badge.innerHTML = `
      <span class="vibe-icon">${vibe === 'romantic' ? '💘' : '☕'}</span>
      <span class="vibe-label">${vibe === 'romantic' ? 'Romantic:' : 'Platonic:'}</span>
      ${escapeHtml(tname1)} ✕ ${escapeHtml(tname2)} • ${escapeHtml(reason.slice(0, 42))}...
    `;
    playfulCanvas.appendChild(badge);
  }

  // Random Matchmaker Button
  if (btnRandomMatch) {
    btnRandomMatch.addEventListener('click', () => {
      const idx1 = Math.floor(Math.random() * playfulCards.length);
      let idx2 = Math.floor(Math.random() * playfulCards.length);
      while (idx2 === idx1) {
        idx2 = Math.floor(Math.random() * playfulCards.length);
      }
      showPlayfulMatchDialog(playfulCards[idx1], playfulCards[idx2]);
      showToast('🎲 Cosmic pair matched! Read their chemistry ✨');
    });
  }

  // Shuffle / Draw Daily Tarots
  const alternateTarotFortunes = [
    {
      card: 'pcard-jackie',
      roman: 'II • THE HIGH PRIESTESS',
      tag: '🌙 Hidden Lore',
      name: 'The Mystery Reader',
      quote: 'Drawn to ancient historical novels today. Who can keep a literary secret?',
      vibe: 'reading',
      img: 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=500&auto=format&fit=crop&q=80'
    },
    {
      card: 'pcard-claire-reader',
      roman: 'XIX • THE SUN',
      tag: '☀️ Radiant Joy',
      name: 'The Optimistic Reader',
      quote: 'Looking for a feel-good comedy novel to read on the morning commute!',
      vibe: 'reading',
      img: 'https://images.unsplash.com/photo-1512820790803-83ca734da794?w=500&auto=format&fit=crop&q=80'
    },
    {
      card: 'pcard-claire-cookies',
      roman: 'X • WHEEL OF FORTUNE',
      tag: '🍀 Pastry Luck',
      name: 'The Lucky Taster',
      quote: 'The Wheel says unexpected sweet treats are coming my way on Line A!',
      vibe: 'cookies',
      img: 'https://images.unsplash.com/photo-1499636136210-6f4ee915583e?w=500&auto=format&fit=crop&q=80'
    },
    {
      card: 'pcard-harris',
      roman: 'XIV • TEMPERANCE',
      tag: '🍰 Pure Balance',
      name: 'The Pastry Perfectionist',
      quote: 'Perfected my golden ratio of dark chocolate to sea salt. Ready to share!',
      vibe: 'cookies',
      img: 'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=500&auto=format&fit=crop&q=80'
    },
    {
      card: 'pcard-leo',
      roman: 'VII • THE CHARIOT',
      tag: '☕ Cafe Pioneer',
      name: 'The Espresso Explorer',
      quote: 'On a mission to discover the newest specialty roasters along the train line!',
      vibe: 'coffee',
      img: 'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=500&auto=format&fit=crop&q=80'
    },
    {
      card: 'pcard-maya',
      roman: 'XXI • THE WORLD',
      tag: '🎨 Full Palette',
      name: 'The City Sketcher',
      quote: 'Carrying a pocket watercolor set today. The city is full of inspiring faces!',
      vibe: 'art',
      img: 'https://images.unsplash.com/photo-1513364776144-60967b0f800f?w=500&auto=format&fit=crop&q=80'
    }
  ];

  if (btnShuffleTarot) {
    btnShuffleTarot.addEventListener('click', () => {
      alternateTarotFortunes.forEach(f => {
        const el = document.getElementById(f.card);
        if (!el) return;

        el.style.transition = 'transform 0.4s ease, opacity 0.3s ease';
        el.style.transform = 'scale(0.92) rotate(-3deg)';
        el.style.opacity = '0.5';

        setTimeout(() => {
          const title = el.querySelector('.tarot-roman-title');
          const tag = el.querySelector('.tarot-tag');
          const arch = el.querySelector('.tarot-archetype-name');
          const quote = el.querySelector('.quote-text');
          const img = el.querySelector('.tarot-art-img');

          if (title) title.textContent = f.roman;
          if (tag) tag.textContent = f.tag;
          if (arch) arch.textContent = f.name;
          if (quote) quote.textContent = f.quote;
          if (img) img.src = f.img;

          el.dataset.tarot = f.roman;

          el.style.transform = 'scale(1.04) rotate(1deg)';
          el.style.opacity = '1';

          setTimeout(() => {
            el.style.transform = '';
          }, 250);
        }, 300);
      });

      showToast('🔮 Fresh Daily Tarots & Fortunes drawn for all commuters! ✨');
    });
  }

  // Reset Playful Board
  if (btnResetPlayful) {
    btnResetPlayful.addEventListener('click', () => {
      playfulPanX = 0;
      playfulPanY = 0;
      isPlayfulFit = true;
      updatePlayfulCanvasScale(true);
      playfulCards.forEach(card => {
        const pos = initialPlayfulPositions.get(card.id);
        if (pos) {
          card.style.left = `${pos.left}px`;
          card.style.top = `${pos.top}px`;
        }
      });
      playfulDynamicSvg.innerHTML = '';
      document.querySelectorAll('.dynamic-playful-badge').forEach(b => b.remove());
      playfulDialog.style.display = 'none';
      platonicCount = 1;
      romanticCount = 1;
      if (statPlatonic) statPlatonic.textContent = platonicCount;
      if (statRomantic) statRomantic.textContent = romanticCount;
      showToast('Playful canvas reset to default threads ✨');
    });
  }

  // Toast Helper
  let toastTimer = null;
  function showToast(message) {
    clearTimeout(toastTimer);
    toast.textContent = message;
    toast.classList.add('show');
    toastTimer = setTimeout(() => {
      toast.classList.remove('show');
    }, 2800);
  }
});

