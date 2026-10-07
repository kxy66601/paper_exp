// Interactive behavior for Google Payments Center

document.addEventListener('DOMContentLoaded', () => {
  // Accordion toggle
  const accordionItems = document.querySelectorAll('.accordion-item');
  accordionItems.forEach(item => {
    const header = item.querySelector('.accordion-header');
    header.addEventListener('click', () => {
      const isOpen = item.classList.contains('open');
      // Toggle current item
      item.classList.toggle('open', !isOpen);
    });
  });

  // Open first accordion item by default
  if (accordionItems.length > 0) {
    accordionItems[0].classList.add('open');
  }

  // Filter Search
  const searchInput = document.getElementById('history-search');
  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      const term = e.target.value.toLowerCase().trim();
      accordionItems.forEach(item => {
        const text = item.textContent.toLowerCase();
        if (text.includes(term)) {
          item.style.display = 'block';
        } else {
          item.style.display = 'none';
        }
      });
    });
  }

  // Payment Modal
  const modal = document.getElementById('payment-modal');
  const openBtn = document.getElementById('btn-make-payment');
  const closeBtn = document.getElementById('close-modal');
  const cancelBtn = document.getElementById('cancel-payment');
  const confirmBtn = document.getElementById('confirm-payment');

  function openModal() {
    if (modal) modal.classList.add('active');
  }

  function closeModal() {
    if (modal) modal.classList.remove('active');
  }

  if (openBtn) openBtn.addEventListener('click', openModal);
  if (closeBtn) closeBtn.addEventListener('click', closeModal);
  if (cancelBtn) cancelBtn.addEventListener('click', closeModal);

  if (confirmBtn) {
    confirmBtn.addEventListener('click', () => {
      const amount = document.getElementById('pay-amount').value;
      alert(`Payment of $${amount} submitted successfully!`);
      closeModal();
    });
  }

  // Navigation tab click active state
  const tabs = document.querySelectorAll('.nav-tab');
  tabs.forEach(tab => {
    tab.addEventListener('click', (e) => {
      e.preventDefault();
      tabs.forEach(t => {
        t.classList.remove('active');
        const ind = t.querySelector('.tab-indicator');
        if (ind) ind.remove();
      });
      tab.classList.add('active');
      const indicator = document.createElement('span');
      indicator.className = 'tab-indicator';
      tab.appendChild(indicator);
    });
  });
});
