$(document).ready(function() {
   $('#dropdown span.button').click(function() {
      $(this).parent().find('ul').slideToggle('medium');
   });
});
