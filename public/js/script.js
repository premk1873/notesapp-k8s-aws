// ============================================================
// public/js/script.js
// A few small UX touches. No frameworks, no build step.
// ============================================================

document.addEventListener('DOMContentLoaded', function () {
  // Ask for confirmation before a note is deleted.
  document.querySelectorAll('.js-delete-note-form').forEach(function (form) {
    form.addEventListener('submit', function (event) {
      if (!confirm('Delete this note? This cannot be undone.')) {
        event.preventDefault();
      }
    });
  });

  // Auto-dismiss success/error alerts after a few seconds.
  document.querySelectorAll('.alert-auto-dismiss').forEach(function (alertEl) {
    setTimeout(function () {
      alertEl.classList.add('fade');
      alertEl.classList.remove('show');
    }, 4000);
  });

  // Clear the "New Note" textarea each time the modal is opened.
  var newNoteModal = document.getElementById('newNoteModal');
  if (newNoteModal) {
    newNoteModal.addEventListener('shown.bs.modal', function () {
      var textarea = newNoteModal.querySelector('textarea');
      if (textarea) textarea.focus();
    });
  }
});
