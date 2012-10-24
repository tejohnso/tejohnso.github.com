$(document).ready(function() {
   $('#dropdown span.button > a').click(function() {
      $(this).parent().parent().find('ul').slideToggle('medium');
      return false;
   });
});
