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
    updateCanvasScale(false);
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

  // Hover drop shadow for Ellipse 3 & Shared Space Pill
  const ellipse3 = document.getElementById('ellipse-3');
  const ellipse3Hit = document.getElementById('ellipse-3-hit');
  const sharedSpacePills = document.querySelectorAll('.pill-shared-space');

  let isEllipseHovered = false;
  let isPillHovered = false;

  function updateEllipseShadow() {
    if (!ellipse3) return;
    if (isEllipseHovered || isPillHovered) {
      ellipse3.setAttribute('filter', 'url(#arc-shadow)');
      ellipse3.classList.add('has-shadow');
    } else {
      ellipse3.removeAttribute('filter');
      ellipse3.classList.remove('has-shadow');
    }
  }

  if (ellipse3) {
    ellipse3.addEventListener('mouseenter', () => {
      isEllipseHovered = true;
      updateEllipseShadow();
    });
    ellipse3.addEventListener('mouseleave', () => {
      isEllipseHovered = false;
      updateEllipseShadow();
    });
  }

  if (ellipse3Hit) {
    ellipse3Hit.addEventListener('mouseenter', () => {
      isEllipseHovered = true;
      updateEllipseShadow();
    });
    ellipse3Hit.addEventListener('mouseleave', () => {
      isEllipseHovered = false;
      updateEllipseShadow();
    });
  }

  sharedSpacePills.forEach(pill => {
    pill.addEventListener('mouseenter', () => {
      isPillHovered = true;
      updateEllipseShadow();
    });
    pill.addEventListener('mouseleave', () => {
      isPillHovered = false;
      updateEllipseShadow();
    });
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
      if (e.target.closest('.network-card, .bottom-dock-bar, .canvas-controls, .top-nav-switcher, #connection-dialog, button, input, textarea')) {
        return;
      }
    }

    isScreenPanning = true;
    panStartX = e.clientX;
    panStartY = e.clientY;

    panInitX = panX;
    panInitY = panY;

    document.body.classList.add('is-screen-panning');
    e.preventDefault();
  }

  function handleScreenPanMove(e) {
    if (!isScreenPanning) return;
    const dx = e.clientX - panStartX;
    const dy = e.clientY - panStartY;

    panX = panInitX + dx;
    panY = panInitY + dy;
    applyCanvasTransform(false);
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
    if (currentActiveTab !== 'view-canvas' || e.target.closest('#connection-dialog textarea')) {
      return;
    }

    e.preventDefault();

    if (e.ctrlKey || e.metaKey) {
      // Pinch zoom
      const zoomFactor = e.deltaY < 0 ? 1.05 : 0.95;
      isFitMode = false;
      currentScale = Math.min(Math.max(currentScale * zoomFactor, 0.3), 2.5);
      applyCanvasTransform(false);
    } else {
      // 2-finger pan
      panX -= e.deltaX;
      panY -= e.deltaY;
      applyCanvasTransform(false);
    }
  }, { passive: false });

  // Double-click to re-center
  window.addEventListener('dblclick', (e) => {
    if (currentActiveTab !== 'view-canvas' || e.target.closest('.network-card, .bottom-dock-bar, .canvas-controls, .top-nav-switcher, #connection-dialog, button, input, textarea')) {
      return;
    }
    panX = 0;
    panY = 0;
    isFitMode = true;
    updateCanvasScale(true);
    showToast('Canvas view re-centered');
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

      // Check collision/proximity with nearest other card
      let closestCard = null;
      let minDistance = 340;

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

        if (dist < minDistance) {
          minDistance = dist;
          closestCard = other;
        }
      });

      if (closestCard) {
        potentialTargetCard = closestCard;
        closestCard.classList.add('is-target');
      } else {
        potentialTargetCard = null;
      }
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
    const dialogX = (srcLeft + tgtLeft) / 2 + 30;
    const dialogY = (srcTop + tgtTop) / 2 - 40;

    dialog.style.left = `${dialogX}px`;
    dialog.style.top = `${dialogY}px`;
    dialog.style.display = 'block';

    if (dialogReasonInput) {
      dialogReasonInput.value = '';
      dialogReasonInput.removeAttribute('placeholder');
      setTimeout(() => {
        dialogReasonInput.focus();
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

    const customReason = dialogReasonInput ? dialogReasonInput.value.trim() : '';

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
    path.setAttribute('stroke', '#0F172A');
    path.setAttribute('stroke-width', '2');
    path.setAttribute('fill', 'none');
    path.setAttribute('filter', 'url(#arc-shadow)');
    path.style.transition = 'stroke-dashoffset 0.8s ease';

    dynamicSvgGroup.appendChild(path);

    // Create anchor dots on both ends
    createAnchorDot(x1, y1);
    createAnchorDot(x2, y2);

    // Add connection badge with the typed reason (or commuter pair name if left empty)
    const midX = (x1 + x2) / 2;
    const midY = (y1 + y2) / 2;
    const badge = document.createElement('div');
    badge.className = 'dynamic-badge';
    badge.style.left = `${Math.max(20, midX - 90)}px`;
    badge.style.top = `${Math.max(20, midY - 17)}px`;
    if (reasonText) {
      badge.innerHTML = `<span class="badge-prefix">✦</span> ${escapeHtml(reasonText)}`;
    } else {
      const a1 = c1.dataset.author || 'Commuter';
      const a2 = c2.dataset.author || 'Commuter';
      badge.innerHTML = `<span class="badge-prefix">✦</span> Connected: ${escapeHtml(a1)} &amp; ${escapeHtml(a2)}`;
    }
    canvas.appendChild(badge);
  }

  function createAnchorDot(x, y) {
    const dot = document.createElement('div');
    dot.className = 'dynamic-dot';
    dot.style.left = `${x}px`;
    dot.style.top = `${y}px`;
    canvas.appendChild(dot);
  }

  // ============================================================
  // Commuter Share Mode Screen (Paper Artboards: OH-0 -> NX-0 -> K5-0)
  // ============================================================
  const viewCanvas = document.getElementById('view-canvas');
  const viewShare = document.getElementById('view-share');
  const canvasControls = document.getElementById('canvas-controls');
  const btnShareHeaderBack = document.getElementById('btn-share-header-back');

  const shareStepJ6 = document.getElementById('share-step-j6');
  const shareStepNX = document.getElementById('share-step-nx');
  const shareStepK5 = document.getElementById('share-step-k5');

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

  function switchMode(targetMode, showToastMsg = false) {
    currentActiveTab = targetMode;

    const tabBtns = document.querySelectorAll('.nav-tab-btn');
    const tabPanels = document.querySelectorAll('.tab-panel');

    tabBtns.forEach(b => {
      const isTarget = b.dataset.tab === targetMode;
      b.classList.toggle('active', isTarget);
      b.setAttribute('aria-selected', isTarget ? 'true' : 'false');
    });

    tabPanels.forEach(p => {
      p.classList.toggle('active', p.id === targetMode);
    });

    const dragHint = document.getElementById('drag-hint');

    if (targetMode === 'view-canvas') {
      if (btnConnect) btnConnect.classList.add('active');
      if (btnShare) btnShare.classList.remove('active');
      if (canvasControls) canvasControls.style.display = 'flex';
      if (dragHint) dragHint.style.display = 'block';
      updateCanvasScale(true);
      if (showToastMsg) showToast('Network Canvas mode');
    } else if (targetMode === 'view-share') {
      if (btnShare) btnShare.classList.add('active');
      if (btnConnect) btnConnect.classList.remove('active');
      if (canvasControls) canvasControls.style.display = 'none';
      if (dragHint) dragHint.style.display = 'none';
      if (showToastMsg) showToast('Share Mode (Commuter Contribution)');
      setTimeout(() => {
        if (shareStepJ6 && shareStepJ6.classList.contains('active') && userBioSnippetInput) {
          userBioSnippetInput.focus();
        } else if (shareStepNX && shareStepNX.classList.contains('active') && userDailySnippetInput) {
          userDailySnippetInput.focus();
        }
      }, 100);
    }
  }

  function openShareFlow() {
    switchMode('view-share', true);
    if (shareStepJ6 && !shareStepNX.classList.contains('active') && !shareStepK5.classList.contains('active')) {
      shareStepJ6.classList.add('active');
    }
  }

  function closeShareFlow() {
    switchMode('view-canvas', true);
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
    if (navigator.clipboard && window.location.href) {
      navigator.clipboard.writeText(window.location.href).catch(() => {});
    }
    showToast('Share link copied to clipboard!');
  });

  btnConnect.addEventListener('click', () => {
    if (currentActiveTab === 'view-share') {
      closeShareFlow();
      return;
    }
    const unselected = cards.find(c => !c.classList.contains('is-selected'));
    const selected = cards.find(c => c.classList.contains('is-selected')) || cards[0];
    if (selected && unselected) {
      showConnectionDialog(selected, unselected);
    }
  });

  if (btnShareHeaderBack) {
    btnShareHeaderBack.addEventListener('click', closeShareFlow);
  }

  // Step J6 Actions (Paper J6-0)
  if (btnJ6ViewConnections) btnJ6ViewConnections.addEventListener('click', goToStepNX);
  if (btnJ6Later) {
    btnJ6Later.addEventListener('click', () => {
      closeShareFlow();
      showToast('Bio snippet postponed. Returned to Network Canvas.');
    });
  }

  // Step NX Actions (Paper NX-0)
  if (btnNXBack) btnNXBack.addEventListener('click', goToStepJ6);
  if (btnNXShare) btnNXShare.addEventListener('click', submitShareSnippet);

  // Step K5 Actions (Paper K5-0)
  if (btnK5Edit) btnK5Edit.addEventListener('click', goToStepNX);
  if (btnK5Return) {
    btnK5Return.addEventListener('click', () => {
      closeShareFlow();
      showToast('Welcome to the commuter pool! Matchmakers can connect your card now.');
    });
  }

  // ============================================================
  // Top Tab Switcher Handling
  // ============================================================
  const tabButtons = document.querySelectorAll('.nav-tab-btn');
  tabButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      switchMode(btn.dataset.tab, true);
    });
  });

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

