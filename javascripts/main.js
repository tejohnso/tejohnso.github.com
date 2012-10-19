$.ready(function() {
   $('#dropdown a').click(function() {
      $(this).find('ul').toggle('medium');
   });
});
